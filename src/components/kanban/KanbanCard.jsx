import { useDraggable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'

const STATUS_LABELS = {
  PENDENTE: 'Pendente',
  EM_ANDAMENTO: 'Em andamento',
  AGUARDANDO_APROVACAO: 'Aguard. aprovação',
  APROVADO: 'Aprovado',
  REPROVADO: 'Reprovado',
}

export default function KanbanCard({ lancamento, onClick }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: lancamento.id,
    data: { lancamento },
  })

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.4 : 1,
    zIndex: isDragging ? 50 : 'auto',
  }

  const meta = lancamento.metas
  const setor = meta?.setores?.nome ?? '—'

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
      {/* Meta name */}
      <p className="text-sm font-medium text-slate-200 leading-tight mb-1.5 group-hover:text-white transition-colors">
        {meta?.nome ?? `Meta #${lancamento.meta_id}`}
      </p>

      {/* Setor */}
      <p className="text-[10px] text-slate-500 mb-2 font-mono truncate">{setor}</p>

      {/* Value + month */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-mono font-medium text-brand-200">
          {lancamento.valor != null ? lancamento.valor : <span className="text-slate-600 italic">sem valor</span>}
        </span>
        <span className="text-[10px] text-slate-500 font-mono">{lancamento.mes_referencia}</span>
      </div>

      {/* Bottom line accent */}
      <div className={`mt-2.5 h-0.5 rounded-full opacity-60 ${statusAccent(lancamento.status)}`} />
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
