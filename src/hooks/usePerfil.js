import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

export function usePerfil(session) {
  const [papel, setPapel] = useState('Usuário')
  const [setorIds, setSetorIds] = useState([])
  const [metasPermitidas, setMetasPermitidas] = useState(null)
  const [loading, setLoading] = useState(false)

  const fetch = useCallback(async () => {
    if (!session?.user) return

    setLoading(true)

    const usuarioPapel = session.user.user_metadata?.papel ?? 'Usuário'
    setPapel(usuarioPapel)

    const { data: vinculos, error: erroVinculos } = await supabase
      .from('papeis')
      .select('setor_id, papel')
      .eq('user_id', session.user.id)

    if (erroVinculos || !vinculos?.length) {
      setSetorIds([])
    } else {
      const ids = [...new Set(vinculos.map(v => v.setor_id))]
      setSetorIds(ids)
    }

    if (usuarioPapel === 'L.M') {
      const { data: metas, error: erroMetas } = await supabase
        .from('metas_lm')
        .select('meta_id')
        .eq('perfil_id', session.user.id)
        .eq('ativa', true)

      setMetasPermitidas(erroMetas ? [] : (metas?.map(m => m.meta_id) ?? []))
    } else {
      setMetasPermitidas(null)
    }

    setLoading(false)
  }, [session])

  useEffect(() => {
    if (!session?.user) {
      setPapel('Usuário')
      setSetorIds([])
      setMetasPermitidas(null)
      setLoading(false)
      return
    }
    fetch()
  }, [fetch, session])

  const isAC = papel === 'A.C'
  const isTI = papel === 'T.I'
  const isRA = papel === 'R.A'
  const isRM = papel === 'R.M'
  const isLM = papel === 'L.M'
  const podeVerERP    = isAC || isTI
  const podeCriarMeta = isAC
  const podeAtribuir  = isAC || isRA || isRM

  return {
    papel,
    setorIds,
    metasPermitidas,
    loading,
    isAC,
    isTI,
    isRA,
    isRM,
    isLM,
    podeVerERP,
    podeCriarMeta,
    podeAtribuir,
  }
}
