import { useDroppable } from '@dnd-kit/core'
import KanbanCard from './KanbanCard'

const COL_CONFIG = {
  PENDENTE:               { label: 'Pendente',           color: 'text-slate-400',  border: 'border-slate-600',  dot: 'bg-slate-400' },
  EM_ANDAMENTO:           { label: 'Em andamento',        color: 'text-blue-400',   border: 'border-blue-700',   dot: 'bg-blue-400' },
  AGUARDANDO_APROVACAO:   { label: 'Aguard. aprovação',   color: 'text-amber-400',  border: 'border-amber-700',  dot: 'bg-amber-400' },
  APROVADO:               { label: 'Aprovado',            color: 'text-green-400',  border: 'border-green-700',  dot: 'bg-green-400' },
  REPROVADO:              { label: 'Reprovado',           color: 'text-red-400',    border: 'border-red-800',    dot: 'bg-red-400' },
}

export default function KanbanColumn({ status, cards, onCardClick, canDrag, perfilCtx, onIniciar }) {
  const { setNodeRef, isOver } = useDroppable({ id: status })
  const cfg = COL_CONFIG[status]

  return (
    <div className="flex flex-col min-w-[220px] w-[220px] flex-shrink-0">
      <div className={`flex items-center gap-2 px-3 py-2.5 rounded-t-lg border-t-2 ${cfg.border} bg-brand-900/40 border-x border-white/8 mb-0`}>
        <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
        <span className={`text-xs font-semibold uppercase tracking-wider ${cfg.color}`}>
          {cfg.label}
        </span>
        <span className="ml-auto text-xs text-slate-600 font-mono">{cards.length}</span>
      </div>

      <div
        ref={setNodeRef}
        className={`
          flex-1 flex flex-col gap-2 p-2 rounded-b-lg border border-t-0 border-white/8 min-h-[400px]
          transition-colors duration-150
          ${isOver ? 'bg-brand-500/8 border-brand-500/30' : 'bg-brand-900/20'}
        `}
      >
        {cards.length === 0 && (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-xs text-slate-700 select-none">Arraste aqui</p>
          </div>
        )}
        {cards.map(l => (
          <KanbanCard
            key={l.id}
            lancamento={l}
            onClick={() => onCardClick(l)}
            canDrag={canDrag}
            perfilCtx={perfilCtx}
            onIniciar={onIniciar}
          />
        ))}
      </div>
    </div>
  )
}
