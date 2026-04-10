import { useState, useEffect } from 'react'
import { Plus, Pencil, Trash2, ChevronRight, ChevronDown } from 'lucide-react'
import api from '../services/api'
import Button from '../components/ui/Button'
import Modal from '../components/ui/Modal'
import Input from '../components/ui/Input'
import Select from '../components/ui/Select'

function NodoSetor({ setor, todos, onEditar, onRemover }) {
  const [aberto, setAberto] = useState(true)
  const temFilhos = setor.filhos && setor.filhos.length > 0

  return (
    <div className="ml-4 border-l border-gray-200 dark:border-gray-700 pl-3">
      <div className="flex items-center gap-2 py-1.5 group">
        <button onClick={() => setAberto(a => !a)} className="text-gray-400 w-4">
          {temFilhos ? (aberto ? <ChevronDown size={14} /> : <ChevronRight size={14} />) : null}
        </button>
        <span className="text-sm text-gray-800 dark:text-gray-200 flex-1">{setor.nome}</span>
        <div className="opacity-0 group-hover:opacity-100 flex gap-1 transition-opacity">
          <button onClick={() => onEditar(setor)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors">
            <Pencil size={12} className="text-gray-500" />
          </button>
          <button onClick={() => onRemover(setor.id)} className="p-1 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors">
            <Trash2 size={12} className="text-red-400" />
          </button>
        </div>
      </div>
      {aberto && temFilhos && setor.filhos.map(filho => (
        <NodoSetor key={filho.id} setor={filho} todos={todos} onEditar={onEditar} onRemover={onRemover} />
      ))}
    </div>
  )
}

export default function Setores() {
  const [arvore, setArvore] = useState([])
  const [plano, setPlano] = useState([])
  const [modalAberto, setModalAberto] = useState(false)
  const [editando, setEditando] = useState(null)
  const [form, setForm] = useState({ nome: '', parent_id: '' })
  const [salvando, setSalvando] = useState(false)

  useEffect(() => { buscar() }, [])

  async function buscar() {
    const [arv, pl] = await Promise.all([api.get('/setores'), api.get('/setores/plano')])
    setArvore(arv.data)
    setPlano(pl.data)
  }

  function abrirNovo() {
    setEditando(null)
    setForm({ nome: '', parent_id: '' })
    setModalAberto(true)
  }

  function abrirEditar(setor) {
    setEditando(setor)
    setForm({ nome: setor.nome, parent_id: setor.parent_id || '' })
    setModalAberto(true)
  }

  async function remover(id) {
    if (!confirm('Remover este setor? Os subsetores ficarão sem pai.')) return
    await api.delete(`/setores/${id}`)
    buscar()
  }

  async function salvar() {
    setSalvando(true)
    try {
      if (editando) {
        await api.put(`/setores/${editando.id}`, form)
      } else {
        await api.post('/setores', form)
      }
      setModalAberto(false)
      buscar()
    } finally {
      setSalvando(false)
    }
  }

  const opcoesParent = [
    { value: '', label: 'Raiz (sem pai)' },
    ...plano.filter(s => !editando || s.id !== editando.id).map(s => ({ value: s.id, label: s.nome }))
  ]

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Hierarquia de Setores</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Estrutura organizacional que define visibilidade de dados</p>
        </div>
        <Button variante="primario" tamanho="sm" onClick={abrirNovo}>
          <Plus size={16} /> Novo setor
        </Button>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
        {arvore.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-6">Nenhum setor cadastrado.</p>
        ) : arvore.map(s => (
          <NodoSetor key={s.id} setor={s} todos={plano} onEditar={abrirEditar} onRemover={remover} />
        ))}
      </div>

      <Modal aberto={modalAberto} onFechar={() => setModalAberto(false)} titulo={editando ? 'Editar setor' : 'Novo setor'}>
        <div className="flex flex-col gap-4">
          <Input label="Nome do setor" value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} />
          <Select label="Setor pai" options={opcoesParent} value={form.parent_id} onChange={e => setForm(f => ({ ...f, parent_id: e.target.value }))} />
          <Button variante="primario" onClick={salvar} carregando={salvando}>
            {editando ? 'Salvar' : 'Criar setor'}
          </Button>
        </div>
      </Modal>
    </div>
  )
}