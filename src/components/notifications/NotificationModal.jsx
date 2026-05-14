import { useState } from 'react'
import Modal from '../shared/Modal'

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function NotificationCard({ notificacao, onRead }) {
  const [expanded, setExpanded] = useState(false)

  function handleClick() {
    setExpanded(e => !e)
    if (!notificacao.lida) onRead(notificacao.id)
  }

  return (
    <div
      onClick={handleClick}
      className={`rounded-lg border px-4 py-3 cursor-pointer transition-all duration-150 ${
        notificacao.lida
          ? 'border-white/8 bg-white/5 opacity-55 hover:opacity-70'
          : 'border-brand-500/30 bg-brand-500/10 hover:bg-brand-500/15'
      }`}
    >
      <div className="flex items-start gap-2.5">
        {!notificacao.lida && (
          <span className="mt-[5px] w-2 h-2 rounded-full bg-blue-400 flex-shrink-0" />
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <p className="text-xs font-semibold text-white leading-snug">{notificacao.titulo}</p>
            <span className="text-[10px] font-mono flex-shrink-0 mt-0.5" style={{ color: 'var(--text-muted)' }}>
              {formatDate(notificacao.created_at)}
            </span>
          </div>
          <p
            className={`text-xs mt-1 leading-relaxed transition-all ${expanded ? '' : 'truncate'}`}
            style={{ color: 'var(--text-secondary)' }}
          >
            {notificacao.mensagem}
          </p>
        </div>
      </div>
    </div>
  )
}

export default function NotificationModal({ onClose, notificacoes, marcarComoLida, marcarTodasComoLidas, unreadCount }) {
  return (
    <Modal title="Notificações" onClose={onClose} size="md">
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-2 overflow-y-auto" style={{ maxHeight: '380px' }}>
          {notificacoes.length === 0 && (
            <div className="flex flex-col items-center justify-center py-10 gap-3">
              <svg viewBox="0 0 24 24" className="w-9 h-9" style={{ color: 'var(--text-muted)' }} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                <path d="M13.73 21a2 2 0 01-3.46 0"/>
              </svg>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Nenhuma notificação</p>
            </div>
          )}
          {notificacoes.map(n => (
            <NotificationCard key={n.id} notificacao={n} onRead={marcarComoLida} />
          ))}
        </div>
        {notificacoes.length > 0 && (
          <div className="pt-2 border-t border-white/8">
            <button
              onClick={marcarTodasComoLidas}
              disabled={unreadCount === 0}
              className="btn-primary w-full justify-center text-xs py-2 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Marcar todas como lidas
            </button>
          </div>
        )}
      </div>
    </Modal>
  )
}
