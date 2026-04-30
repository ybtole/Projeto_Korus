import { useState } from 'react'
import { useSetores } from '../hooks/useSetores'
import { usePerfil } from '../hooks/usePerfil'
import { useResponsabilidades } from '../hooks/useResponsabilidades'
import NeuralTree from '../components/tree/NeuralTree'
import SetorModal from '../components/tree/SetorModal'

export default function OrgTreePage({ session }) {
  const { setores, loading, erro, criar, editar, excluir } = useSetores()
  const { isTI } = usePerfil(session)
  const { responsabilidades, loading: loadingResp } = useResponsabilidades()
  const [modal, setModal] = useState(null)
  const [selectedNodeId, setSelectedNodeId] = useState(null)
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
        {isTI && (
          <button onClick={() => openAdd(null)} className="btn-primary">
            + Novo setor raiz
          </button>
        )}
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
          {isTI ? 'Passe o mouse sobre um nó para ver ações' : 'Somente T.I pode editar a estrutura'}
        </span>
      </div>

      {/* Content */}
      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 p-4 relative">
          {(loading || loadingResp) && (
            <div className="flex items-center justify-center h-40 gap-2 text-slate-500">
              <div className="w-4 h-4 border border-brand-500 border-t-transparent rounded-full animate-spin" />
              <span className="text-sm">Carregando...</span>
            </div>
          )}
          {erro && (
            <div className="bg-red-500/10 border border-red-500/20 rounded p-4 text-red-400 text-sm m-4">
              Erro: {erro}
            </div>
          )}
          {!loading && !loadingResp && !erro && (
            <NeuralTree
              setores={setores}
              canEdit={isTI}
              onAdd={openAdd}
              onEdit={openEdit}
              onDelete={handleDelete}
              selectedNodeId={selectedNodeId}
              onNodeSelect={setSelectedNodeId}
            />
          )}
        </div>

        {/* Sidebar com Participantes */}
        {selectedNodeId && (
          <div className="w-80 border-l border-white/5 bg-slate-900/50 p-5 overflow-y-auto flex-shrink-0">
            {(() => {
              const setorSelecionado = setores.find(s => s.id === selectedNodeId)
              if (!setorSelecionado) return null

              const usersDoSetor = responsabilidades.filter(
                r => r.setores?.id === selectedNodeId || r.setor_id === selectedNodeId
              )

              // Mapear usuários e agrupar seus papéis
              const mapUsers = {}
              usersDoSetor.forEach(r => {
                const uId = r.user_id || r.usuarios?.id
                if (!uId) return
                if (!mapUsers[uId]) {
                  mapUsers[uId] = {
                    id: uId,
                    nome: r.usuarios?.nome,
                    email: r.usuarios?.email,
                    papeis: []
                  }
                }
                if (r.papel && !mapUsers[uId].papeis.includes(r.papel)) {
                  mapUsers[uId].papeis.push(r.papel)
                }
              })
              const listUsers = Object.values(mapUsers)

              return (
                <>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-sm font-semibold text-white truncate pr-2">
                      {setorSelecionado.nome}
                    </h2>
                    <button
                      onClick={() => setSelectedNodeId(null)}
                      className="text-slate-500 hover:text-white"
                      title="Fechar"
                    >
                      ×
                    </button>
                  </div>
                  <p className="text-xs text-slate-400 mb-6 pb-4 border-b border-white/5">
                    Participantes e responsáveis alocados neste setor.
                  </p>

                  {listUsers.length === 0 ? (
                    <p className="text-xs text-slate-500 italic text-center py-8">
                      Nenhum participante encontrado neste setor.
                    </p>
                  ) : (
                    <div className="flex flex-col gap-3">
                      {listUsers.map(u => {
                        const cpf = u.email?.replace('@aguia.com', '') ?? u.email ?? '—'
                        return (
                          <div key={u.id} className="p-3 rounded border border-white/5 bg-white/5">
                            <div className="flex items-center gap-2.5 mb-2">
                              <div className="w-7 h-7 rounded-full bg-brand-500/20 border border-brand-500/15 flex items-center justify-center text-[10px] text-brand-300 font-mono">
                                {cpf.replace(/\\D/g, '').slice(0, 2)}
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs font-mono text-slate-200 truncate">{cpf}</p>
                                <p className="text-[10px] text-slate-500 truncate">{u.nome || '—'}</p>
                              </div>
                            </div>
                            <div className="flex flex-wrap gap-1.5 pl-9">
                              {u.papeis.map(p => (
                                <span key={p} className="text-[9px] font-mono px-1.5 py-0.5 rounded border border-brand-500/30 text-brand-300 bg-brand-500/10">
                                  {p}
                                </span>
                              ))}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </>
              )
            })()}
          </div>
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
