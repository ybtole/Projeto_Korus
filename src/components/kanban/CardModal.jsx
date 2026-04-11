import { useState } from 'react'
import Modal from '../shared/Modal'
import { supabase } from '../../lib/supabase'

const STATUSES = [
  'PENDENTE',
  'EM_ANDAMENTO',
  'AGUARDANDO_APROVACAO',
  'APROVADO',
  'REPROVADO',
]

const STATUS_LABELS = {
  PENDENTE: 'Pendente',
  EM_ANDAMENTO: 'Em andamento',
  AGUARDANDO_APROVACAO: 'Aguard. aprovação',
  APROVADO: 'Aprovado',
  REPROVADO: 'Reprovado',
}

export default function CardModal({ lancamento, onClose, onSave }) {
  const meta = lancamento.metas
  const [valor, setValor] = useState(lancamento.valor ?? '')
  const [status, setStatus] = useState(lancamento.status)
  const [obs, setObs] = useState(lancamento.observacoes ?? '')
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState('')
  const [uploading, setUploading] = useState(false)
  const [uploadMsg, setUploadMsg] = useState('')

  async function handleSave() {
    setLoading(true)
    setErro('')
    try {
      await onSave(lancamento.id, { valor, status, observacoes: obs })
      onClose()
    } catch (e) {
      setErro(e.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleUpload(e) {
    const file = e.target.files[0]
    if (!file) return
    setUploading(true)
    setUploadMsg('')
    const path = `lancamentos/${lancamento.id}/${file.name}`
    const { error } = await supabase.storage.from('comprovantes').upload(path, file, { upsert: true })
    if (error) setUploadMsg('Erro ao enviar arquivo.')
    else setUploadMsg(`Arquivo "${file.name}" enviado.`)
    setUploading(false)
  }

  return (
    <Modal title="Detalhes do Lançamento" onClose={onClose} size="lg">
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <p className="label">Meta</p>
          <p className="text-sm text-slate-200 font-medium">{meta?.nome ?? `#${lancamento.meta_id}`}</p>
        </div>
        <div>
          <p className="label">Mês</p>
          <p className="text-sm text-slate-200 font-mono">{lancamento.mes_referencia}</p>
        </div>
        <div>
          <p className="label">Setor</p>
          <p className="text-sm text-slate-200">{meta?.setores?.nome ?? '—'}</p>
        </div>
        <div>
          <p className="label">Direção</p>
          <p className="text-sm">
            {meta?.direcao === 'MAXIMIZAR'
              ? <span className="text-green-400">↑ MAXIMIZAR</span>
              : <span className="text-red-400">↓ MINIMIZAR</span>}
          </p>
        </div>
        {meta?.peso != null && (
          <div>
            <p className="label">Peso</p>
            <p className="text-sm text-slate-200 font-mono">{meta.peso}%</p>
          </div>
        )}
        <div>
          <p className="label">Lançado por</p>
          <p className="text-sm text-slate-400 font-mono">{lancamento.criado_por ?? '—'}</p>
        </div>
      </div>

      <div className="border-t border-white/8 pt-4 flex flex-col gap-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Valor lançado {meta?.unidade ? `(${meta.unidade})` : ''}</label>
            <input
              className="input"
              value={valor}
              onChange={e => setValor(e.target.value)}
              placeholder="Ex: 12400"
            />
          </div>
          <div>
            <label className="label">Status</label>
            <select className="input" value={status} onChange={e => setStatus(e.target.value)}>
              {STATUSES.map(s => (
                <option key={s} value={s}>{STATUS_LABELS[s]}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="label">Observações</label>
          <textarea
            className="input resize-none h-20"
            value={obs}
            onChange={e => setObs(e.target.value)}
            placeholder="Adicionar observação..."
          />
        </div>

        {/* Upload comprovante */}
        <div>
          <label className="label">Comprovante (Storage)</label>
          <div className="flex items-center gap-3">
            <label className="btn cursor-pointer text-xs">
              {uploading ? 'Enviando...' : '↑ Anexar arquivo'}
              <input type="file" className="hidden" onChange={handleUpload} disabled={uploading} />
            </label>
            {uploadMsg && <span className="text-xs text-green-400">{uploadMsg}</span>}
          </div>
        </div>
      </div>

      {erro && <p className="text-red-400 text-sm mt-2">{erro}</p>}

      <div className="flex gap-2 justify-end mt-4 pt-3 border-t border-white/8">
        <button onClick={onClose} className="btn">Cancelar</button>
        <button onClick={handleSave} disabled={loading} className="btn-primary">
          {loading ? 'Salvando...' : 'Salvar alterações'}
        </button>
      </div>
    </Modal>
  )
}
