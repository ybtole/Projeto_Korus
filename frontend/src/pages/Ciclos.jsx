import { useState, useEffect } from 'react'
import { Plus, CheckCircle } from 'lucide-react'
import api from '../services/api'
import Button from '../components/ui/Button'
import Modal from '../components/ui/Modal'
import Input from '../components/ui/Input'
import Badge from '../components/ui/Badge'

export default function Ciclos() {
  const [ciclos, setCiclos] = useState([])
  const [modalAberto, setModalAberto] = useState(false)
  const [form, setForm] = useState({ nome: '', data_inicio: '', data_fim: '' })
  const [salvando, setSalvando] = useState(false)

  useEffect(() => { api.get('/ciclos').then(r => setCiclos(r.data)) }, [])

  async function salvar() {
    setSalvando(true)
    try {
      const res = await api.post('/ciclos', form)
      setCiclos(c => [res.data, ...c])
      setModalAberto(false)
      setForm({ nome: '', data_inicio: '', data_fim: '' })
    } finally {
      setSalvando(false)
    }
  }

  async function ativar(id) {
    await api.put(`/ciclos/${id}/ativar`)
    setCiclos(c => c.map(x => ({ ...x, ativo: x.id === id })))
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Ciclos PPR</h1>
        <Button variante="primario" tamanho="sm" onClick={() => setModalAberto(true)}>
          <Plus size={16} /> Novo ciclo
        </Button>
      </div>

      <div className="flex flex-col gap-3">
        {ciclos.map(c => (
          <div key={c.id} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4 flex items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{c.nome}</p>
                {c.ativo && <Badge tipo="APROVADO" texto="Ativo" />}
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                {new Date(c.data_inicio).toLocaleDateString('pt-BR')} até {new Date(c.data_fim).toLocaleDateString('pt-BR')}
              </p>
            </div>
            {!c.ativo && (
              <Button variante="secundario" tamanho="sm" onClick={() => ativar(c.id)}>
                <CheckCircle size={14} /> Ativar
              </Button>
            )}
          </div>
        ))}
      </div>

      <Modal aberto={modalAberto} onFechar={() => setModalAberto(false)} titulo="Novo ciclo PPR">
        <div className="flex flex-col gap-4">
          <Input label="Nome do ciclo" placeholder="Ex: 1º Semestre 2025" value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} />
          <Input label="Data início" type="date" value={form.data_inicio} onChange={e => setForm(f => ({ ...f, data_inicio: e.target.value }))} />
          <Input label="Data fim" type="date" value={form.data_fim} onChange={e => setForm(f => ({ ...f, data_fim: e.target.value }))} />
          <Button variante="primario" onClick={salvar} carregando={salvando}>Criar ciclo</Button>
        </div>
      </Modal>
    </div>
  )
}