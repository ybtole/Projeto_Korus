import { useState, useEffect } from 'react'
import { CheckCircle, XCircle } from 'lucide-react'
import api from '../services/api'
import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'
import Modal from '../components/ui/Modal'

export default function Aprovacoes() {
  const [pendentes, setPendentes] = useState([])
  const [historico, setHistorico] = useState([])
  const [modalAberto, setModalAberto] = useState(false)
  const [selecionado, setSelecionado] = useState(null)
  const [motivo, setMotivo] = useState('')
  const [salvando, setSalvando] = useState(false)

  useEffect(() => {
    buscarDados()
  }, [])

  async function buscarDados() {
    const [pend, hist] = await Promise.all([
      api.get('/lancamentos', { params: { status: 'PENDENTE' } }),
      api.get('/aprovacoes'),
    ])
    setPendentes(pend.data)
    setHistorico(hist.data)
  }

  function abrirModal(lancamento) {
    setSelecionado(lancamento)
    setMotivo('')
    setModalAberto(true)
  }

  async function avaliar(status) {
    if (status === 'REPROVADO' && !motivo.trim()) {
      alert('Informe o motivo da reprovação.')
      return
    }
    setSalvando(true)
    try {
      await api.post('/aprovacoes', {
        lancamento_id: selecionado.id,
        status,
        motivo_reprovacao: motivo || null,
      })
      setModalAberto(false)
      buscarDados()
    } finally {
      setSalvando(false)
    }
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Aprovações</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Lançamentos aguardando validação do especialista de custo</p>
      </div>

      {/* Pendentes */}
      <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
        Pendentes ({pendentes.length})
      </h2>
      <div className="flex flex-col gap-3 mb-8">
        {pendentes.length === 0 ? (
          <div className="text-center py-8 text-gray-400 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800">
            Nenhum lançamento pendente
          </div>
        ) : pendentes.map(l => (
          <div key={l.id} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4 flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{l.meta_nome}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Mês: {l.mes_referencia} · Valor: {l.valor} · % calculado: {l.percentual_calculado ?? '—'}%
              </p>
              <p className="text-xs text-gray-400 mt-0.5">Lançado por: {l.criado_por_nome}</p>
            </div>
            <Button variante="secundario" tamanho="sm" onClick={() => abrirModal(l)}>
              Avaliar
            </Button>
          </div>
        ))}
      </div>

      {/* Histórico */}
      <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Histórico de avaliações</h2>
      <div className="flex flex-col gap-2">
        {historico.map(a => (
          <div key={a.id} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4 flex items-center gap-4">
            {a.status === 'APROVADO'
              ? <CheckCircle size={16} className="text-green-500 flex-shrink-0" />
              : <XCircle size={16} className="text-red-500 flex-shrink-0" />
            }
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{a.meta_nome}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {a.mes_referencia} · Valor: {a.valor} · {a.percentual_calculado}%
              </p>
              {a.motivo_reprovacao && (
                <p className="text-xs text-red-500 mt-0.5">Motivo: {a.motivo_reprovacao}</p>
              )}
            </div>
            <Badge tipo={a.status} />
          </div>
        ))}
      </div>

      {/* Modal de avaliação */}
      <Modal aberto={modalAberto} onFechar={() => setModalAberto(false)} titulo="Avaliar lançamento">
        {selecionado && (
          <div className="flex flex-col gap-4">
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 text-sm">
              <p><span className="font-medium">Meta:</span> {selecionado.meta_nome}</p>
              <p><span className="font-medium">Mês:</span> {selecionado.mes_referencia}</p>
              <p><span className="font-medium">Valor:</span> {selecionado.valor}</p>
              <p><span className="font-medium">% PPR calculado:</span> {selecionado.percentual_calculado}%</p>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Motivo da reprovação <span className="text-gray-400">(obrigatório ao reprovar)</span>
              </label>
              <textarea
                rows={3}
                value={motivo}
                onChange={e => setMotivo(e.target.value)}
                placeholder="Descreva o motivo caso vá reprovar..."
                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>

            <div className="flex gap-3">
              <Button variante="sucesso" onClick={() => avaliar('APROVADO')} carregando={salvando} className="flex-1">
                <CheckCircle size={16} /> Aprovar
              </Button>
              <Button variante="perigo" onClick={() => avaliar('REPROVADO')} carregando={salvando} className="flex-1">
                <XCircle size={16} /> Reprovar
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}