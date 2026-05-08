import { useDraggable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'

export default function KanbanCard({ lancamento, onClick, canDrag = false, perfilCtx, onIniciar }) {
  const { isLM = false, isMaster = false, metasPermitidas = null, userEmail = '' } = perfilCtx ?? {}

  const eResponsavelPelaMeta = isMaster || (isLM && metasPermitidas?.includes(lancamento.meta_id))
  const eResponsavelPorCriacao = lancamento.criado_por === userEmail

  const mostraIniciar = lancamento.status === 'PENDENTE' && (eResponsavelPelaMeta || eResponsavelPorCriacao)
  const mostraEvoluir = lancamento.status === 'EM_ANDAMENTO' && eResponsavelPelaMeta

  const dragDisabled = !canDrag || lancamento.status === 'EM_ANDAMENTO'

  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: lancamento.id,
    data: { lancamento },
    disabled: dragDisabled,
  })

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.4 : 1,
    zIndex: isDragging ? 50 : 'auto',
  }

  const meta = lancamento.metas
  const setor = meta?.setores?.nome ?? '—'

  function handleIniciar(e) {
    e.stopPropagation()
    onIniciar?.(lancamento.id)
  }

  function handleEvoluir(e) {
    e.stopPropagation()
    onClick?.()
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      onClick={onClick}
      className={`
        card px-3 py-3 cursor-pointer select-none
        hover:border-white/20 hover:bg-white/5
        transition-all duration-150 group
        ${isDragging ? 'rotate-1 scale-105 shadow-xl' : ''}
      `}
    >
      <p className="text-sm font-medium text-slate-200 leading-tight mb-1.5 group-hover:text-white transition-colors">
        {meta?.nome ?? `Meta #${lancamento.meta_id}`}
      </p>

      <p className="text-[10px] text-slate-500 mb-2 font-mono truncate">{setor}</p>

      <div className="flex items-center justify-between">
        <span className="text-xs font-mono font-medium text-brand-200">
          {lancamento.valor != null ? lancamento.valor : <span className="text-slate-600 italic">sem valor</span>}
        </span>
        <span className="text-[10px] text-slate-500 font-mono">{lancamento.mes_referencia}</span>
      </div>

      <div className={`mt-2.5 h-0.5 rounded-full opacity-60 ${statusAccent(lancamento.status)}`} />

      {mostraIniciar && (
        <button
          onPointerDown={e => e.stopPropagation()}
          onClick={handleIniciar}
          className="mt-2 w-full text-[10px] font-semibold py-1 rounded bg-blue-600/20 text-blue-400 hover:bg-blue-600/40 transition-colors"
        >
          Iniciar
        </button>
      )}

      {mostraEvoluir && (
        <button
          onPointerDown={e => e.stopPropagation()}
          onClick={handleEvoluir}
          className="mt-2 w-full text-[10px] font-semibold py-1 rounded bg-amber-600/20 text-amber-400 hover:bg-amber-600/40 transition-colors"
        >
          Evoluir
        </button>
      )}
    </div>
  )
}

function statusAccent(status) {
  return {
    PENDENTE: 'bg-slate-500',
    EM_ANDAMENTO: 'bg-blue-500',
    AGUARDANDO_APROVACAO: 'bg-amber-500',
    APROVADO: 'bg-green-500',
    REPROVADO: 'bg-red-500',
  }[status] ?? 'bg-slate-600'
}
