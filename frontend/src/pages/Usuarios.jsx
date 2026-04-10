import { useState, useEffect } from 'react'
import { Plus } from 'lucide-react'
import api from '../services/api'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import Table from '../components/ui/Table'
import Modal from '../components/ui/Modal'
import Input from '../components/ui/Input'
import Select from '../components/ui/Select'

const opcoesRole = [
  { value: 'OPERADOR', label: 'Operador' },
  { value: 'GESTOR', label: 'Gestor' },
  { value: 'ESPECIALISTA_CUSTO', label: 'Especialista de Custo' },
  { value: 'ADMIN', label: 'Admin' },
]

function formatarCpf(v) {
  return v.replace(/\D/g,'').replace(/(\d{3})(\d)/,'$1.$2').replace(/(\d{3})(\d)/,'$1.$2').replace(/(\d{3})(\d{1,2})$/,'$1-$2').slice(0,14)
}

export default function Usuarios() {
  const [usuarios, setUsuarios] = useState([])
  const [setores, setSetores] = useState([])
  const [modalAberto, setModalAberto] = useState(false)
  const [form, setForm] = useState({ nome: '', cpf: '', senha: '', role: 'OPERADOR', setor_id: '' })
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')

  useEffect(() => {
    api.get('/usuarios').then(r => setUsuarios(r.data))
    api.get('/setores/plano').then(r => setSetores(r.data))
  }, [])

  function set(campo, valor) {
    setForm(f => ({ ...f, [campo]: valor }))
  }

  async function salvar() {
    setErro('')
    setSalvando(true)
    try {
      const res = await api.post('/usuarios', { ...form, cpf: form.cpf.replace(/\D/g,'') })
      setUsuarios(u => [...u, res.data])
      setModalAberto(false)
      setForm({ nome: '', cpf: '', senha: '', role: 'OPERADOR', setor_id: '' })
    } catch (err) {
      setErro(err.response?.data?.erro || 'Erro ao criar usuário')
    } finally {
      setSalvando(false)
    }
  }

  async function toggleAtivo(usuario) {
    await api.put(`/usuarios/${usuario.id}`, { ativo: !usuario.ativo })
    setUsuarios(u => u.map(x => x.id === usuario.id ? { ...x, ativo: !x.ativo } : x))
  }

  const opcoesSetores = [{ value: '', label: 'Sem setor' }, ...setores.map(s => ({ value: s.id, label: s.nome }))]

  const colunas = [
    { key: 'nome', titulo: 'Nome' },
    { key: 'cpf', titulo: 'CPF', render: r => r.cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4') },
    { key: 'role', titulo: 'Perfil', render: r => <Badge tipo={r.role} /> },
    { key: 'setor_nome', titulo: 'Setor' },
    { key: 'ativo', titulo: 'Status', render: r => (
      <button onClick={() => toggleAtivo(r)} className={`text-xs font-medium px-2 py-0.5 rounded ${r.ativo ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300' : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'}`}>
        {r.ativo ? 'Ativo' : 'Inativo'}
      </button>
    )},
  ]

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Usuários</h1>
        <Button variante="primario" tamanho="sm" onClick={() => setModalAberto(true)}>
          <Plus size={16} /> Novo usuário
        </Button>
      </div>

      <Table colunas={colunas} dados={usuarios} vazio="Nenhum usuário cadastrado." />

      <Modal aberto={modalAberto} onFechar={() => setModalAberto(false)} titulo="Novo usuário">
        <div className="flex flex-col gap-4">
          <Input label="Nome completo" value={form.nome} onChange={e => set('nome', e.target.value)} />
          <Input label="CPF" placeholder="000.000.000-00" value={form.cpf} onChange={e => set('cpf', formatarCpf(e.target.value))} />
          <Input label="Senha" type="password" value={form.senha} onChange={e => set('senha', e.target.value)} />
          <Select label="Perfil" options={opcoesRole} value={form.role} onChange={e => set('role', e.target.value)} />
          <Select label="Setor" options={opcoesSetores} value={form.setor_id} onChange={e => set('setor_id', e.target.value)} />
          {erro && <p className="text-sm text-red-500">{erro}</p>}
          <Button variante="primario" onClick={salvar} carregando={salvando}>Criar usuário</Button>
        </div>
      </Modal>
    </div>
  )
}