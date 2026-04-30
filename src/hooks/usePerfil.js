import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useRealtimeSync } from './useRealtimeSync'

export function usePerfil(session) {
  const [papel, setPapel] = useState(() => session?.user?.user_metadata?.papel ?? 'Usuário')
  const [setorIds, setSetorIds] = useState([])
  const [metasPermitidas, setMetasPermitidas] = useState(null)
  const [loading, setLoading] = useState(true)

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

  useRealtimeSync({ papeis: fetch, metas_lm: fetch })

  const isTI = papel === 'T.I'
  const isAC = papel === 'A.C'
  const isRA = papel === 'R.A'
  const isRM = papel === 'R.M'
  const isLM = papel === 'L.M'

  // ── Hierarquia: T.I > A.C > R.A > R.M > L.M > Usuário ─────────────────────
  const HIERARQUIA = ['Usuário', 'L.M', 'R.M', 'R.A', 'A.C', 'T.I']
  
  const nivelCargo = (cargo) => {
    const idx = HIERARQUIA.indexOf(cargo)
    return idx === -1 ? 0 : idx
  }

  const meuNivel = nivelCargo(papel)

  // T.I é o cargo master: tem acesso irrestrito a tudo no sistema
  const isMaster = isTI
  
  // Permissões baseadas em cargo ou nível
  const podeVerERP      = isMaster || meuNivel >= nivelCargo('R.M')
  const podeCriarMeta   = isMaster || isAC
  const podeExcluirMeta = isMaster || isAC
  const podeEditarMeta  = isMaster || meuNivel >= nivelCargo('R.M')
  const podeAtribuir    = isMaster || meuNivel >= nivelCargo('R.M')
  const podeVerUsuarios = isMaster || isAC

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
    isMaster,
    meuNivel,
    nivelCargo,
    podeVerERP,
    podeCriarMeta,
    podeExcluirMeta,
    podeEditarMeta,
    podeAtribuir,
    podeVerUsuarios,
  }
}
