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
    if (filtros.ano && !filtros.mes) query = query.like('mes_referencia', `${filtros.ano}-%`)

    const { data, error } = await query
    if (error) setErro(error.message)
    else { setLancamentos(data ?? []); setErro(null) }
    setLoading(false)
  }, [filtros.setor_id, filtros.mes, filtros.ano])

  useEffect(() => { fetch() }, [fetch])

  useRealtimeSync({ lancamentos: fetch, metas: fetch })

  const atualizarStatus = async (id, status) => {
    const { error } = await supabase
      .from('lancamentos')
      .update({ status })
      .eq('id', id)
    if (error) throw error
    setLancamentos(prev => prev.map(l => l.id === id ? { ...l, status } : l))

    if (status === 'REPROVADO') {
      const lancamento = lancamentos.find(l => l.id === id)
      if (lancamento?.criado_por) {
        const [{ data: usuario }, { data: ciclo }] = await Promise.all([
          supabase.from('usuarios').select('id').eq('email', lancamento.criado_por).maybeSingle(),
          supabase.from('ciclos_ppr').select('data_fim').eq('ativo', true).maybeSingle(),
        ])

        const prazo7dias = new Date()
        prazo7dias.setDate(prazo7dias.getDate() + 7)

        const prazoFinal = ciclo?.data_fim
          ? new Date(Math.min(prazo7dias.getTime(), new Date(ciclo.data_fim).getTime()))
          : prazo7dias

        if (usuario?.id) {
          await supabase.from('notificacoes').insert({
            user_id: usuario.id,
            tipo: 'REPROVACAO',
            titulo: 'Lançamento reprovado',
            mensagem: `Meta reprovada. Envie nova justificativa até ${prazoFinal.toLocaleDateString('pt-BR')}.`,
            lancamento_id: id,
            meta_id: lancamento.meta_id,
            lida: false,
          })
        }
      }
    }
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