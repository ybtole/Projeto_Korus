import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import api from '../services/api'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import Select from '../components/ui/Select'
import RangeEditor from '../components/metas/RangeEditor'

const opcoesTipo = [
  { value: 'MENSAL', label: 'Mensal' },
  { value: 'BIMESTRAL', label: 'Bimestral' },
  { value: 'SEMESTRAL', label: 'Semestral' },
]
const opcoesRegra = [
  { value: 'CRESCENTE', label: 'Crescente (maior = melhor)' },
  { value: 'DECRESCENTE', label: 'Decrescente (menor = melhor)' },
]

export default function MetaForm() {
  const { id } = useParams()
  const navigate = useNavigate()
  const editando = Boolean(id)

  const [form, setForm] = useState({
    ciclo_id: '', nome: '', descricao: '', tipo: 'MENSAL',
    setor_id: '', responsavel_id: '', lancador_id: '',
    tipo_regra: 'CRESCENTE', peso: '1',
    dia_limite_lancamento: '', data_inicio: '', data_fim: '',
    global: false,
  })
  const [ranges, setRanges] = useState([])
  const [setores, setSetores] = useState([])
  const [usuarios, setUsuarios] = useState([])
  const [ciclos, setCiclos] = useState([])
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')

  useEffect(() => {
    Promise.all([
      api.get('/setores/plano'),
      api.get('/usuarios'),
      api.get('/ciclos'),
    ]).then(([s, u, c]) => {
      setSetores(s.data)
      setUsuarios(u.data)
      setCiclos(c.data)
    })

    if (editando) {
      api.get(`/metas/${id}`).then(r => {
        const m = r.data
        setForm({
          ciclo_id: m.ciclo_id || '',
          nome: m.nome, descricao: m.descricao || '',
          tipo: m.tipo, setor_id: m.setor_id || '',
          responsavel_id: m.responsavel_id || '',
          lancador_id: m.lancador_id || '',
          tipo_regra: m.tipo_regra, peso: String(m.peso),
          dia_limite_lancamento: m.dia_limite_lancamento || '',
          data_inicio: m.data_inicio?.slice(0, 10) || '',
          data_fim: m.data_fim?.slice(0, 10) || '',
          global: m.global || false,
        })
        setRanges(m.ranges || [])
      })
    }
  }, [id])

  function set(campo, valor) {
    setForm(f => ({ ...f, [campo]: valor }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setErro('')
    if (ranges.length === 0) {
      setErro('Adicione pelo menos um range de resultado.')
      return
    }
    setSalvando(true)
    try {
      const payload = {
        ...form,
        peso: parseFloat(form.peso),
        dia_limite_lancamento: form.dia_limite_lancamento ? parseInt(form.dia_limite_lancamento) : null,
        ranges,
      }
      if (editando) {
        await api.put(`/metas/${id}`, payload)
      } else {
        await api.post('/metas', payload)
      }
      navigate('/metas')
    } catch (err) {
      setErro(err.response?.data?.erro || 'Erro ao salvar meta')
    } finally {
      setSalvando(false)
    }
  }

  const opcoesSetores = [{ value: '', label: 'Selecione...' }, ...setores.map(s => ({ value: s.id, label: s.nome }))]
  const opcoesUsuarios = [{ value: '', label: 'Selecione...' }, ...usuarios.map(u => ({ value: u.id, label: u.nome }))]
  const opcoesCiclos = [{ value: '', label: 'Selecione...' }, ...ciclos.map(c => ({ value: c.id, label: c.nome }))]

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">
          {editando ? 'Editar Meta' : 'Nova Meta'}
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5 flex flex-col gap-4">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Informações da meta</h2>

          <Select label="Ciclo PPR" options={opcoesCiclos} value={form.ciclo_id} onChange={e => set('ciclo_id', e.target.value)} />
          <Input label="Nome da meta" value={form.nome} onChange={e => set('nome', e.target.value)} required />
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Descrição</label>
            <textarea
              rows={2}
              value={form.descricao}
              onChange={e => set('descricao', e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Select label="Tipo" options={opcoesTipo} value={form.tipo} onChange={e => set('tipo', e.target.value)} />
            <Select label="Regra" options={opcoesRegra} value={form.tipo_regra} onChange={e => set('tipo_regra', e.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input label="Data início" type="date" value={form.data_inicio} onChange={e => set('data_inicio', e.target.value)} required />
            <Input label="Data fim" type="date" value={form.data_fim} onChange={e => set('data_fim', e.target.value)} required />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input label="Peso" type="number" min="0.1" step="0.1" value={form.peso} onChange={e => set('peso', e.target.value)} />
            <Input label="Dia limite lançamento" type="number" min="1" max="31" placeholder="Ex: 28" value={form.dia_limite_lancamento} onChange={e => set('dia_limite_lancamento', e.target.value)} />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5 flex flex-col gap-4">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Responsabilidades</h2>

          <Select label="Setor" options={opcoesSetores} value={form.setor_id} onChange={e => set('setor_id', e.target.value)} />
          <Select label="Responsável pela meta" options={opcoesUsuarios} value={form.responsavel_id} onChange={e => set('responsavel_id', e.target.value)} />
          <Select label="Responsável pelo lançamento" options={opcoesUsuarios} value={form.lancador_id} onChange={e => set('lancador_id', e.target.value)} />

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.global}
              onChange={e => set('global', e.target.checked)}
              className="w-4 h-4 accent-blue-600"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">Meta global (vale para todos os setores)</span>
          </label>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5">
          <RangeEditor ranges={ranges} onChange={setRanges} />
        </div>

        {erro && <p className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 rounded-lg px-3 py-2">{erro}</p>}

        <div className="flex gap-3">
          <Button type="submit" variante="primario" carregando={salvando}>
            {editando ? 'Salvar alterações' : 'Criar meta'}
          </Button>
          <Button type="button" variante="secundario" onClick={() => navigate('/metas')}>
            Cancelar
          </Button>
        </div>
      </form>
    </div>
  )
}