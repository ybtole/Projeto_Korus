import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'

/**
 * useRealtimeSync
 *
 * Uma única conexão WebSocket multiplexada para ouvir N tabelas.
 * O Supabase Realtime reutiliza a mesma conexão — não há custo
 * extra por tabela adicional. Cada evento dispara só o callback
 * correspondente, sem refetches desnecessários.
 *
 * @param {Record<string, () => void>} callbacks
 *   Objeto cujas chaves são nomes de tabelas e valores são funções
 *   de refetch. Ex: { metas: fetchMetas, lancamentos: fetchLancamentos }
 *
 * Exemplo de uso completo:
 *
 *   function MinhaPage() {
 *     const [metas, setMetas] = useState([])
 *     const fetchMetas = useCallback(async () => {
 *       const { data } = await supabase.from('metas').select('*')
 *       setMetas(data ?? [])
 *     }, [])
 *     useEffect(() => { fetchMetas() }, [fetchMetas])
 *     useRealtimeSync({ metas: fetchMetas })
 *     return <div>...</div>
 *   }
 */
export function useRealtimeSync(callbacks = {}) {
  const cbRef = useRef(callbacks)
  useEffect(() => { cbRef.current = callbacks })

  useEffect(() => {
    const tables = Object.keys(callbacks)
    if (tables.length === 0) return

    const channelName = `sync-${tables.sort().join('-')}`
    const channel = supabase.channel(channelName)

    tables.forEach(table => {
      channel.on(
        'postgres_changes',
        { event: '*', schema: 'public', table },
        () => cbRef.current[table]?.()
      )
    })

    channel.subscribe((status) => {
      if (status === 'CHANNEL_ERROR') {
        console.warn('[Realtime] Erro no canal:', channelName)
      }
    })

    return () => { supabase.removeChannel(channel) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
}

/**
 * useRealtimeTable
 *
 * Versão simplificada para uma única tabela.
 * Retorna um contador de "revisão" — use como dependência de
 * useEffect para disparar refetch automático.
 *
 * @param {string} table  Nome da tabela no Supabase
 * @returns {number}      Incrementa a cada INSERT/UPDATE/DELETE
 *
 * Exemplo:
 *   const rev = useRealtimeTable('setores')
 *   useEffect(() => { fetchSetores() }, [rev])
 */
export function useRealtimeTable(table) {
  const [rev, setRev] = useState(0)

  useEffect(() => {
    if (!table) return
    const channel = supabase
      .channel(`rt-${table}-${Date.now()}`)
      .on('postgres_changes', { event: '*', schema: 'public', table }, () => {
        setRev(v => v + 1)
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [table])

  return rev
}

/**
 * useConnectionStatus
 *
 * Monitora o estado da conexão Realtime.
 * Retorna: 'connected' | 'connecting' | 'disconnected'
 *
 * Exemplo:
 *   const status = useConnectionStatus()
 *   // 'connected' → '● Realtime ativo'
 *   // 'disconnected' → '○ Reconectando...'
 */
export function useConnectionStatus() {
  const [status, setStatus] = useState('connecting')

  useEffect(() => {
    const probe = supabase
      .channel('connection-probe')
      .subscribe((s) => {
        if (s === 'SUBSCRIBED')    setStatus('connected')
        if (s === 'CHANNEL_ERROR') setStatus('disconnected')
        if (s === 'CLOSED')        setStatus('disconnected')
        if (s === 'TIMED_OUT')     setStatus('disconnected')
      })

    const goOffline = () => setStatus('disconnected')
    const goOnline  = () => setStatus('connecting')
    window.addEventListener('offline', goOffline)
    window.addEventListener('online',  goOnline)

    return () => {
      supabase.removeChannel(probe)
      window.removeEventListener('offline', goOffline)
      window.removeEventListener('online',  goOnline)
    }
  }, [])

  return status
}