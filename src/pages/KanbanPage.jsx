import { useState, useCallback } from 'react'
import { DndContext, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import { useLancamentos } from '../hooks/useLancamentos'
import { useSetores } from '../hooks/useSetores'
import { useMetas } from '../hooks/useMetas'
import KanbanBoard from '../components/kanban/KanbanBoard'
import CardModal from '../components/kanban/CardModal'
import Modal from '../components/shared/Modal'

const MESES = ['2025-01','2025-02','2025-03','2025-04','2025-05','2025-06',
               '2025-07','2025-08','2025-09','2025-10','2025-11','2025-12']
const MES_LABELS = {
  '2025-01':'Jan/25','2025-02':'Fev/25','2025-03':'Mar/25','2025-04':'Abr/25',
  '2025-05':'Mai/25','2025-06':'Jun/25','2025-07':'Jul/25','2025-08':'Ago/25',
  '2025-09':'Set/25','2025-10':'Out/25','2025-11':'Nov/25','2025-12':'Dez/25',
}

export default function KanbanPage({ session }) {
  const [filtroSetor, setFiltroSetor] = useState('')
  const [filtroMes, setFiltroMes] = useState('')
  const [activeId, setActiveId] = useState(null)
  const [cardModal, setCardModal] = useState(null)
  const [novoModal, setNovoModal] = useState(false)
  const [novoForm, setNovoForm] = useState({ meta_id: '', mes_referencia: '', valor: '' })
  // Setor selecionado dentro do modal de novo lançamento (para filtrar metas)
  const [setorMeta, setSetorMeta] = useState('')

  const { lancamentos, loading, erro, atualizarStatus, salvar, criar } = useLancamentos({
    setor_id: filtroSetor || undefined,
    mes: filtroMes || undefined,
  })
  const { setores } = useSetores()
  // Metas filtradas pelo setor escolhido no modal
  const { metas, loading: loadingMetas } = useMetas(setorMeta || null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  )

  const handleDragStart = useCallback(({ active }) => {
    setActiveId(active.id)
  }, [])

  const handleDragEnd = useCallback(async ({ active, over }) => {
    setActiveId(null)
    if (!over) return
    const novoStatus = over.id
    const l = lancamentos.find(x => x.id === active.id)
    if (!l || l.status === novoStatus) return
    try {
      await atualizarStatus(active.id, novoStatus)
    } catch (e) {
      console.error(e)
    }
  }, [lancamentos, atualizarStatus])

  async function handleSaveCard(id, payload) {
    await salvar(id, payload)
  }

  async function handleCriar(e) {
    e.preventDefault()
    try {
      await criar({
        ...novoForm,
        status: 'PENDENTE',
        criado_por: session.user.email,
        data_criacao: new Date().toISOString(),
      })
      setNovoModal(false)
      setNovoForm({ meta_id: '', mes_referencia: '', valor: '' })
      setSetorMeta('')
    } catch (err) {
      alert(err.message)
    }
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-6 py-4 border-b border-white/8 flex items-center justify-between flex-shrink-0">
        <div>
          <h1 className="text-base font-semibold text-white">Kanban de Lançamentos</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {lancamentos.length} lançamento{lancamentos.length !== 1 ? 's' : ''}
            {' · '}
            <span className="text-green-400">● Realtime ativo</span>
          </p>
        </div>
        <button onClick={() => setNovoModal(true)} className="btn-primary">
          + Novo lançamento
        </button>
      </div>

      {/* Filters */}
      <div className="px-6 py-3 border-b border-white/5 flex items-center gap-3 flex-shrink-0 flex-wrap">
        <span className="text-xs text-slate-500 uppercase tracking-wider">Filtros</span>

        <select
          className="input w-auto text-xs py-1.5 px-2"
          value={filtroSetor}
          onChange={e => setFiltroSetor(e.target.value)}
        >
          <option value="">Todos os setores</option>
          {setores.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}
        </select>

        <select
          className="input w-auto text-xs py-1.5 px-2"
          value={filtroMes}
          onChange={e => setFiltroMes(e.target.value)}
        >
          <option value="">Todos os meses</option>
          {MESES.map(m => <option key={m} value={m}>{MES_LABELS[m]}</option>)}
        </select>

        {(filtroSetor || filtroMes) && (
          <button
            className="btn text-xs py-1.5 text-slate-400"
            onClick={() => { setFiltroSetor(''); setFiltroMes('') }}
          >
            Limpar
          </button>
        )}
      </div>

      {/* Board */}
      <div className="flex-1 overflow-auto p-4">
        {loading && (
          <div className="flex items-center justify-center h-40 gap-2 text-slate-500">
            <div className="w-4 h-4 border border-brand-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-sm">Carregando...</span>
          </div>
        )}
        {erro && (
          <div className="bg-red-500/10 border border-red-500/20 rounded p-4 text-red-400 text-sm">
            Erro: {erro}
          </div>
        )}
        {!loading && !erro && (
          <DndContext
            sensors={sensors}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <KanbanBoard
              lancamentos={lancamentos}
              onStatusChange={atualizarStatus}
              onCardClick={setCardModal}
              activeId={activeId}
            />
          </DndContext>
        )}
      </div>

      {/* Card detail modal */}
      {cardModal && (
        <CardModal
          lancamento={cardModal}
          onClose={() => setCardModal(null)}
          onSave={handleSaveCard}
        />
      )}

      {/* Novo lançamento modal */}
      {novoModal && (
        <Modal title="Novo Lançamento" onClose={() => setNovoModal(false)}>
          <form onSubmit={handleCriar} className="flex flex-col gap-4">
            {/* 1. Filtro de setor para restringir a lista de metas */}
            <div>
              <label className="label">Setor</label>
              <select
                className="input"
                value={setorMeta}
                onChange={e => {
                  setSetorMeta(e.target.value)
                  setNovoForm(f => ({ ...f, meta_id: '' })) // limpa meta ao trocar setor
                }}
              >
                <option value="">Todos os setores</option>
                {setores.map(s => (
                  <option key={s.id} value={s.id}>{s.nome}</option>
                ))}
              </select>
            </div>

            {/* 2. Select de meta filtrado pelo setor */}
            <div>
              <label className="label">Meta</label>
              <select
                className="input"
                value={novoForm.meta_id}
                onChange={e => setNovoForm(f => ({ ...f, meta_id: e.target.value }))}
                required
                disabled={loadingMetas}
              >
                <option value="">
                  {loadingMetas ? 'Carregando metas…' : 'Selecione uma meta'}
                </option>
                {metas.map(m => (
                  <option key={m.id} value={m.id}>
                    {m.nome}{m.unidade ? ` (${m.unidade})` : ''}
                  </option>
                ))}
              </select>
              {!loadingMetas && metas.length === 0 && setorMeta && (
                <p className="text-xs text-amber-500 mt-1">Nenhuma meta encontrada para este setor.</p>
              )}
            </div>
            <div>
              <label className="label">Mês de referência</label>
              <select
                className="input"
                value={novoForm.mes_referencia}
                onChange={e => setNovoForm(f => ({ ...f, mes_referencia: e.target.value }))}
                required
              >
                <option value="">Selecione...</option>
                {MESES.map(m => <option key={m} value={m}>{MES_LABELS[m]}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Valor inicial (opcional)</label>
              <input
                className="input"
                placeholder="Ex: 12400"
                value={novoForm.valor}
                onChange={e => setNovoForm(f => ({ ...f, valor: e.target.value }))}
              />
            </div>
            <div className="flex gap-2 justify-end pt-1">
              <button type="button" onClick={() => setNovoModal(false)} className="btn">Cancelar</button>
              <button type="submit" className="btn-primary">Criar</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}
