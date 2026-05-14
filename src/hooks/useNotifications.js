import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useRealtimeSync } from './useRealtimeSync'

export function useNotifications(session) {
  const [notificacoes, setNotificacoes] = useState([])
  const userId = session?.user?.id

  const fetchNotificacoes = useCallback(async () => {
    if (!userId) return
    const { data } = await supabase
      .from('notificacoes')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
    setNotificacoes(data ?? [])
  }, [userId])

  useEffect(() => {
    fetchNotificacoes()
  }, [fetchNotificacoes])

  useRealtimeSync({ notificacoes: fetchNotificacoes })

  const marcarComoLida = useCallback(async (id) => {
    setNotificacoes(prev => prev.map(n => n.id === id ? { ...n, lida: true } : n))
    await supabase
      .from('notificacoes')
      .update({ lida: true })
      .eq('id', id)
      .eq('user_id', userId)
  }, [userId])

  const marcarTodasComoLidas = useCallback(async () => {
    setNotificacoes(prev => prev.map(n => ({ ...n, lida: true })))
    await supabase
      .from('notificacoes')
      .update({ lida: true })
      .eq('user_id', userId)
      .eq('lida', false)
  }, [userId])

  const unreadCount = notificacoes.filter(n => !n.lida).length

  return { notificacoes, unreadCount, marcarComoLida, marcarTodasComoLidas }
}
