import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useRealtimeSync } from './useRealtimeSync'

export function useMetas(setor_id = null) {
  const [metas, setMetas] = useState([])
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState(null)

  const fetch = useCallback(async () => {
    setLoading(true)
    let query = supabase
      .from('metas')
      .select('id, nome, peso, unidade, setor_id, setores ( nome )')
      .order('nome')

    if (setor_id) query = query.eq('setor_id', setor_id)

    const { data, error } = await query
    if (error) setErro(error.message)
    else { setMetas(data ?? []); setErro(null) }
    setLoading(false)
  }, [setor_id])

  useEffect(() => { fetch() }, [fetch])

  useRealtimeSync({ metas: fetch })

  return { metas, loading, erro, refetch: fetch }
}
