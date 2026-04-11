import { useState } from 'react'
import { useSetores } from '../hooks/useSetores'
import NeuralTree from '../components/tree/NeuralTree'
import SetorModal from '../components/tree/SetorModal'

export default function OrgTreePage() {
  const { setores, loading, erro, criar, editar, excluir } = useSetores()
  const [modal, setModal] = useState(null)
  // modal: { modo: 'criar'|'editar'|'sub', setor?, parent? }

  function openAdd(parent = null) {
    setModal({ modo: parent ? 'sub' : 'criar', parent })
  }
  function openEdit(setor) {
    setModal({ modo: 'editar', setor })
  }
  async function handleDelete(setor) {
    if (!confirm(`Excluir "${setor.nome}"?`)) return
    try {
      await excluir(setor.id)
    } catch (e) {
      alert(e.message)
    }
  }

  async function handleSave(payload) {
    if (modal.modo === 'editar') {
      await editar(modal.setor.id, payload)
    } else {
      await criar({ ...payload, parent_id: modal.parent?.id ?? null })
    }
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-6 py-4 border-b border-white/8 flex items-center justify-between flex-shrink-0">
        <div>
          <h1 className="text-base font-semibold text-white">Estrutura Organizacional</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {setores.length} setor{setores.length !== 1 ? 'es' : ''} cadastrado{setores.length !== 1 ? 's' : ''}
            {' · '}
            <span className="text-green-400">● Realtime ativo</span>
          </p>
        </div>
        <button onClick={() => openAdd(null)} className="btn-primary">
          + Novo setor raiz
        </button>
      </div>

      {/* Legend */}
      <div className="px-6 py-2 border-b border-white/5 flex items-center gap-4 flex-shrink-0 flex-wrap">
        {[
          ['CORPORATIVO', '#2a6099'],
          ['DIVISÃO', '#2d6e2d'],
          ['SETOR', '#5b3fa0'],
          ['EQUIPE', '#8b3a3a'],
        ].map(([tipo, color]) => (
          <span key={tipo} className="flex items-center gap-1.5 text-xs text-slate-400">
            <span className="w-2 h-2 rounded-full" style={{ background: color }} />
            {tipo}
          </span>
        ))}
        <span className="text-xs text-slate-600 ml-auto">
          Passe o mouse sobre um nó para ver ações
        </span>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4">
        {loading && (
          <div className="flex items-center justify-center h-40 gap-2 text-slate-500">
            <div className="w-4 h-4 border border-brand-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-sm">Carregando...</span>
          </div>
        )}
        {erro && (
          <div className="bg-red-500/10 border border-red-500/20 rounded p-4 text-red-400 text-sm">
            Erro: {erro}
          </div>
        )}
        {!loading && !erro && (
          <NeuralTree
            setores={setores}
            onAdd={openAdd}
            onEdit={openEdit}
            onDelete={handleDelete}
          />
        )}
      </div>

      {/* Modal */}
      {modal && (
        <SetorModal
          modo={modal.modo}
          setor={modal.setor}
          parentNome={modal.parent?.nome}
          onSave={handleSave}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  )
}
