import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Pencil, Trash2, ChevronRight } from 'lucide-react'
import api from '../services/api'
import { useAuth } from '../context/AuthContext'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import Table from '../components/ui/Table'

export default function Metas() {
  const { usuario } = useAuth()
  const [metas, setMetas] = useState([])
  const [ciclos, setCiclos] = useState([])
  const [cicloFiltro, setCicloFiltro] = useState('')
  const [carregando, setCarregando] = useState(true)

  const podeEditar = ['ADMIN', 'GESTOR'].includes(usuario?.role)

  useEffect(() => {
    api.get('/ciclos').then(r => setCiclos(r.data))
  }, [])

  useEffect(() => {
    setCarregando(true)
    api.get('/metas', { params: cicloFiltro ? { ciclo_id: cicloFiltro } : {} })
      .then(r => setMetas(r.data))
      .finally(() => setCarregando(false))
  }, [cicloFiltro])

  async function remover(id) {
    if (!confirm('Remover esta meta?')) return
    await api.delete(`/metas/${id}`)
    setMetas(m => m.filter(x => x.id !== id))
  }

  const colunas = [
    { key: 'nome', titulo: 'Meta' },
    { key: 'setor_nome', titulo: 'Setor' },
    { key: 'tipo', titulo: 'Tipo', render: r => <Badge texto={r.tipo} tipo="INFO" /> },
    { key: 'tipo_regra', titulo: 'Regra', render: r => (
      <span className="text-xs text-gray-500">{r.tipo_regra === 'CRESCENTE' ? '↑ Crescente' : '↓ Decrescente'}</span>
    )},
    { key: 'peso', titulo: 'Peso' },
    { key: 'responsavel_nome', titulo: 'Responsável' },
    { key: 'acoes', titulo: '', render: r => (
      <div className="flex items-center gap-1">
        {podeEditar && (
          <>
            <Link to={`/metas/${r.id}/editar`} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors">
              <Pencil size={14} className="text-gray-500" />
            </Link>
            <button onClick={() => remover(r.id)} className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors">
              <Trash2 size={14} className="text-red-400" />
            </button>
          </>
        )}
        <Link to={`/lancamentos?meta_id=${r.id}`} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors">
          <ChevronRight size={14} className="text-gray-500" />
        </Link>
      </div>
    )},
  ]

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Metas</h1>
        {podeEditar && (
          <Link to="/metas/nova">
            <Button variante="primario" tamanho="sm">
              <Plus size={16} /> Nova meta
            </Button>
          </Link>
        )}
      </div>

      <div className="mb-4">
        <select
          value={cicloFiltro}
          onChange={e => setCicloFiltro(e.target.value)}
          className="px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Todos os ciclos</option>
          {ciclos.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
        </select>
      </div>

      {carregando ? (
        <div className="text-center py-12 text-gray-400">Carregando...</div>
      ) : (
        <Table colunas={colunas} dados={metas} vazio="Nenhuma meta encontrada." />
      )}
    </div>
  )
}