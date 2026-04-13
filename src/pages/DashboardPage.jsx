import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useSetores } from '../hooks/useSetores'

const MESES_SEMESTRE = {
  FEV_SET: ['2025-02', '2025-03', '2025-04', '2025-05', '2025-06', '2025-07', '2025-08', '2025-09'],
  SET_MAR: ['2025-09', '2025-10', '2025-11', '2025-12', '2026-01', '2026-02', '2026-03'],
}
const MES_LABEL = {
  '2025-01': 'Jan', '2025-02': 'Fev', '2025-03': 'Mar',
  '2025-04': 'Abr', '2025-05': 'Mai', '2025-06': 'Jun',
  '2025-07': 'Jul', '2025-08': 'Ago', '2025-09': 'Set',
  '2025-10': 'Out', '2025-11': 'Nov', '2025-12': 'Dez',
  '2026-01': 'Jan', '2026-02': 'Fev', '2026-03': 'Mar',
}

function PprBar({ valor, max = 120, label }) {
  const pct = Math.min((valor / max) * 100, 100)
  const color = valor >= 100
    ? 'bg-green-500'
    : valor >= 60
    ? 'bg-amber-500'
    : 'bg-red-500'

  return (
    <div className="flex items-center gap-3">
      {label && <span className="text-xs text-slate-400 w-8 text-right font-mono flex-shrink-0">{label}</span>}
      <div className="flex-1 h-2 rounded-full bg-white/8 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className={`text-xs font-mono font-medium w-12 text-right ${
        valor >= 100 ? 'text-green-400' : valor >= 60 ? 'text-amber-400' : 'text-red-400'
      }`}>
        {valor.toFixed(1)}%
      </span>
    </div>
  )
}

function SetorPPRCard({ setor, lancamentos, metas }) {
  // Calcular PPR acumulado por mês
  const metasDoSetor = metas.filter(m => m.setor_id === setor.id && m.ativa !== false)
  const pesoTotal = metasDoSetor.reduce((s, m) => s + (Number(m.peso) || 0), 0)

  function calcularPercentualMeta(meta, lancamento) {
    if (!lancamento || lancamento.status !== 'APROVADO') return null
    const valor = Number(lancamento.valor)
    if (isNaN(valor)) return null
    const ranges = meta.ranges ?? []
    if (ranges.length === 0) return null

    // Ordenar ranges conforme direção
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

  // Por mês
  const resultadoPorMes = {}
  const lancamentosDoSetor = lancamentos.filter(l =>
    metasDoSetor.some(m => m.id === l.meta_id)
  )

  metasDoSetor.forEach(meta => {
    const lancsDaMeta = lancamentosDoSetor.filter(l => l.meta_id === meta.id)
    lancsDaMeta.forEach(l => {
      const mes = l.mes_referencia
      if (!resultadoPorMes[mes]) resultadoPorMes[mes] = { ganho: 0, possivel: 0, atrasadas: 0 }
      const pct = calcularPercentualMeta(meta, l)
      const pesoPorMes = (Number(meta.peso) || 0) / 6
      resultadoPorMes[mes].possivel += pesoPorMes
      if (pct !== null) {
        resultadoPorMes[mes].ganho += (pct / 100) * pesoPorMes
      }
      if (l.status === 'PENDENTE') {
        const hoje = new Date()
        const [ano, mesNum] = mes.split('-').map(Number)
        const prazo = new Date(ano, mesNum - 1, meta.dia_lancamento ?? 28)
        if (hoje > prazo) resultadoPorMes[mes].atrasadas++
      }
    })
  })

  const pprAcumulado = Object.values(resultadoPorMes).reduce((s, m) => s + m.ganho, 0)
  const metasAtrasadas = Object.values(resultadoPorMes).reduce((s, m) => s + m.atrasadas, 0)
  const mesesComDados = Object.keys(resultadoPorMes).length

  return (
    <div className="card p-4">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-white">{setor.nome}</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            {metasDoSetor.length} meta{metasDoSetor.length !== 1 ? 's' : ''} ativas
            · Peso total: {pesoTotal}%
          </p>
        </div>
        {metasAtrasadas > 0 && (
          <span className="text-xs bg-red-500/15 border border-red-500/20 text-red-400 px-2 py-0.5 rounded font-mono">
            {metasAtrasadas} atrasada{metasAtrasadas !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* PPR acumulado */}
      <div className="mb-4">
        <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">PPR acumulado</p>
        <PprBar valor={pprAcumulado} />
        <div className="flex justify-between mt-1">
          <span className="text-[10px] text-slate-600">0%</span>
          <span className="text-[10px] text-slate-600">120% (máx)</span>
        </div>
      </div>

      {/* Por mês */}
      {mesesComDados > 0 && (
        <div>
          <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">Por mês</p>
          <div className="flex flex-col gap-1.5">
            {Object.entries(resultadoPorMes)
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([mes, r]) => (
                <PprBar
                  key={mes}
                  label={MES_LABEL[mes] ?? mes}
                  valor={(r.possivel > 0 ? (r.ganho / r.possivel) * 100 : 0)}
                  max={100}
                />
              ))}
          </div>
        </div>
      )}

      {metasDoSetor.length === 0 && (
        <p className="text-xs text-slate-600 italic">Nenhuma meta configurada para este setor.</p>
      )}
    </div>
  )
}

function AlertasCard({ lancamentos, metas }) {
  const hoje = new Date()
  const atrasados = lancamentos.filter(l => {
    if (l.status !== 'PENDENTE') return false
    const meta = metas.find(m => m.id === l.meta_id)
    if (!meta) return false
    const [ano, mesNum] = l.mes_referencia.split('-').map(Number)
    const prazo = new Date(ano, mesNum - 1, meta.dia_lancamento ?? 28)
    return hoje > prazo
  })

  const aguardandoAprovacao = lancamentos.filter(l => l.status === 'AGUARDANDO_APROVACAO')
  const reprovados = lancamentos.filter(l => l.status === 'REPROVADO')

  if (atrasados.length === 0 && aguardandoAprovacao.length === 0 && reprovados.length === 0) {
    return (
      <div className="card p-4 flex items-center gap-3">
        <span className="text-green-400 text-lg">✓</span>
        <p className="text-sm text-slate-400">Nenhum alerta pendente.</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      {atrasados.map(l => {
        const meta = metas.find(m => m.id === l.meta_id)
        return (
          <div key={l.id} className="card px-4 py-3 border-red-500/20 flex items-center gap-3">
            <span className="text-red-400 text-sm flex-shrink-0">⚠</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-red-300 font-medium truncate">{meta?.nome ?? '—'}</p>
              <p className="text-xs text-slate-500">{MES_LABEL[l.mes_referencia] ?? l.mes_referencia} · Prazo vencido</p>
            </div>
            <span className="text-[10px] bg-red-500/15 text-red-400 px-2 py-0.5 rounded border border-red-500/20">ATRASADO</span>
          </div>
        )
      })}
      {aguardandoAprovacao.map(l => {
        const meta = metas.find(m => m.id === l.meta_id)
        return (
          <div key={l.id} className="card px-4 py-3 border-amber-500/20 flex items-center gap-3">
            <span className="text-amber-400 text-sm flex-shrink-0">⏳</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-amber-300 font-medium truncate">{meta?.nome ?? '—'}</p>
              <p className="text-xs text-slate-500">{MES_LABEL[l.mes_referencia] ?? l.mes_referencia} · Aguardando aprovação do especialista</p>
            </div>
            <span className="text-[10px] bg-amber-500/15 text-amber-400 px-2 py-0.5 rounded border border-amber-500/20">PENDENTE</span>
          </div>
        )
      })}
      {reprovados.map(l => {
        const meta = metas.find(m => m.id === l.meta_id)
        return (
          <div key={l.id} className="card px-4 py-3 border-slate-600 flex items-center gap-3">
            <span className="text-slate-400 text-sm flex-shrink-0">✕</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-slate-300 font-medium truncate">{meta?.nome ?? '—'}</p>
              <p className="text-xs text-slate-500">{MES_LABEL[l.mes_referencia] ?? l.mes_referencia} · {l.observacoes ?? 'Reprovado'}</p>
            </div>
            <span className="text-[10px] bg-slate-700 text-slate-400 px-2 py-0.5 rounded">REPROVADO</span>
          </div>
        )
      })}
    </div>
  )
}

function ResumoGeral({ lancamentos, metas, setores }) {
  const aprovados = lancamentos.filter(l => l.status === 'APROVADO').length
  const total = lancamentos.length
  const pctAprovado = total > 0 ? Math.round((aprovados / total) * 100) : 0

  const metasAtivas = metas.filter(m => m.ativa !== false).length
  const setoresComMetas = new Set(metas.filter(m => m.ativa !== false).map(m => m.setor_id)).size

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {[
        { label: 'Lançamentos', value: total, sub: 'no período' },
        { label: 'Aprovados', value: `${pctAprovado}%`, sub: `${aprovados} de ${total}` },
        { label: 'Metas ativas', value: metasAtivas, sub: 'configuradas' },
        { label: 'Setores', value: setoresComMetas, sub: 'com metas' },
      ].map(card => (
        <div key={card.label} className="card px-4 py-3">
          <p className="text-xs text-slate-500 uppercase tracking-wider">{card.label}</p>
          <p className="text-2xl font-mono font-medium text-white mt-1">{card.value}</p>
          <p className="text-xs text-slate-600 mt-0.5">{card.sub}</p>
        </div>
      ))}
    </div>
  )
}

export default function DashboardPage() {
  const [lancamentos, setLancamentos] = useState([])
  const [metas, setMetas] = useState([])
  const [loading, setLoading] = useState(true)
  const [semestre, setSemestre] = useState('FEV_SET')
  const [filtroSetor, setFiltroSetor] = useState('')
  const { setores } = useSetores()

  const fetchData = useCallback(async () => {
    setLoading(true)
    const meses = MESES_SEMESTRE[semestre] ?? []

    const [{ data: metasData }, { data: lancsData }] = await Promise.all([
      supabase.from('metas').select('*, setores(nome)').order('nome'),
      supabase
        .from('lancamentos')
        .select('*, metas(nome, peso, direcao, unidade, dia_lancamento, ranges, setor_id)')
        .in('mes_referencia', meses)
    ])

    setMetas(metasData ?? [])
    setLancamentos(lancsData ?? [])
    setLoading(false)
  }, [semestre])

  useEffect(() => { fetchData() }, [fetchData])

  const setoresFiltrados = filtroSetor
    ? setores.filter(s => s.id === filtroSetor)
    : setores

  const aguardandoCount = lancamentos.filter(l => l.status === 'AGUARDANDO_APROVACAO').length
  const atrasadosCount = (() => {
    const hoje = new Date()
    return lancamentos.filter(l => {
      if (l.status !== 'PENDENTE') return false
      const meta = metas.find(m => m.id === l.meta_id)
      if (!meta) return false
      const [ano, mesNum] = l.mes_referencia.split('-').map(Number)
      return hoje > new Date(ano, mesNum - 1, meta.dia_lancamento ?? 28)
    }).length
  })()

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-6 py-4 border-b border-white/8 flex items-center justify-between flex-shrink-0">
        <div>
          <h1 className="text-base font-semibold text-white">Dashboard PPR</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Acompanhamento do ciclo semestral
            {(aguardandoCount > 0 || atrasadosCount > 0) && (
              <span className="ml-2">
                {aguardandoCount > 0 && <span className="text-amber-400">· {aguardandoCount} aguard. aprovação </span>}
                {atrasadosCount > 0 && <span className="text-red-400">· {atrasadosCount} atrasado{atrasadosCount !== 1 ? 's' : ''}</span>}
              </span>
            )}
          </p>
        </div>
        <button onClick={fetchData} className="btn text-xs">↻ Atualizar</button>
      </div>

      {/* Filtros */}
      <div className="px-6 py-3 border-b border-white/5 flex items-center gap-3 flex-shrink-0 flex-wrap">
        <span className="text-xs text-slate-500 uppercase tracking-wider">Semestre</span>
        <select className="input w-auto text-xs py-1.5 px-2" value={semestre} onChange={e => setSemestre(e.target.value)}>
          <option value="FEV_SET">Fev → Set</option>
          <option value="SET_MAR">Set → Mar</option>
        </select>
        <span className="text-xs text-slate-500 uppercase tracking-wider">Setor</span>
        <select className="input w-auto text-xs py-1.5 px-2" value={filtroSetor} onChange={e => setFiltroSetor(e.target.value)}>
          <option value="">Todos</option>
          {setores.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}
        </select>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6 flex flex-col gap-6">
        {loading ? (
          <div className="flex items-center justify-center h-40 gap-2 text-slate-500">
            <div className="w-4 h-4 border border-brand-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-sm">Carregando...</span>
          </div>
        ) : (
          <>
            <ResumoGeral lancamentos={lancamentos} metas={metas} setores={setores} />

            {/* Alertas */}
            {(aguardandoCount > 0 || atrasadosCount > 0) && (
              <div>
                <h2 className="text-xs text-slate-400 uppercase tracking-wider mb-3">Alertas</h2>
                <AlertasCard lancamentos={lancamentos} metas={metas} />
              </div>
            )}

            {/* PPR por setor */}
            <div>
              <h2 className="text-xs text-slate-400 uppercase tracking-wider mb-3">
                Resultado por setor
              </h2>
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                {setoresFiltrados
                  .filter(s => metas.some(m => m.setor_id === s.id))
                  .map(setor => (
                    <SetorPPRCard
                      key={setor.id}
                      setor={setor}
                      lancamentos={lancamentos}
                      metas={metas}
                    />
                  ))}
              </div>
              {setoresFiltrados.filter(s => metas.some(m => m.setor_id === s.id)).length === 0 && (
                <div className="flex flex-col items-center justify-center h-40 text-slate-500 gap-2">
                  <p className="text-sm">Nenhum setor com metas configuradas.</p>
                  <p className="text-xs">Acesse a aba Metas para cadastrar.</p>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}