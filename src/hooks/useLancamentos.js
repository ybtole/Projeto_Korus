import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useRealtimeSync } from './useRealtimeSync'

export function useLancamentos(filtros = {}) {
  const [lancamentos, setLancamentos] = useState([])
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState(null)

  const fetch = useCallback(async () => {
    let query = supabase
      .from('lancamentos')
      .select(`
        *,
        metas ( nome, peso, direcao, unidade, dia_lancamento, ranges, setor_id,
          setores ( nome )
        )
      `)
      .order('data_criacao', { ascending: false })

    if (filtros.setor_id) query = query.eq('metas.setor_id', filtros.setor_id)
    if (filtros.mes)      query = query.eq('mes_referencia', filtros.mes)

    const { data, error } = await query
    if (error) setErro(error.message)
    else { setLancamentos(data ?? []); setErro(null) }
    setLoading(false)
  }, [filtros.setor_id, filtros.mes])

  useEffect(() => { fetch() }, [fetch])

  // Realtime: ouve lancamentos E metas (mudança de peso/ranges afeta o cálculo)
  useRealtimeSync({ lancamentos: fetch, metas: fetch })

  const atualizarStatus = async (id, status) => {
    const { error } = await supabase
      .from('lancamentos')
      .update({ status })
      .eq('id', id)
    if (error) throw error
    setLancamentos(prev => prev.map(l => l.id === id ? { ...l, status } : l))
  }

  const salvar = async (id, payload) => {
    const { error } = await supabase.from('lancamentos').update(payload).eq('id', id)
    if (error) throw error
  }

  const criar = async (payload) => {
    const { error } = await supabase.from('lancamentos').insert(payload)
    if (error) throw error
  }

  return { lancamentos, loading, erro, atualizarStatus, salvar, criar, refetch: fetch }
}