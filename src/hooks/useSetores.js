import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useRealtimeSync } from './useRealtimeSync'

export function useSetores() {
  const [setores, setSetores] = useState([])
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState(null)

  const fetch = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('setores')
      .select('*')
      .order('nome')
    if (error) setErro(error.message)
    else { setSetores(data ?? []); setErro(null) }
    setLoading(false)
  }, [])

  useEffect(() => { fetch() }, [fetch])

  // Sincronização realtime — canal compartilhado, sem WebSocket extra
  useRealtimeSync({ setores: fetch })

  const criar = async ({ nome, tipo, parent_id }) => {
    const { error } = await supabase.from('setores').insert({ nome, tipo, parent_id: parent_id ?? null })
    if (error) throw error
  }

  const editar = async (id, { nome, tipo }) => {
    const { error } = await supabase.from('setores').update({ nome, tipo }).eq('id', id)
    if (error) throw error
  }

  const excluir = async (id) => {
    const temFilhos = setores.some(s => s.parent_id === id)
    if (temFilhos) throw new Error('Este setor possui subsetores e não pode ser excluído.')
    const { error } = await supabase.from('setores').delete().eq('id', id)
    if (error) throw error
  }

  return { setores, loading, erro, criar, editar, excluir, refetch: fetch }
}