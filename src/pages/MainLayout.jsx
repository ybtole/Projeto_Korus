import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useConnectionStatus } from '../hooks/useRealtimeSync'
import { useTheme } from '../hooks/useTheme'
import OrgTreePage    from './OrgTreePage'
import KanbanPage     from './KanbanPage'
import MetasPage      from './MetasPage'
import DashboardPage  from './DashboardPage'
import ERPPage        from './ERPPage'
import ProfilePage    from './ProfilePage'

import { usePerfil } from '../hooks/usePerfil'

// ─── Cores dos badges de papel ────────────────────────────────────────────────

const PAPEL_BADGE_COLORS = {
  'A.C':     'bg-amber-500 text-amber-950 border-amber-600',
  'T.I':     'bg-cyan-500 text-cyan-950 border-cyan-600',
  'R.A':     'bg-purple-500 text-purple-950 border-purple-600',
  'R.M':     'bg-blue-500 text-blue-950 border-blue-600',
  'L.M':     'bg-green-500 text-green-950 border-green-600',
  'Usuário': 'bg-slate-500 text-slate-950 border-slate-600',
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
    requiresERP: true,
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
  const { papel, podeVerERP, isMaster } = usePerfil(session)

  const cpf          = session.user.email?.replace('@aguia.com', '') ?? '—'
  const nome         = session.user.user_metadata?.nome ?? cpf
  const senhaTrocada = !!session.user.user_metadata?.senha_trocada

  const diasDesdeCreacao = session.user.created_at
    ? (Date.now() - new Date(session.user.created_at).getTime()) / (1000 * 60 * 60 * 24)
    : 0
  const bloqueante   = diasDesdeCreacao > 7
  const diasRestantes = Math.max(0, Math.ceil(7 - diasDesdeCreacao))

  const [dismissed, setDismissed]   = useState(false)
  const [todosPapeis, setTodosPapeis] = useState([papel])

  useEffect(() => {
    supabase
      .from('papeis')
      .select('papel')
      .eq('user_id', session.user.id)
      .then(({ data }) => {
        if (!data?.length) return
        const extras = [...new Set(data.map(v => v.papel))].filter(p => p !== papel)
        if (extras.length) setTodosPapeis([papel, ...extras])
      })
  }, [session.user.id, papel])

  // ── Redirecionamento para páginas restritas ─────────────────────────────────
  useEffect(() => {
    if (page === 'erp' && !podeVerERP) {
      setPage('dashboard')
    }
  }, [page, podeVerERP])

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

  const { theme, toggleTheme } = useTheme()

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen flex" style={{ backgroundColor: 'var(--bg-primary)' }}>

      {/* ── Sidebar ─────────────────────────────────────────────────────────── */}
      <aside
        className="sidebar w-56 flex-shrink-0 flex flex-col"
        style={{ minHeight: '100vh', position: 'sticky', top: 0, height: '100vh' }}
      >
        {/* Marca */}
        <div className="px-4 py-5" style={{ borderBottom: '1px solid var(--border)' }}>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-brand-500/30 border border-brand-500/40 flex items-center justify-center flex-shrink-0">
              <svg viewBox="0 0 24 24" className="w-4 h-4 text-accent" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold leading-none truncate" style={{ color: 'var(--text-primary)' }}>PCM Águia</p>
              <p className="text-[10px] font-mono" style={{ color: 'var(--text-muted)' }}>Gestão PPR</p>
            </div>
          </div>
        </div>

        {/* Navegação */}
        <nav className="flex-1 py-3 px-2 flex flex-col gap-0.5 overflow-y-auto">
          {NAV.filter(n => !n.requiresERP || podeVerERP).map(n => {
            const isActive = page === n.id
            return (
              <button
                key={n.id}
                onClick={() => setPage(n.id)}
                className={['nav-item flex items-center gap-2.5 px-3 py-2 rounded-md text-sm w-full text-left select-none', isActive ? 'active' : ''].join(' ')}
              >
                {n.icon}
                <span className="flex-1 truncate">{n.label}</span>
                <NavBadge count={n.id === 'kanban' ? badges.kanban : 0} />
              </button>
            )
          })}

          {/* ── Informações do ciclo ─────────────────────────────────────── */}
          <div className="sidebar-divider mx-1 my-3 h-px" />
          <div className="px-3 py-1.5 flex flex-col gap-0.5">
            <p className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Ciclo ativo</p>
            <p className="text-xs font-mono" style={{ color: 'var(--text-secondary)' }}>Fev → Set 2025</p>
          </div>

          {/* ── Status de conexão ────────────────────────────────────────── */}
          <div className="px-3 py-1.5">
            <ConnectionDot status={connStatus} />
          </div>
        </nav>

        {/* ── Usuário + Sair + Tema ────────────────────────────────────────── */}
        <div className="sidebar-footer px-4 py-4 flex-shrink-0">
          {/* Linha superior: card do usuário + botão de tema */}
          <div className="flex items-center gap-1.5 mb-3">
            <button
              onClick={() => setPage('perfil')}
              className="flex items-center gap-2.5 flex-1 min-w-0 text-left hover:bg-[var(--bg-btn-hover)] rounded-md px-1 -mx-1 py-1 -my-1 transition-colors"
            >
              <div className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0 uppercase tracking-wide" style={{ background: '#2a6099', color: '#ffffff', letterSpacing: '0.05em' }}>
                {nome.split(' ').filter(Boolean).map(n => n[0]).join('').slice(0, 2)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs truncate" style={{ color: 'var(--text-secondary)' }}>{nome}</p>
                <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                  {todosPapeis.map(p => (
                    <span key={p} className={`text-[9px] font-mono px-1.5 py-0.5 rounded border ${PAPEL_BADGE_COLORS[p] ?? PAPEL_BADGE_COLORS['Usuário']}`}>
                      {p}
                      {p === 'T.I' && <span className="ml-1 opacity-70 text-[8px]">★</span>}
                    </span>
                  ))}
                </div>
              </div>
            </button>

            {/* Botão tema */}
            <button
              onClick={toggleTheme}
              title={theme === 'dark' ? 'Mudar para tema claro' : 'Mudar para tema escuro'}
              className="flex-shrink-0 w-7 h-7 rounded-md flex items-center justify-center transition-colors"
              style={{ background: 'var(--bg-btn)', border: '1px solid var(--border-btn)', color: 'var(--text-secondary)' }}
            >
              {theme === 'dark' ? (
                /* Sol */
                <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="5"/>
                  <line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
                  <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
                  <line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
                  <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
                </svg>
              ) : (
                /* Lua */
                <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/>
                </svg>
              )}
            </button>
          </div>

          <button
            onClick={() => supabase.auth.signOut()}
            className="btn w-full justify-center text-xs py-1.5"
            style={{ color: 'var(--text-muted)' }}
          >
            Sair
          </button>
        </div>
      </aside>

      {/* ── Conteúdo principal ────────────────────────────────────────────── */}
      <main className="flex-1 overflow-auto min-w-0" style={{ backgroundColor: 'var(--bg-primary)' }}>
        {page === 'dashboard' && <DashboardPage session={session} />}
        {page === 'metas'     && <MetasPage     session={session} />}
        {page === 'kanban'    && <KanbanPage    session={session} />}
        {page === 'tree'      && <OrgTreePage   session={session} />}
        {page === 'erp'       && <ERPPage       session={session} />}
        {page === 'perfil'    && <ProfilePage   session={session} />}
      </main>

      {/* ── Overlay de troca de senha ─────────────────────────────────────── */}
      {!senhaTrocada && page !== 'perfil' && (bloqueante || !dismissed) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="relative card p-8 max-w-sm w-full mx-4 flex flex-col gap-5">

            {/* Botão fechar — só aparece enquanto não está bloqueante */}
            {!bloqueante && (
              <button
                onClick={() => setDismissed(true)}
                className="absolute top-3 right-3 text-slate-500 hover:text-slate-300 p-1 transition-colors"
                aria-label="Fechar aviso"
              >
                <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            )}

            <div className="flex items-center gap-3">
              <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${bloqueante ? 'bg-red-500/20 border border-red-500/30' : 'bg-amber-500/20 border border-amber-500/30'}`}>
                <svg viewBox="0 0 24 24" className={`w-4 h-4 ${bloqueante ? 'text-red-400' : 'text-amber-400'}`} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
                  <line x1="12" y1="9" x2="12" y2="13"/>
                  <line x1="12" y1="17" x2="12.01" y2="17"/>
                </svg>
              </div>
              <div>
                <h2 className="text-sm font-semibold text-white">
                  {bloqueante ? 'Troca de senha obrigatória' : 'Troca de senha recomendada'}
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">Segurança da conta</p>
              </div>
            </div>

            <p className="text-sm text-slate-400 leading-relaxed">
              {bloqueante
                ? 'O prazo para troca de senha expirou. Você deve definir uma senha pessoal antes de continuar usando o sistema.'
                : `Você está usando a senha padrão do sistema (seu CPF). Recomendamos trocá-la por uma senha pessoal. Você tem ${diasRestantes} dia${diasRestantes !== 1 ? 's' : ''} antes que a troca se torne obrigatória.`
              }
            </p>

            <button
              onClick={() => setPage('perfil')}
              className="btn-primary w-full justify-center py-2.5"
            >
              Atualizar senha agora
            </button>
          </div>
        </div>
      )}
    </div>
  )
}