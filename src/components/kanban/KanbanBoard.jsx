import { memo } from 'react'
import { DndContext, DragOverlay, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import KanbanColumn from './KanbanColumn'
import KanbanCard from './KanbanCard'

const STATUSES = ['PENDENTE', 'EM_ANDAMENTO', 'AGUARDANDO_APROVACAO', 'APROVADO', 'REPROVADO']

const KanbanBoard = memo(function KanbanBoard({ lancamentos, onStatusChange, onCardClick, activeId }) {
  const byStatus = {}
  STATUSES.forEach(s => { byStatus[s] = [] })
  lancamentos.forEach(l => {
    if (byStatus[l.status]) byStatus[l.status].push(l)
  })

  const activeLancamento = activeId ? lancamentos.find(l => l.id === activeId) : null

  return (
    <div className="flex gap-3 overflow-x-auto pb-4 min-h-[500px]">
      {STATUSES.map(status => (
        <KanbanColumn
          key={status}
          status={status}
          cards={byStatus[status]}
          onCardClick={onCardClick}
        />
      ))}

      <DragOverlay>
        {activeLancamento && (
          <div className="rotate-2 scale-105">
            <KanbanCard lancamento={activeLancamento} onClick={() => {}} />
          </div>
        )}
      </DragOverlay>
    </div>
  )
})

export default KanbanBoard
