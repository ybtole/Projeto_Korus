import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

export function useResponsabilidades() {
  const [responsabilidades, setResponsabilidades] = useState([])
  const [usuarios, setUsuarios] = useState([])
  const [setores, setSetores] = useState([])
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState(null)

  const [metasLm, setMetasLm] = useState([])
  const [metas, setMetas] = useState([])

  const fetchResponsabilidades = useCallback(async () => {
    setLoading(true)
    const [resPapeis, resMetasLm] = await Promise.all([
      supabase.from('papeis').select('id, papel, user_id, usuarios(id, nome, email), setores(id, nome)'),
      supabase.from('metas_lm').select('id, perfil_id, meta_id, metas(id, nome, setor_id)')
    ])
    if (resPapeis.error) setErro(resPapeis.error.message)
    else setResponsabilidades(resPapeis.data ?? [])
    
    if (!resMetasLm.error) setMetasLm(resMetasLm.data ?? [])
    setLoading(false)
  }, [])

  const fetchMetas = useCallback(async () => {
    const { data, error } = await supabase.from('metas').select('id, nome, setor_id').order('nome')
    if (!error) setMetas(data ?? [])
  }, [])

  const fetchUsuarios = useCallback(async () => {
    const { data, error } = await supabase.from('usuarios').select('id, nome, email').order('nome')
    if (!error) setUsuarios(data ?? [])
  }, [])

  const fetchSetores = useCallback(async () => {
    const { data, error } = await supabase.from('setores').select('id, nome').order('nome')
    if (!error) setSetores(data ?? [])
  }, [])

  useEffect(() => {
    fetchResponsabilidades()
    fetchUsuarios()
    fetchSetores()
    fetchMetas()
  }, [fetchResponsabilidades, fetchUsuarios, fetchSetores, fetchMetas])

  const adicionar = async ({ user_id, setor_id, papel, meta_id }) => {
    if (papel === 'L.M') {
      const { error } = await supabase.from('metas_lm').insert({ perfil_id: user_id, meta_id })
      if (error) throw error
    } else {
      const { error } = await supabase.from('papeis').insert({ user_id, setor_id, papel })
      if (error) throw error
    }
    await fetchResponsabilidades()
  }

  const remover = async (id, isLm) => {
    if (isLm) {
      const { error } = await supabase.from('metas_lm').delete().eq('id', id)
      if (error) throw error
    } else {
      const { error } = await supabase.from('papeis').delete().eq('id', id)
      if (error) throw error
    }
    await fetchResponsabilidades()
  }

  return {
    responsabilidades,
    metasLm,
    usuarios,
    setores,
    metas,
    loading,
    erro,
    adicionar,
    remover,
    refetch: fetchResponsabilidades,
  }
}
