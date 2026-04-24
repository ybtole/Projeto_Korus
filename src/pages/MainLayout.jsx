import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useConnectionStatus } from '../hooks/useRealtimeSync'
import OrgTreePage    from './OrgTreePage'
import KanbanPage     from './KanbanPage'
import MetasPage      from './MetasPage'
import DashboardPage  from './DashboardPage'
import ERPPage        from './ERPPage'

// ─── Cores dos badges de papel ────────────────────────────────────────────────

const PAPEL_BADGE_COLORS = {
  'A.C':     'bg-amber-900/50 text-amber-300 border-amber-500/30',
  'T.I':     'bg-cyan-900/50 text-cyan-300 border-cyan-500/30',
  'R.A':     'bg-purple-900/50 text-purple-300 border-purple-500/30',
  'R.M':     'bg-blue-900/50 text-blue-300 border-blue-500/30',
  'L.M':     'bg-green-900/50 text-green-300 border-green-500/30',
  'Usuário': 'bg-slate-800 text-slate-400 border-white/10',
}

// ─── Navegação ────────────────────────────────────────────────────────────────

const NAV = [
  {
    id: 'dashboard',
    label: 'Dashboard PPR',
    icon: (
      <svg viewBox="0 0 24 24" className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" rx="1"/>
        <rect x="14" y="3" width="7" height="7" rx="1"/>
        <rect x="14" y="14" width="7" height="7" rx="1"/>
        <rect x="3" y="14" width="7" height="7" rx="1"/>
      </svg>
    ),
  },
  {
    id: 'metas',
    label: 'Metas',
    icon: (
      <svg viewBox="0 0 24 24" className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="9"/>
        <circle cx="12" cy="12" r="4"/>
        <line x1="12" y1="3" x2="12" y2="5"/>
        <line x1="12" y1="19" x2="12" y2="21"/>
        <line x1="3" y1="12" x2="5" y2="12"/>
        <line x1="19" y1="12" x2="21" y2="12"/>
      </svg>
    ),
  },
  {
    id: 'kanban',
    label: 'Lançamentos',
    icon: (
      <svg viewBox="0 0 24 24" className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"/>
        <rect x="9" y="3" width="6" height="4" rx="1"/>
        <line x1="9" y1="12" x2="15" y2="12"/>
        <line x1="9" y1="16" x2="13" y2="16"/>
      </svg>
    ),
  },
  {
    id: 'tree',
    label: 'Estrutura org.',
    icon: (
      <svg viewBox="0 0 24 24" className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="9" y="2" width="6" height="4" rx="1"/>
        <rect x="2" y="16" width="6" height="4" rx="1"/>
        <rect x="9" y="16" width="6" height="4" rx="1"/>
        <rect x="16" y="16" width="6" height="4" rx="1"/>
        <line x1="12" y1="6" x2="12" y2="11"/>
        <line x1="5"  y1="11" x2="19" y2="11"/>
        <line x1="5"  y1="11" x2="5"  y2="16"/>
        <line x1="12" y1="11" x2="12" y2="16"/>
        <line x1="19" y1="11" x2="19" y2="16"/>
      </svg>
    ),
  },
  {
    id: 'erp',
    label: 'ERP',
    roles: ['A.C', 'T.I'],
    icon: (
      <svg viewBox="0 0 24 24" className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
        <circle cx="9" cy="7" r="4"/>
        <path d="M23 21v-2a4 4 0 00-3-3.87"/>
        <path d="M16 3.13a4 4 0 010 7.75"/>
      </svg>
    ),
  },
]

// ─── Sub-componentes ──────────────────────────────────────────────────────────

function NavBadge({ count }) {
  if (!count) return null
  return (
    <span className="ml-auto text-[10px] bg-red-500 text-white rounded-full px-1.5 min-w-[18px] text-center leading-5 font-mono tabular-nums">
      {count > 99 ? '99+' : count}
    </span>
  )
}

function ConnectionDot({ status }) {
  const map = {
    connected:    { color: 'bg-green-400', label: 'Realtime ativo',   pulse: true  },
    connecting:   { color: 'bg-amber-400', label: 'Conectando...',    pulse: true  },
    disconnected: { color: 'bg-red-500',   label: 'Sem conexão',      pulse: false },
  }
  const cfg = map[status] ?? map.connecting

  return (
    <span className="flex items-center gap-1.5">
      <span className="relative flex h-2 w-2">
        {cfg.pulse && (
          <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${cfg.color} opacity-60`} />
        )}
        <span className={`relative inline-flex rounded-full h-2 w-2 ${cfg.color}`} />
      </span>
      <span className="text-[10px] text-slate-500">{cfg.label}</span>
    </span>
  )
}

// ─── MainLayout ───────────────────────────────────────────────────────────────

export default function MainLayout({ session }) {
  const [page, setPage]   = useState('dashboard')
  const [badges, setBadges] = useState({ kanban: 0 })
  const connStatus = useConnectionStatus()

  const cpf   = session.user.email?.replace('@aguia.com', '') ?? '—'
  const papel = session.user.user_metadata?.papel ?? 'Usuário'

  // ── Redirecionamento para páginas restritas ─────────────────────────────────
  useEffect(() => {
    const paginasRestritas = {
      erp: ['A.C', 'T.I'],
    }

    const restricao = paginasRestritas[page]
    if (restricao && !restricao.includes(papel)) {
      setPage('dashboard')
    }
  }, [page, papel])

  // ── Badges: contar lançamentos aguardando aprovação ─────────────────────────
  const fetchBadges = useCallback(async () => {
    const { count } = await supabase
      .from('lancamentos')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'AGUARDANDO_APROVACAO')
    setBadges(b => ({ ...b, kanban: count ?? 0 }))
  }, [])

  useEffect(() => {
    fetchBadges()

    // Canal dedicado para badges — atualiza o número no menu em tempo real
    const channel = supabase
      .channel('main-badges')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'lancamentos' }, fetchBadges)
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [fetchBadges])

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen flex bg-brand-900">

      {/* ── Sidebar ─────────────────────────────────────────────────────────── */}
      <aside
        className="w-56 flex-shrink-0 flex flex-col border-r border-white/8"
        style={{ minHeight: '100vh', position: 'sticky', top: 0, height: '100vh' }}
      >
        {/* Marca */}
        <div className="px-4 py-5 border-b border-white/8">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-brand-500/30 border border-brand-500/40 flex items-center justify-center flex-shrink-0">
              <svg viewBox="0 0 24 24" className="w-4 h-4 text-accent" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-white leading-none truncate">PCM Águia</p>
              <p className="text-[10px] text-slate-500 mt-0.5 font-mono">Gestão PPR</p>
            </div>
          </div>
        </div>

        {/* Navegação */}
        <nav className="flex-1 py-3 px-2 flex flex-col gap-0.5 overflow-y-auto">
          {NAV.filter(n => !n.roles || n.roles.includes(papel)).map(n => {
            const isActive = page === n.id
            return (
              <button
                key={n.id}
                onClick={() => setPage(n.id)}
                className={[
                  'flex items-center gap-2.5 px-3 py-2 rounded-md text-sm w-full text-left',
                  'transition-colors duration-100 select-none',
                  isActive
                    ? 'bg-brand-500/20 text-brand-200 border border-brand-500/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/5 border border-transparent',
                ].join(' ')}
              >
                {n.icon}
                <span className="flex-1 truncate">{n.label}</span>
                <NavBadge count={n.id === 'kanban' ? badges.kanban : 0} />
              </button>
            )
          })}

          {/* ── Informações do ciclo ─────────────────────────────────────── */}
          <div className="mx-1 my-3 h-px bg-white/8" />
          <div className="px-3 py-1.5 flex flex-col gap-0.5">
            <p className="text-[10px] text-slate-600 uppercase tracking-wider">Ciclo ativo</p>
            <p className="text-xs text-slate-400 font-mono">Fev → Set 2025</p>
          </div>

          {/* ── Status de conexão ────────────────────────────────────────── */}
          <div className="px-3 py-1.5">
            <ConnectionDot status={connStatus} />
          </div>
        </nav>

        {/* ── Usuário + Sair ───────────────────────────────────────────────── */}
        <div className="px-4 py-4 border-t border-white/8 flex-shrink-0">
          <div className="flex items-center gap-2.5 mb-3">
            <div className="w-7 h-7 rounded-full bg-brand-500/30 border border-brand-500/20 flex items-center justify-center text-[11px] text-brand-200 font-mono flex-shrink-0 uppercase">
              {cpf.replace(/\D/g, '').slice(0, 2)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-mono text-slate-300 truncate">{cpf}</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded border ${PAPEL_BADGE_COLORS[papel] ?? PAPEL_BADGE_COLORS['Usuário']}`}>
                  {papel}
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={() => supabase.auth.signOut()}
            className="btn w-full justify-center text-xs py-1.5 text-slate-400 hover:text-red-400 hover:border-red-500/30"
          >
            Sair
          </button>
        </div>
      </aside>

      {/* ── Conteúdo principal ────────────────────────────────────────────── */}
      <main className="flex-1 overflow-auto min-w-0">
        {page === 'dashboard' && <DashboardPage session={session} />}
        {page === 'metas'     && <MetasPage     session={session} />}
        {page === 'kanban'    && <KanbanPage    session={session} />}
        {page === 'tree'      && <OrgTreePage   session={session} />}
        {page === 'erp'       && <ERPPage       session={session} />}
      </main>
    </div>
  )
}