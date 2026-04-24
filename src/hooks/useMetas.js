import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

export function useMetas(setor_id = null, setor_ids = null, meta_ids = null) {
  const [metas, setMetas] = useState([])
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState(null)

  const fetch = useCallback(async () => {
    setLoading(true)
    let query = supabase
      .from('metas')
      .select('id, nome, peso, unidade, setor_id, setores ( nome )')
      .order('nome')

    if (setor_ids && setor_ids.length > 0) {
      query = query.in('setor_id', setor_ids)
    } else if (setor_id) {
      query = query.eq('setor_id', setor_id)
    }

    if (meta_ids && meta_ids.length > 0) {
      query = query.in('id', meta_ids)
    }

    const { data, error } = await query
    if (error) setErro(error.message)
    else { setMetas(data ?? []); setErro(null) }
    setLoading(false)
  }, [setor_id, JSON.stringify(setor_ids), JSON.stringify(meta_ids)])

  useEffect(() => { fetch() }, [fetch])

  return { metas, loading, erro, refetch: fetch }
}
