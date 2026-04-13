import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useSetores } from '../hooks/useSetores'
import { useConnectionStatus } from '../hooks/useRealtimeSync'

// ─── Helpers ─────────────────────────────────────────────────────────────────

const MES_LABEL = {
  '2025-01': 'Jan', '2025-02': 'Fev', '2025-03': 'Mar',
  '2025-04': 'Abr', '2025-05': 'Mai', '2025-06': 'Jun',
  '2025-07': 'Jul', '2025-08': 'Ago', '2025-09': 'Set',
  '2025-10': 'Out', '2025-11': 'Nov', '2025-12': 'Dez',
  '2026-01': 'Jan', '2026-02': 'Fev', '2026-03': 'Mar',
}

const MESES_SEMESTRE = {
  FEV_SET: ['2025-02', '2025-03', '2025-04', '2025-05', '2025-06', '2025-07', '2025-08', '2025-09'],
  SET_MAR: ['2025-09', '2025-10', '2025-11', '2025-12', '2026-01', '2026-02', '2026-03'],
}

const STATUS_CONFIG = {
  PENDENTE:               { label: 'Pendente',           color: '#6b7280', bg: 'rgba(107,114,128,0.15)', dot: '#6b7280' },
  EM_ANDAMENTO:           { label: 'Em andamento',        color: '#60a5fa', bg: 'rgba(96,165,250,0.15)',  dot: '#60a5fa' },
  AGUARDANDO_APROVACAO:   { label: 'Aguard. aprovação',   color: '#fbbf24', bg: 'rgba(251,191,36,0.15)',  dot: '#fbbf24' },
  APROVADO:               { label: 'Aprovado',            color: '#34d399', bg: 'rgba(52,211,153,0.15)',  dot: '#34d399' },
  REPROVADO:              { label: 'Reprovado',           color: '#f87171', bg: 'rgba(248,113,113,0.15)', dot: '#f87171' },
}

function calcularPercentualMeta(meta, lancamento) {
  if (!lancamento || lancamento.status !== 'APROVADO') return null
  const valor = Number(lancamento.valor)
  if (isNaN(valor)) return null
  const ranges = meta.ranges ?? []
  if (ranges.length === 0) return null
  const sorted = [...ranges].sort((a, b) =>
    meta.direcao === 'MAXIMIZAR'
      ? Number(b.de) - Number(a.de)
      : Number(a.de) - Number(b.de)
  )
  for (const r of sorted) {
    const de = Number(r.de)
    const ate = r.ate ? Number(r.ate) : Infinity
    if (meta.direcao === 'MAXIMIZAR') {
      if (valor >= de && valor <= ate) return Number(r.percentual)
    } else {
      if (valor <= de && valor >= (r.ate ? ate : 0)) return Number(r.percentual)
    }
  }
  return 0
}

// ─── Sub-componentes ──────────────────────────────────────────────────────────

function TabBar({ aba, setAba, connStatus, lancamentos }) {
  const aoVivoCount = lancamentos.filter(l => l.status === 'EM_ANDAMENTO').length
  const aguardandoCount = lancamentos.filter(l => l.status === 'AGUARDANDO_APROVACAO').length

  const tabs = [
    {
      id: 'geral',
      label: 'Geral',
      icon: (
        <svg viewBox="0 0 16 16" style={{ width: 14, height: 14 }} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
          <rect x="1" y="1" width="6" height="6" rx="1.5"/>
          <rect x="9" y="1" width="6" height="6" rx="1.5"/>
          <rect x="9" y="9" width="6" height="6" rx="1.5"/>
          <rect x="1" y="9" width="6" height="6" rx="1.5"/>
        </svg>
      ),
    },
    {
      id: 'ao_vivo',
      label: 'Ao Vivo',
      badge: aoVivoCount,
      live: true,
      icon: (
        <svg viewBox="0 0 16 16" style={{ width: 14, height: 14 }} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
          <circle cx="8" cy="8" r="3"/>
          <path d="M3.5 3.5a6.5 6.5 0 0 1 9 9M12.5 3.5a6.5 6.5 0 0 1-9 9"/>
        </svg>
      ),
    },
    {
      id: 'pendentes',
      label: 'Pendentes',
      badge: aguardandoCount,
      icon: (
        <svg viewBox="0 0 16 16" style={{ width: 14, height: 14 }} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
          <circle cx="8" cy="8" r="6.5"/>
          <path d="M8 4.5v4l2.5 2.5"/>
        </svg>
      ),
    },
    {
      id: 'analise',
      label: 'Análise',
      icon: (
        <svg viewBox="0 0 16 16" style={{ width: 14, height: 14 }} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
          <path d="M2 13 L5 9 L8 10.5 L11 6 L14 3"/>
          <path d="M11 3h3v3"/>
        </svg>
      ),
    },
  ]

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4, borderBottom: '1px solid rgba(255,255,255,0.08)', padding: '0 24px', backgroundColor: '#0d1e30', flexShrink: 0 }}>
      {tabs.map(tab => {
        const active = aba === tab.id
        return (
          <button
            key={tab.id}
            onClick={() => setAba(tab.id)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '10px 14px',
              border: 'none',
              borderBottom: active ? '2px solid #2a6099' : '2px solid transparent',
              background: active ? 'rgba(42,96,153,0.12)' : 'transparent',
              color: active ? '#93c5fd' : 'rgba(148,163,184,0.7)',
              cursor: 'pointer',
              fontSize: 13,
              fontFamily: 'IBM Plex Sans, sans-serif',
              fontWeight: active ? 500 : 400,
              borderRadius: '4px 4px 0 0',
              transition: 'all 0.15s',
              flexShrink: 0,
              position: 'relative',
              marginBottom: -1,
            }}
          >
            {tab.live && (
              <span style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                width: 7, height: 7, borderRadius: '50%',
                backgroundColor: connStatus === 'connected' ? '#34d399' : '#fbbf24',
                flexShrink: 0,
              }} />
            )}
            {!tab.live && tab.icon}
            {tab.label}
            {tab.badge > 0 && (
              <span style={{
                background: tab.id === 'pendentes' ? '#fbbf24' : '#2a6099',
                color: tab.id === 'pendentes' ? '#0d1e30' : '#fff',
                borderRadius: 10, padding: '1px 6px',
                fontSize: 10, fontFamily: 'IBM Plex Mono, monospace',
                fontWeight: 500, lineHeight: '16px',
              }}>
                {tab.badge}
              </span>
            )}
          </button>
        )
      })}

      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ position: 'relative', display: 'flex', width: 8, height: 8 }}>
          <span style={{
            position: 'absolute', inset: 0, borderRadius: '50%',
            backgroundColor: connStatus === 'connected' ? '#34d399' : '#fbbf24',
            opacity: 0.6,
            animation: 'ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite',
          }} />
          <span style={{
            width: 8, height: 8, borderRadius: '50%',
            backgroundColor: connStatus === 'connected' ? '#34d399' : '#fbbf24',
            display: 'block',
          }} />
        </span>
        <span style={{ fontSize: 11, color: 'rgba(148,163,184,0.6)', fontFamily: 'IBM Plex Mono, monospace' }}>
          {connStatus === 'connected' ? 'Sincronizado' : connStatus === 'connecting' ? 'Conectando...' : 'Sem conexão'}
        </span>
      </div>
    </div>
  )
}

// ── Stat Card ─────────────────────────────────────────────────────────────────
function StatCard({ label, value, sub, icon, accent, pulse }) {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.03)',
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: 8,
      padding: '16px 20px',
      display: 'flex',
      flexDirection: 'column',
      gap: 4,
      position: 'relative',
      overflow: 'hidden',
    }}>
      {accent && (
        <div style={{
          position: 'absolute', top: 0, right: 0,
          width: 3, height: '100%',
          background: accent,
          borderRadius: '0 8px 8px 0',
        }} />
      )}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
        {icon && <span style={{ color: 'rgba(148,163,184,0.7)', display: 'flex' }}>{icon}</span>}
        <span style={{ fontSize: 11, color: 'rgba(148,163,184,0.6)', fontFamily: 'IBM Plex Mono, monospace', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          {label}
        </span>
        {pulse && (
          <span style={{
            width: 6, height: 6, borderRadius: '50%',
            backgroundColor: '#34d399',
            display: 'inline-block',
            marginLeft: 'auto',
            animation: 'ping 1.5s infinite',
          }} />
        )}
      </div>
      <div style={{ fontSize: 28, fontWeight: 500, fontFamily: 'IBM Plex Mono, monospace', color: '#f1f5f9', lineHeight: 1 }}>
        {value}
      </div>
      {sub && <div style={{ fontSize: 11, color: 'rgba(148,163,184,0.5)', marginTop: 2 }}>{sub}</div>}
    </div>
  )
}

// ── Progress Bar ──────────────────────────────────────────────────────────────
function ProgressBar({ value, max = 100, color = '#2a6099', animated = false }) {
  const pct = Math.min((value / max) * 100, 100)
  const barColor = value >= 100 ? '#34d399' : value >= 60 ? '#fbbf24' : color
  return (
    <div style={{ flex: 1, height: 6, background: 'rgba(255,255,255,0.08)', borderRadius: 3, overflow: 'hidden' }}>
      <div style={{
        width: `${pct}%`, height: '100%', background: barColor,
        borderRadius: 3,
        transition: 'width 0.6s ease',
        ...(animated ? { backgroundImage: `linear-gradient(90deg, ${barColor}, ${barColor}aa, ${barColor})`, backgroundSize: '200% 100%', animation: 'shimmer 1.5s infinite' } : {}),
      }} />
    </div>
  )
}

// ── Meta Row (Ao Vivo) ────────────────────────────────────────────────────────
function MetaAoVivoCard({ meta, lancamentos }) {
  const lancsAprovados = lancamentos.filter(l => l.meta_id === meta.id && l.status === 'APROVADO')
  const ultimoLanc = lancamentos.filter(l => l.meta_id === meta.id).sort((a, b) => b.data_criacao?.localeCompare(a.data_criacao ?? '') ?? 0)[0]
  const totalUnidades = lancsAprovados.reduce((s, l) => s + (Number(l.valor) || 0), 0)
  const ultimaAtualizacao = ultimoLanc?.data_criacao
    ? new Date(ultimoLanc.data_criacao).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    : '—'

  const status = ultimoLanc ? ultimoLanc.status : 'PENDENTE'
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.PENDENTE

  return (
    <div style={{
      background: 'rgba(255,255,255,0.03)',
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: 8,
      padding: '14px 18px',
      display: 'flex',
      alignItems: 'center',
      gap: 16,
    }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
          <span style={{
            width: 7, height: 7, borderRadius: '50%',
            backgroundColor: cfg.dot, flexShrink: 0,
            ...(status === 'EM_ANDAMENTO' ? { animation: 'ping 1.5s infinite' } : {}),
          }} />
          <span style={{ fontSize: 13, fontWeight: 500, color: '#e2e8f0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {meta.nome}
          </span>
          <span style={{
            fontSize: 10, padding: '2px 8px', borderRadius: 4,
            background: cfg.bg, color: cfg.color,
            fontFamily: 'IBM Plex Mono, monospace',
            flexShrink: 0,
          }}>
            {cfg.label}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 11, color: 'rgba(148,163,184,0.5)' }}>{meta.setores?.nome ?? '—'}</span>
          <span style={{ width: 3, height: 3, borderRadius: '50%', background: 'rgba(148,163,184,0.3)', flexShrink: 0 }} />
          <span style={{ fontSize: 11, color: 'rgba(148,163,184,0.5)' }}>Última atualiz.: {ultimaAtualizacao}</span>
        </div>
      </div>

      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <div style={{ fontSize: 22, fontFamily: 'IBM Plex Mono, monospace', fontWeight: 500, color: '#f1f5f9' }}>
          {totalUnidades.toLocaleString('pt-BR')}
        </div>
        <div style={{ fontSize: 10, color: 'rgba(148,163,184,0.5)', fontFamily: 'IBM Plex Mono, monospace' }}>
          {meta.unidade || 'unidades'}
        </div>
      </div>
    </div>
  )
}

// ── Alerta Row ────────────────────────────────────────────────────────────────
function AlertaRow({ lancamento, meta, tipo }) {
  const configs = {
    atrasado: { border: 'rgba(248,113,113,0.25)', icon: '⚠', iconColor: '#f87171', label: 'ATRASADO', labelBg: 'rgba(248,113,113,0.15)', labelColor: '#f87171' },
    aguardando: { border: 'rgba(251,191,36,0.25)', icon: '⏳', iconColor: '#fbbf24', label: 'AGUARDANDO', labelBg: 'rgba(251,191,36,0.15)', labelColor: '#fbbf24' },
    reprovado: { border: 'rgba(148,163,184,0.2)', icon: '✕', iconColor: '#94a3b8', label: 'REPROVADO', labelBg: 'rgba(148,163,184,0.1)', labelColor: '#94a3b8' },
  }
  const cfg = configs[tipo]

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '10px 16px',
      background: 'rgba(255,255,255,0.02)',
      border: `1px solid ${cfg.border}`,
      borderRadius: 6,
    }}>
      <span style={{ fontSize: 13, color: cfg.iconColor, flexShrink: 0 }}>{cfg.icon}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 13, color: '#cbd5e1', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {meta?.nome ?? '—'}
        </p>
        <p style={{ fontSize: 11, color: 'rgba(148,163,184,0.5)', margin: '2px 0 0' }}>
          {MES_LABEL[lancamento.mes_referencia] ?? lancamento.mes_referencia}
          {lancamento.observacoes ? ` · ${lancamento.observacoes}` : ''}
        </p>
      </div>
      <span style={{
        fontSize: 10, padding: '2px 8px', borderRadius: 4,
        background: cfg.labelBg, color: cfg.labelColor,
        fontFamily: 'IBM Plex Mono, monospace', flexShrink: 0,
      }}>
        {cfg.label}
      </span>
    </div>
  )
}

// ─── Aba Geral ────────────────────────────────────────────────────────────────
function AbaGeral({ lancamentos, metas, setores, semestre, setSemestre }) {
  const aprovados = lancamentos.filter(l => l.status === 'APROVADO').length
  const total = lancamentos.length
  const emAndamento = lancamentos.filter(l => l.status === 'EM_ANDAMENTO').length
  const aguardando = lancamentos.filter(l => l.status === 'AGUARDANDO_APROVACAO').length
  const pctAprovado = total > 0 ? Math.round((aprovados / total) * 100) : 0

  const hoje = new Date()
  const atrasados = lancamentos.filter(l => {
    if (l.status !== 'PENDENTE') return false
    const meta = metas.find(m => m.id === l.meta_id)
    if (!meta) return false
    const [ano, mesNum] = l.mes_referencia.split('-').map(Number)
    return hoje > new Date(ano, mesNum - 1, meta.dia_lancamento ?? 28)
  }).length

  // PPR geral acumulado
  let pprGanho = 0
  lancamentos.forEach(l => {
    const meta = metas.find(m => m.id === l.meta_id)
    if (!meta) return
    const pct = calcularPercentualMeta(meta, l)
    if (pct !== null) pprGanho += (pct / 100) * ((Number(meta.peso) || 0) / 6)
  })

  // Por setor
  const porSetor = setores.map(s => {
    const metasS = metas.filter(m => m.setor_id === s.id)
    const lancsS = lancamentos.filter(l => metasS.some(m => m.id === l.meta_id))
    const aprovadosS = lancsS.filter(l => l.status === 'APROVADO').length
    const totalS = lancsS.length
    const pct = totalS > 0 ? Math.round((aprovadosS / totalS) * 100) : 0
    return { setor: s, metas: metasS, lancamentos: lancsS, pct, totalS }
  }).filter(x => x.metas.length > 0)

  return (
    <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Status realtime */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '6px 14px',
        background: 'rgba(52,211,153,0.08)',
        border: '1px solid rgba(52,211,153,0.2)',
        borderRadius: 6,
        width: 'fit-content',
      }}>
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#34d399', display: 'block', animation: 'ping 1.5s infinite' }} />
        <span style={{ fontSize: 11, color: '#34d399', fontFamily: 'IBM Plex Mono, monospace' }}>
          Dados atualizados em tempo real
        </span>
        <span style={{ marginLeft: 12, display: 'flex', gap: 8 }}>
          <select
            value={semestre}
            onChange={e => setSemestre(e.target.value)}
            style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 4,
              color: '#94a3b8',
              fontSize: 11,
              padding: '2px 6px',
              fontFamily: 'IBM Plex Mono, monospace',
              cursor: 'pointer',
            }}
          >
            <option value="FEV_SET">Fev → Set 2025</option>
            <option value="SET_MAR">Set → Mar 2025/26</option>
          </select>
        </span>
      </div>

      {/* Stats grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
        <StatCard
          label="Total lançamentos"
          value={total}
          sub="no semestre"
          accent="#2a6099"
          icon={<svg viewBox="0 0 16 16" style={{width:14,height:14}} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M3 4h10M3 8h10M3 12h6"/></svg>}
        />
        <StatCard
          label="Aprovados"
          value={`${pctAprovado}%`}
          sub={`${aprovados} de ${total}`}
          accent="#34d399"
          icon={<svg viewBox="0 0 16 16" style={{width:14,height:14}} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M3 8l3.5 3.5L13 4"/></svg>}
        />
        <StatCard
          label="PPR acumulado"
          value={`${pprGanho.toFixed(1)}%`}
          sub="máx. 120%"
          accent="#e8a020"
          pulse
          icon={<svg viewBox="0 0 16 16" style={{width:14,height:14}} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><circle cx="8" cy="8" r="6.5"/><circle cx="8" cy="8" r="2.5"/></svg>}
        />
        <StatCard
          label="Em andamento"
          value={emAndamento}
          sub="em execução agora"
          accent="#60a5fa"
        />
        <StatCard
          label="Aguard. aprovação"
          value={aguardando}
          sub="para revisar"
          accent="#fbbf24"
        />
        <StatCard
          label="Atrasadas"
          value={atrasados}
          sub={atrasados > 0 ? 'ação necessária' : 'tudo em dia'}
          accent={atrasados > 0 ? '#f87171' : '#34d399'}
        />
      </div>

      {/* Barra PPR geral */}
      <div style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 8,
        padding: '16px 20px',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <span style={{ fontSize: 11, color: 'rgba(148,163,184,0.6)', fontFamily: 'IBM Plex Mono, monospace', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Progresso PPR geral do semestre
          </span>
          <span style={{
            fontSize: 13, fontFamily: 'IBM Plex Mono, monospace', fontWeight: 500,
            color: pprGanho >= 100 ? '#34d399' : pprGanho >= 60 ? '#fbbf24' : '#f87171',
          }}>
            {pprGanho.toFixed(1)}% / 120%
          </span>
        </div>
        <ProgressBar value={pprGanho} max={120} animated />
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
          <span style={{ fontSize: 10, color: 'rgba(148,163,184,0.4)' }}>0%</span>
          <span style={{ fontSize: 10, color: 'rgba(148,163,184,0.4)' }}>60%</span>
          <span style={{ fontSize: 10, color: 'rgba(148,163,184,0.4)' }}>120% máx.</span>
        </div>
      </div>

      {/* Por setor */}
      {porSetor.length > 0 && (
        <div>
          <p style={{ fontSize: 11, color: 'rgba(148,163,184,0.5)', fontFamily: 'IBM Plex Mono, monospace', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>
            Resultado por setor
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {porSetor.map(({ setor, lancamentos: lancsS, pct, metas: metasS }) => (
              <div key={setor.id} style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '10px 16px',
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid rgba(255,255,255,0.06)',
                borderRadius: 6,
              }}>
                <span style={{ fontSize: 12, color: '#94a3b8', width: 140, flexShrink: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {setor.nome}
                </span>
                <ProgressBar value={pct} max={100} />
                <span style={{
                  fontSize: 12, fontFamily: 'IBM Plex Mono, monospace', fontWeight: 500,
                  color: pct >= 100 ? '#34d399' : pct >= 60 ? '#fbbf24' : '#f87171',
                  width: 40, textAlign: 'right', flexShrink: 0,
                }}>
                  {pct}%
                </span>
                <span style={{ fontSize: 11, color: 'rgba(148,163,184,0.4)', flexShrink: 0 }}>
                  {metasS.length} meta{metasS.length !== 1 ? 's' : ''}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Aba Ao Vivo ──────────────────────────────────────────────────────────────
function AbaAoVivo({ lancamentos, metas, lastUpdate }) {
  const emAndamento = lancamentos.filter(l => l.status === 'EM_ANDAMENTO')
  const aprovadosHoje = lancamentos.filter(l => {
    if (l.status !== 'APROVADO') return false
    const d = new Date(l.data_criacao ?? '')
    const hoje = new Date()
    return d.toDateString() === hoje.toDateString()
  })

  // Todas as metas com lançamento recente (últimas 24h)
  const metasRecentes = metas.filter(m =>
    lancamentos.some(l => {
      if (l.meta_id !== m.id) return false
      const d = new Date(l.data_criacao ?? '')
      return (Date.now() - d.getTime()) < 24 * 60 * 60 * 1000
    })
  )

  return (
    <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header monitoramento */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '8px 16px',
        background: 'rgba(42,96,153,0.12)',
        border: '1px solid rgba(42,96,153,0.25)',
        borderRadius: 6,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#34d399', display: 'block', animation: 'ping 1.5s infinite' }} />
          <span style={{ fontSize: 12, color: '#93c5fd', fontFamily: 'IBM Plex Mono, monospace', fontWeight: 500 }}>
            Monitoramento em Tempo Real
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <span style={{ fontSize: 11, color: '#60a5fa', fontFamily: 'IBM Plex Mono, monospace' }}>
            ⬤ {emAndamento.length} em andamento
          </span>
          <span style={{ fontSize: 11, color: 'rgba(148,163,184,0.5)', fontFamily: 'IBM Plex Mono, monospace' }}>
            atualizado às {lastUpdate}
          </span>
        </div>
      </div>

      {/* Em andamento agora */}
      <div>
        <p style={{ fontSize: 11, color: 'rgba(148,163,184,0.5)', fontFamily: 'IBM Plex Mono, monospace', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>
          ⬤ Metas em andamento — {emAndamento.length}
        </p>
        {emAndamento.length === 0 ? (
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            padding: '40px 20px',
            background: 'rgba(255,255,255,0.02)',
            border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: 8,
            gap: 8,
          }}>
            <svg viewBox="0 0 40 40" style={{ width: 40, height: 40, opacity: 0.3 }} fill="none" stroke="#34d399" strokeWidth="1.5" strokeLinecap="round">
              <circle cx="20" cy="20" r="16"/>
              <path d="M14 20l4 4 8-8"/>
            </svg>
            <p style={{ fontSize: 13, color: 'rgba(148,163,184,0.5)', margin: 0 }}>
              Nenhuma meta em andamento no momento
            </p>
            <p style={{ fontSize: 11, color: 'rgba(148,163,184,0.35)', margin: 0 }}>
              Quando um operador iniciar uma meta, ela aparecerá aqui em tempo real
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {metas
              .filter(m => emAndamento.some(l => l.meta_id === m.id))
              .map(m => (
                <MetaAoVivoCard key={m.id} meta={m} lancamentos={lancamentos} />
              ))}
          </div>
        )}
      </div>

      {/* Aprovados hoje */}
      {aprovadosHoje.length > 0 && (
        <div>
          <p style={{ fontSize: 11, color: 'rgba(148,163,184,0.5)', fontFamily: 'IBM Plex Mono, monospace', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>
            ✓ Aprovados hoje — {aprovadosHoje.length}
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {aprovadosHoje.map(l => {
              const meta = metas.find(m => m.id === l.meta_id)
              return (
                <div key={l.id} style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '10px 16px',
                  background: 'rgba(52,211,153,0.05)',
                  border: '1px solid rgba(52,211,153,0.15)',
                  borderRadius: 6,
                }}>
                  <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#34d399', flexShrink: 0 }} />
                  <span style={{ fontSize: 13, color: '#cbd5e1', flex: 1 }}>{meta?.nome ?? '—'}</span>
                  <span style={{ fontSize: 13, fontFamily: 'IBM Plex Mono, monospace', color: '#34d399' }}>
                    {Number(l.valor).toLocaleString('pt-BR')} {meta?.unidade ?? ''}
                  </span>
                  <span style={{ fontSize: 11, color: 'rgba(148,163,184,0.4)', fontFamily: 'IBM Plex Mono, monospace' }}>
                    {new Date(l.data_criacao).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Metas recentes (24h) */}
      {metasRecentes.length > 0 && (
        <div>
          <p style={{ fontSize: 11, color: 'rgba(148,163,184,0.5)', fontFamily: 'IBM Plex Mono, monospace', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>
            Atividade — últimas 24h
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {metasRecentes.slice(0, 8).map(m => (
              <MetaAoVivoCard key={m.id} meta={m} lancamentos={lancamentos} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Aba Pendentes ────────────────────────────────────────────────────────────
function AbaPendentes({ lancamentos, metas }) {
  const hoje = new Date()

  const atrasados = lancamentos.filter(l => {
    if (l.status !== 'PENDENTE') return false
    const meta = metas.find(m => m.id === l.meta_id)
    if (!meta) return false
    const [ano, mesNum] = l.mes_referencia.split('-').map(Number)
    return hoje > new Date(ano, mesNum - 1, meta.dia_lancamento ?? 28)
  })

  const aguardando = lancamentos.filter(l => l.status === 'AGUARDANDO_APROVACAO')
  const reprovados = lancamentos.filter(l => l.status === 'REPROVADO')
  const nenhum = atrasados.length === 0 && aguardando.length === 0 && reprovados.length === 0

  return (
    <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
      {nenhum ? (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
          padding: '60px 20px',
          background: 'rgba(52,211,153,0.05)',
          border: '1px solid rgba(52,211,153,0.15)',
          borderRadius: 8,
        }}>
          <svg viewBox="0 0 40 40" style={{ width: 36, height: 36 }} fill="none" stroke="#34d399" strokeWidth="1.5" strokeLinecap="round">
            <path d="M14 20l4 4 8-8"/>
            <circle cx="20" cy="20" r="16"/>
          </svg>
          <p style={{ fontSize: 14, color: '#34d399', margin: 0 }}>Nenhum alerta pendente</p>
          <p style={{ fontSize: 12, color: 'rgba(148,163,184,0.4)', margin: 0 }}>Tudo em ordem por aqui.</p>
        </div>
      ) : (
        <>
          {atrasados.length > 0 && (
            <div>
              <p style={{ fontSize: 11, color: '#f87171', fontFamily: 'IBM Plex Mono, monospace', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>
                ⚠ Atrasadas — {atrasados.length}
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {atrasados.map(l => (
                  <AlertaRow key={l.id} lancamento={l} meta={metas.find(m => m.id === l.meta_id)} tipo="atrasado" />
                ))}
              </div>
            </div>
          )}
          {aguardando.length > 0 && (
            <div>
              <p style={{ fontSize: 11, color: '#fbbf24', fontFamily: 'IBM Plex Mono, monospace', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>
                ⏳ Aguardando aprovação — {aguardando.length}
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {aguardando.map(l => (
                  <AlertaRow key={l.id} lancamento={l} meta={metas.find(m => m.id === l.meta_id)} tipo="aguardando" />
                ))}
              </div>
            </div>
          )}
          {reprovados.length > 0 && (
            <div>
              <p style={{ fontSize: 11, color: 'rgba(148,163,184,0.6)', fontFamily: 'IBM Plex Mono, monospace', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>
                ✕ Reprovadas — {reprovados.length}
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {reprovados.map(l => (
                  <AlertaRow key={l.id} lancamento={l} meta={metas.find(m => m.id === l.meta_id)} tipo="reprovado" />
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

// ─── Aba Análise ──────────────────────────────────────────────────────────────
function AbaAnalise({ lancamentos, metas, setores }) {
  // Metas com mais aprovações
  const metaStats = metas.map(m => {
    const lancs = lancamentos.filter(l => l.meta_id === m.id)
    const aprovados = lancs.filter(l => l.status === 'APROVADO').length
    const total = lancs.length
    const pct = total > 0 ? Math.round((aprovados / total) * 100) : 0
    return { meta: m, aprovados, total, pct }
  }).filter(x => x.total > 0).sort((a, b) => b.pct - a.pct)

  // Distribuição de status
  const statusDist = Object.entries(STATUS_CONFIG).map(([status, cfg]) => ({
    status, cfg,
    count: lancamentos.filter(l => l.status === status).length,
  })).filter(x => x.count > 0)

  const totalLancs = lancamentos.length

  return (
    <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Distribuição de status */}
      <div>
        <p style={{ fontSize: 11, color: 'rgba(148,163,184,0.5)', fontFamily: 'IBM Plex Mono, monospace', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>
          Distribuição de status
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8 }}>
          {statusDist.map(({ status, cfg, count }) => (
            <div key={status} style={{
              background: 'rgba(255,255,255,0.03)',
              border: `1px solid ${cfg.bg}`,
              borderRadius: 8,
              padding: '12px 14px',
              textAlign: 'center',
            }}>
              <div style={{ fontSize: 22, fontFamily: 'IBM Plex Mono, monospace', fontWeight: 500, color: cfg.color }}>
                {count}
              </div>
              <div style={{ fontSize: 10, color: 'rgba(148,163,184,0.5)', marginTop: 4 }}>{cfg.label}</div>
              <div style={{
                marginTop: 8, height: 2, borderRadius: 1,
                background: `linear-gradient(90deg, ${cfg.color} ${totalLancs > 0 ? (count / totalLancs * 100) : 0}%, rgba(255,255,255,0.06) 0%)`,
              }} />
            </div>
          ))}
        </div>
      </div>

      {/* Ranking de metas */}
      {metaStats.length > 0 && (
        <div>
          <p style={{ fontSize: 11, color: 'rgba(148,163,184,0.5)', fontFamily: 'IBM Plex Mono, monospace', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>
            Ranking de metas — por taxa de aprovação
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {metaStats.map(({ meta, aprovados, total, pct }, i) => (
              <div key={meta.id} style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '10px 16px',
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid rgba(255,255,255,0.06)',
                borderRadius: 6,
              }}>
                <span style={{
                  width: 22, height: 22, borderRadius: 4,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: i < 3 ? 'rgba(232,160,32,0.2)' : 'rgba(255,255,255,0.05)',
                  color: i < 3 ? '#e8a020' : 'rgba(148,163,184,0.4)',
                  fontSize: 11, fontFamily: 'IBM Plex Mono, monospace', fontWeight: 500,
                  flexShrink: 0,
                }}>
                  {i + 1}
                </span>
                <span style={{ flex: 1, fontSize: 13, color: '#cbd5e1', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {meta.nome}
                </span>
                <ProgressBar value={pct} max={100} />
                <span style={{
                  fontSize: 12, fontFamily: 'IBM Plex Mono, monospace', fontWeight: 500,
                  color: pct >= 80 ? '#34d399' : pct >= 50 ? '#fbbf24' : '#f87171',
                  width: 36, textAlign: 'right', flexShrink: 0,
                }}>
                  {pct}%
                </span>
                <span style={{ fontSize: 11, color: 'rgba(148,163,184,0.4)', flexShrink: 0 }}>
                  {aprovados}/{total}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Dashboard Principal ──────────────────────────────────────────────────────
export default function DashboardPage() {
  const [aba, setAba] = useState('geral')
  const [lancamentos, setLancamentos] = useState([])
  const [metas, setMetas] = useState([])
  const [loading, setLoading] = useState(true)
  const [semestre, setSemestre] = useState('FEV_SET')
  const [lastUpdate, setLastUpdate] = useState('—')
  const { setores } = useSetores()
  const connStatus = useConnectionStatus()

  const fetchData = useCallback(async () => {
    const meses = MESES_SEMESTRE[semestre] ?? []
    const [{ data: metasData }, { data: lancsData }] = await Promise.all([
      supabase.from('metas').select('*, setores(nome)').order('nome'),
      supabase
        .from('lancamentos')
        .select('*, metas(nome, peso, direcao, unidade, dia_lancamento, ranges, setor_id)')
        .in('mes_referencia', meses)
        .order('data_criacao', { ascending: false }),
    ])
    setMetas(metasData ?? [])
    setLancamentos(lancsData ?? [])
    setLastUpdate(new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }))
    setLoading(false)
  }, [semestre])

  useEffect(() => {
    fetchData()
    const channel = supabase
      .channel('dashboard-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'lancamentos' }, fetchData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'metas' }, fetchData)
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [fetchData])

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: '#0d1e30', fontFamily: 'IBM Plex Sans, sans-serif' }}>
      <style>{`
        @keyframes ping {
          75%, 100% { transform: scale(2); opacity: 0; }
        }
        @keyframes shimmer {
          0% { background-position: 200% center; }
          100% { background-position: -200% center; }
        }
      `}</style>

      {/* ── Header ── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '10px 24px',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        backgroundColor: '#0d1e30',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 28, height: 28, borderRadius: 6,
            background: 'rgba(42,96,153,0.3)',
            border: '1px solid rgba(42,96,153,0.4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg viewBox="0 0 24 24" style={{ width: 14, height: 14, color: '#e8a020' }} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
            </svg>
          </div>
          <span style={{ fontSize: 14, fontWeight: 500, color: '#f1f5f9' }}>Dashboard</span>
        </div>
        <button
          onClick={fetchData}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '5px 12px',
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 5,
            color: '#94a3b8',
            fontSize: 11,
            cursor: 'pointer',
            fontFamily: 'IBM Plex Mono, monospace',
          }}
        >
          ↻ Atualizar
        </button>
      </div>

      {/* ── Tab Bar ── */}
      <TabBar aba={aba} setAba={setAba} connStatus={connStatus} lancamentos={lancamentos} />

      {/* ── Conteúdo ── */}
      <div style={{ flex: 1, overflow: 'auto' }}>
        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200, gap: 10, color: 'rgba(148,163,184,0.5)' }}>
            <div style={{ width: 16, height: 16, border: '1.5px solid rgba(42,96,153,0.8)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
            <span style={{ fontSize: 13 }}>Carregando...</span>
          </div>
        ) : (
          <>
            {aba === 'geral' && (
              <AbaGeral
                lancamentos={lancamentos}
                metas={metas}
                setores={setores}
                semestre={semestre}
                setSemestre={setSemestre}
              />
            )}
            {aba === 'ao_vivo' && (
              <AbaAoVivo
                lancamentos={lancamentos}
                metas={metas}
                lastUpdate={lastUpdate}
              />
            )}
            {aba === 'pendentes' && (
              <AbaPendentes lancamentos={lancamentos} metas={metas} />
            )}
            {aba === 'analise' && (
              <AbaAnalise lancamentos={lancamentos} metas={metas} setores={setores} />
            )}
          </>
        )}
      </div>
    </div>
  )
}