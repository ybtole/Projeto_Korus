import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Upload, X, FileText } from 'lucide-react'
import api from '../services/api'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import Select from '../components/ui/Select'

export default function LancamentoForm() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const [form, setForm] = useState({
    meta_id: searchParams.get('meta_id') || '',
    valor: '',
    mes_referencia: '',
    observacao: '',
  })
  const [arquivos, setArquivos] = useState([])
  const [metas, setMetas] = useState([])
  const [preview, setPreview] = useState(null)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')

  useEffect(() => {
    api.get('/metas').then(r => setMetas(r.data))
  }, [])

  function set(campo, valor) {
    setForm(f => ({ ...f, [campo]: valor }))
  }

  function handleArquivos(e) {
    const novos = Array.from(e.target.files)
    setArquivos(a => [...a, ...novos])
  }

  function removerArquivo(idx) {
    setArquivos(a => a.filter((_, i) => i !== idx))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setErro('')
    setSalvando(true)
    try {
      const res = await api.post('/lancamentos', form)
      const lancamentoId = res.data.id

      // Upload de anexos
      for (const arquivo of arquivos) {
        const fd = new FormData()
        fd.append('arquivo', arquivo)
        await api.post(`/lancamentos/${lancamentoId}/anexos`, fd, {
          headers: { 'Content-Type': 'multipart/form-data' }
        })
      }

      navigate('/lancamentos')
    } catch (err) {
      setErro(err.response?.data?.erro || 'Erro ao registrar lançamento')
    } finally {
      setSalvando(false)
    }
  }

  const opcoesMetas = [{ value: '', label: 'Selecione a meta...' }, ...metas.map(m => ({ value: m.id, label: `${m.nome} — ${m.setor_nome || ''}` }))]

  return (
    <div className="max-w-xl">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Novo Lançamento</h1>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5 flex flex-col gap-4">
          <Select label="Meta" options={opcoesMetas} value={form.meta_id} onChange={e => set('meta_id', e.target.value)} />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Valor apurado" type="number" step="any" placeholder="Ex: 10" value={form.valor} onChange={e => set('valor', e.target.value)} required />
            <Input label="Mês de referência" type="month" value={form.mes_referencia} onChange={e => set('mes_referencia', e.target.value)} required />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Observação</label>
            <textarea
              rows={2}
              value={form.observacao}
              onChange={e => set('observacao', e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>
        </div>

        {/* Upload de comprovantes */}
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Comprovantes</h2>

          <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 cursor-pointer hover:border-blue-400 hover:bg-blue-50/50 dark:hover:bg-blue-900/10 transition-colors">
            <Upload size={20} className="text-gray-400" />
            <span className="text-sm text-gray-500">Clique para selecionar ou arraste arquivos</span>
            <span className="text-xs text-gray-400">PDF, imagem ou planilha — máx. 10MB cada</span>
            <input type="file" multiple accept=".pdf,.jpg,.jpeg,.png,.xlsx,.xls,.csv" onChange={handleArquivos} className="hidden" />
          </label>

          {arquivos.length > 0 && (
            <div className="mt-3 flex flex-col gap-2">
              {arquivos.map((f, i) => (
                <div key={i} className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-800 rounded-lg px-3 py-2">
                  <FileText size={14} className="text-gray-400 flex-shrink-0" />
                  <span className="truncate flex-1">{f.name}</span>
                  <button type="button" onClick={() => removerArquivo(i)} className="text-gray-400 hover:text-red-500 transition-colors">
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {erro && <p className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 rounded-lg px-3 py-2">{erro}</p>}

        <div className="flex gap-3">
          <Button type="submit" variante="primario" carregando={salvando}>Registrar lançamento</Button>
          <Button type="button" variante="secundario" onClick={() => navigate('/lancamentos')}>Cancelar</Button>
        </div>
      </form>
    </div>
  )
}