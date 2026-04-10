import { useState, useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Plus } from 'lucide-react'
import api from '../services/api'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import Table from '../components/ui/Table'

export default function Lancamentos() {
  const [searchParams] = useSearchParams()
  const [lancamentos, setLancamentos] = useState([])
  const [filtro, setFiltro] = useState({ status: '', meta_id: searchParams.get('meta_id') || '' })
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    setCarregando(true)
    api.get('/lancamentos', { params: filtro })
      .then(r => setLancamentos(r.data))
      .finally(() => setCarregando(false))
  }, [filtro])

  const colunas = [
    { key: 'meta_nome', titulo: 'Meta' },
    { key: 'mes_referencia', titulo: 'Mês ref.' },
    { key: 'valor', titulo: 'Valor lançado' },
    { key: 'percentual_calculado', titulo: '% calculado', render: r => (
      r.percentual_calculado !== null
        ? <span className="font-mono text-sm">{r.percentual_calculado}%</span>
        : <span className="text-gray-400">—</span>
    )},
    { key: 'status', titulo: 'Status', render: r => <Badge tipo={r.status} /> },
    { key: 'criado_por_nome', titulo: 'Lançado por' },
    { key: 'created_at', titulo: 'Data', render: r => new Date(r.created_at).toLocaleDateString('pt-BR') },
  ]

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Lançamentos</h1>
        <Link to="/lancamentos/novo">
          <Button variante="primario" tamanho="sm">
            <Plus size={16} /> Novo lançamento
          </Button>
        </Link>
      </div>

      <div className="flex gap-3 mb-4">
        <select
          value={filtro.status}
          onChange={e => setFiltro(f => ({ ...f, status: e.target.value }))}
          className="px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Todos os status</option>
          <option value="PENDENTE">Pendente</option>
          <option value="APROVADO">Aprovado</option>
          <option value="REPROVADO">Reprovado</option>
        </select>
      </div>

      {carregando ? (
        <div className="text-center py-12 text-gray-400">Carregando...</div>
      ) : (
        <Table colunas={colunas} dados={lancamentos} vazio="Nenhum lançamento encontrado." />
      )}
    </div>
  )
}