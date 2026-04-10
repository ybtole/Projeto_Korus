import { useState, useEffect } from 'react'
import { Target, FileText, Clock, AlertTriangle } from 'lucide-react'
import api from '../services/api'
import { useAuth } from '../context/AuthContext'

function CardStat({ titulo, valor, icone: Icone, cor }) {
  const cores = {
    azul: 'bg-blue-50 dark:bg-blue-900/20 text-blue-600',
    verde: 'bg-green-50 dark:bg-green-900/20 text-green-600',
    amarelo: 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-600',
    vermelho: 'bg-red-50 dark:bg-red-900/20 text-red-600',
  }
  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm text-gray-500 dark:text-gray-400">{titulo}</span>
        <div className={`p-2 rounded-lg ${cores[cor]}`}>
          <Icone size={16} />
        </div>
      </div>
      <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{valor ?? '—'}</p>
    </div>
  )
}

export default function Dashboard() {
  const { usuario } = useAuth()
  const [resumo, setResumo] = useState(null)
  const [cicloAtivo, setCicloAtivo] = useState(null)

  useEffect(() => {
    api.get('/ciclos/ativo').then(r => setCicloAtivo(r.data))
    api.get('/dashboard/resumo').then(r => setResumo(r.data))
  }, [])

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Dashboard</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          {cicloAtivo ? `Ciclo ativo: ${cicloAtivo.nome}` : 'Nenhum ciclo ativo'}
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <CardStat titulo="Total de Metas" valor={resumo?.total_metas} icone={Target} cor="azul" />
        <CardStat titulo="Aprovados" valor={resumo?.lancamentos_aprovados} icone={FileText} cor="verde" />
        <CardStat titulo="Pendentes" valor={resumo?.lancamentos_pendentes} icone={Clock} cor="amarelo" />
        <CardStat titulo="Metas Atrasadas" valor={resumo?.metas_atrasadas} icone={AlertTriangle} cor="vermelho" />
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">Bem-vindo, {usuario?.nome}</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Use o menu lateral para navegar entre os módulos do sistema.
        </p>
      </div>
    </div>
  )
}