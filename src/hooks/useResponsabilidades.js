import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

export function useResponsabilidades() {
  const [responsabilidades, setResponsabilidades] = useState([])
  const [usuarios, setUsuarios] = useState([])
  const [setores, setSetores] = useState([])
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState(null)

  const fetchResponsabilidades = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('papeis')
      .select('id, papel, usuarios(id, nome, email), setores(id, nome)')
    if (error) setErro(error.message)
    else { setResponsabilidades(data ?? []); setErro(null) }
    setLoading(false)
  }, [])

  const fetchUsuarios = useCallback(async () => {
    const { data, error } = await supabase
      .from('usuarios')
      .select('id, nome, email')
      .order('nome')
    if (!error) setUsuarios(data ?? [])
  }, [])

  const fetchSetores = useCallback(async () => {
    const { data, error } = await supabase
      .from('setores')
      .select('id, nome')
      .order('nome')
    if (!error) setSetores(data ?? [])
  }, [])

  useEffect(() => {
    fetchResponsabilidades()
    fetchUsuarios()
    fetchSetores()
  }, [fetchResponsabilidades, fetchUsuarios, fetchSetores])

  const adicionar = async ({ user_id, setor_id, papel }) => {
    const { error } = await supabase.from('papeis').insert({ user_id, setor_id, papel })
    if (error) throw error
    await fetchResponsabilidades()
  }

  const remover = async (id) => {
    const { error } = await supabase.from('papeis').delete().eq('id', id)
    if (error) throw error
    setResponsabilidades(prev => prev.filter(r => r.id !== id))
  }

  return {
    responsabilidades,
    usuarios,
    setores,
    loading,
    erro,
    adicionar,
    remover,
    refetch: fetchResponsabilidades,
  }
}
