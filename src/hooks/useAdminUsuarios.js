import { useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'

const FUNCTION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-usuarios`

async function chamarAdmin(body) {
  const { data: { session } } = await supabase.auth.getSession()
  const token = session?.access_token
  if (!token) throw new Error('Sessão expirada. Faça login novamente.')

  const res = await fetch(FUNCTION_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  })

  const json = await res.json()
  if (!res.ok || json.error) throw new Error(json.error ?? 'Erro desconhecido')
  return json
}

export function useAdminUsuarios() {
  const [usuarios, setUsuarios] = useState([])
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState(null)

  const listar = useCallback(async () => {
    setLoading(true)
    setErro(null)
    try {
      const { usuarios } = await chamarAdmin({ acao: 'listar' })
      setUsuarios(usuarios ?? [])
    } catch (e) {
      setErro(e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  const criar = async ({ cpf, papel, nome }) => {
    const json = await chamarAdmin({ acao: 'criar', cpf, papel, nome })
    await listar()
    return json
  }

  const remover = async (user_id) => {
    await chamarAdmin({ acao: 'remover', user_id })
    setUsuarios(prev => prev.filter(u => u.id !== user_id))
  }

  return { usuarios, loading, erro, listar, criar, remover }
}
