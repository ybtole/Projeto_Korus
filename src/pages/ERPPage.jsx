import { useState } from 'react'
import { useResponsabilidades } from '../hooks/useResponsabilidades'
import AtribuicaoModal from '../components/erp/AtribuicaoModal'

const PAPEL_LABELS = {
  'R.A': 'Responsável de Aprovação',
  'R.M': 'Responsável de Meta',
  'L.M': 'Lançador de Meta',
}

const PAPEL_COLORS = {
  'R.A': 'bg-purple-900/50 text-purple-300 border-purple-500/30',
  'R.M': 'bg-blue-900/50 text-blue-300 border-blue-500/30',
  'L.M': 'bg-green-900/50 text-green-300 border-green-500/30',
}

function AcessoNegado() {
  return (
    <div className="flex-1 flex items-center justify-center p-8" style={{ minHeight: '60vh' }}>
      <div className="card p-8 max-w-sm w-full text-center">
        <div className="w-12 h-12 rounded-full bg-red-900/30 border border-red-500/20 flex items-center justify-center mx-auto mb-4">
          <svg viewBox="0 0 24 24" className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 9v4m0 4h.01"/>
            <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
          </svg>
        </div>
        <h2 className="text-sm font-semibold text-white mb-1">Acesso Negado</h2>
        <p className="text-xs text-slate-400 leading-relaxed">
          Apenas o Analista de Custos <span className="font-mono text-slate-300">(A.C)</span> pode acessar o módulo ERP.
        </p>
      </div>
    </div>
  )
}

export default function ERPPage({ session }) {
  const papel = session?.user?.user_metadata?.papel
  const { responsabilidades, usuarios, setores, loading, erro, adicionar, remover } = useResponsabilidades()
  const [modalAberto, setModalAberto] = useState(false)
  const [removendo, setRemovendo] = useState(null)

  if (papel !== 'A.C') return <AcessoNegado />

  const handleRemover = async (id) => {
    setRemovendo(id)
    try {
      await remover(id)
    } catch (err) {
      alert(err.message)
    } finally {
      setRemovendo(null)
    }
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">

      {/* ── Cabeçalho ────────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-lg font-semibold text-white">Gestão de Responsabilidades</h1>
          <p className="text-xs text-slate-500 mt-0.5 font-mono">ERP · Atribuições de papéis por setor</p>
        </div>
        <button onClick={() => setModalAberto(true)} className="btn-primary">
          <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M12 5v14M5 12h14"/>
          </svg>
          Nova Atribuição
        </button>
      </div>

      {/* ── Erro ─────────────────────────────────────────────────────────────── */}
      {erro && (
        <div className="mb-4 px-4 py-3 rounded border border-red-500/20 bg-red-900/20 text-xs text-red-400">
          Erro ao carregar dados: {erro}
        </div>
      )}

      {/* ── Tabela ───────────────────────────────────────────────────────────── */}
      <div className="card overflow-hidden">

        {/* Cabeçalho da tabela */}
        <div className="grid gap-4 px-5 py-3 border-b border-white/8 text-[10px] uppercase tracking-wider text-slate-500 font-medium"
          style={{ gridTemplateColumns: '1fr 1fr 1fr auto' }}>
          <span>Usuário</span>
          <span>Email</span>
          <span>Setor</span>
          <span>Papel</span>
        </div>

        {/* Conteúdo */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : responsabilidades.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-xs text-slate-500">Nenhuma atribuição cadastrada.</p>
            <p className="text-[10px] text-slate-600 mt-1">Clique em &quot;+ Nova Atribuição&quot; para começar.</p>
          </div>
        ) : (
          responsabilidades.map(r => (
            <div
              key={r.id}
              className="grid gap-4 px-5 py-3.5 border-b border-white/5 hover:bg-white/5 transition-colors items-center group last:border-0"
              style={{ gridTemplateColumns: '1fr 1fr 1fr auto' }}
            >
              <span className="text-sm text-slate-200 truncate">
                {r.usuarios?.nome ?? <span className="text-slate-600 italic">sem nome</span>}
              </span>
              <span className="text-xs text-slate-400 font-mono truncate">
                {r.usuarios?.email ?? '—'}
              </span>
              <span className="text-sm text-slate-300 truncate">
                {r.setores?.nome ?? '—'}
              </span>
              <div className="flex items-center gap-3 justify-end">
                <span className={`text-[11px] font-mono px-2 py-0.5 rounded border whitespace-nowrap ${PAPEL_COLORS[r.papel] ?? 'bg-slate-700 text-slate-300 border-white/10'}`}>
                  {r.papel}
                </span>
                <button
                  onClick={() => handleRemover(r.id)}
                  disabled={removendo === r.id}
                  className="btn-danger px-1.5 py-1 opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Remover atribuição"
                >
                  {removendo === r.id ? (
                    <div className="w-3.5 h-3.5 border border-red-400 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/>
                    </svg>
                  )}
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* ── Legenda ──────────────────────────────────────────────────────────── */}
      {!loading && responsabilidades.length > 0 && (
        <div className="flex flex-wrap gap-4 mt-3 px-1">
          {Object.entries(PAPEL_LABELS).map(([key, label]) => (
            <span key={key} className="flex items-center gap-1.5 text-[10px] text-slate-500">
              <span className={`font-mono px-1.5 py-0.5 rounded border ${PAPEL_COLORS[key]}`}>
                {key}
              </span>
              {label}
            </span>
          ))}
        </div>
      )}

      {/* ── Modal ────────────────────────────────────────────────────────────── */}
      {modalAberto && (
        <AtribuicaoModal
          usuarios={usuarios}
          setores={setores}
          onSalvar={adicionar}
          onClose={() => setModalAberto(false)}
        />
      )}
    </div>
  )
}
