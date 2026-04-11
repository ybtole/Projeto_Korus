import { useState } from 'react'
import { supabase } from '../lib/supabase'
import OrgTreePage from './OrgTreePage'
import KanbanPage from './KanbanPage'

const NAV = [
  { id: 'tree',   label: 'Estrutura',  icon: 'M3 7h18M3 12h18M3 17h18' },
  { id: 'kanban', label: 'Kanban',     icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2' },
]

export default function MainLayout({ session }) {
  const [page, setPage] = useState('tree')

  const cpf = session.user.email?.replace('@aguia.com', '') ?? '—'

  return (
    <div className="min-h-screen flex bg-brand-900">
      {/* Sidebar */}
      <aside className="w-56 flex-shrink-0 border-r border-white/8 flex flex-col">
        {/* Brand */}
        <div className="px-4 py-5 border-b border-white/8">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-brand-500/30 border border-brand-500/40 flex items-center justify-center">
              <svg viewBox="0 0 24 24" className="w-4 h-4 text-accent" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-white leading-none">PCM Águia</p>
              <p className="text-[10px] text-slate-500 mt-0.5 font-mono">Gestão PPR</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-3 px-2 flex flex-col gap-0.5">
          {NAV.map(n => (
            <button
              key={n.id}
              onClick={() => setPage(n.id)}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-all w-full text-left
                ${page === n.id
                  ? 'bg-brand-500/20 text-brand-200 border border-brand-500/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                }`}
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d={n.icon} />
              </svg>
              {n.label}
            </button>
          ))}
        </nav>

        {/* User */}
        <div className="px-4 py-4 border-t border-white/8">
          <div className="flex items-center gap-2.5 mb-2">
            <div className="w-7 h-7 rounded-full bg-brand-500/30 flex items-center justify-center text-xs text-brand-200 font-mono flex-shrink-0">
              {cpf.slice(0, 3)}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-mono text-slate-300 truncate">{cpf}</p>
              <p className="text-[10px] text-slate-500">{session.user.user_metadata?.papel ?? 'Usuário'}</p>
            </div>
          </div>
          <button
            onClick={() => supabase.auth.signOut()}
            className="btn w-full justify-center text-xs py-1.5 text-slate-400"
          >
            Sair
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-auto">
        {page === 'tree'   && <OrgTreePage session={session} />}
        {page === 'kanban' && <KanbanPage  session={session} />}
      </main>
    </div>
  )
}
