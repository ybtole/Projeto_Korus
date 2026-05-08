import { useState, useEffect } from 'react'
import Modal from '../shared/Modal'
import { supabase } from '../../lib/supabase'

const STATUS_LABELS = {
  PENDENTE: 'Pendente',
  EM_ANDAMENTO: 'Em andamento',
  AGUARDANDO_APROVACAO: 'Aguard. aprovação',
  APROVADO: 'Aprovado',
  REPROVADO: 'Reprovado',
}

export default function CardModal({ lancamento, onClose, onSave, perfilCtx }) {
  const { isAC = false, isMaster = false, isLM = false } = perfilCtx ?? {}
  const meta = lancamento.metas
  const [valor, setValor] = useState(lancamento.valor ?? '')
  const [obs, setObs] = useState(lancamento.observacoes ?? '')
  const [status, setStatus] = useState(lancamento.status)
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState('')
  const [uploading, setUploading] = useState(false)
  const [uploadMsg, setUploadMsg] = useState('')
  const [arquivos, setArquivos] = useState([])

  const isReviewMode = isAC && !isMaster && lancamento.status === 'AGUARDANDO_APROVACAO'
  const isLMMode = isLM && lancamento.status === 'EM_ANDAMENTO'

  useEffect(() => {
    supabase.storage
      .from('comprovantes')
      .list(`lancamentos/${lancamento.id}`)
      .then(({ data }) => setArquivos(data ?? []))
  }, [lancamento.id])

  const temValor = String(valor ?? '').trim() !== ''
  const temAnexosEObs = arquivos.length > 0 && obs.trim() !== ''

  async function handleSave() {
    if (isLMMode && !temValor && !temAnexosEObs) {
      setErro('Informe o valor atingido ou anexe comprovantes com observações.')
      return
    }
    setLoading(true)
    setErro('')
    try {
      const novoStatus = isLMMode ? 'AGUARDANDO_APROVACAO' : status
      await onSave(lancamento.id, { valor, observacoes: obs, status: novoStatus })
      onClose()
    } catch (e) {
      setErro(e.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleAprovar() {
    setLoading(true)
    setErro('')
    try {
      await onSave(lancamento.id, { status: 'APROVADO' })
      onClose()
    } catch (e) {
      setErro(e.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleReprovar() {
    setLoading(true)
    setErro('')
    try {
      await onSave(lancamento.id, { status: 'REPROVADO' })
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
    if (error) {
      setUploadMsg('Erro ao enviar arquivo.')
    } else {
      setUploadMsg(`Arquivo "${file.name}" enviado.`)
      const { data } = await supabase.storage.from('comprovantes').list(`lancamentos/${lancamento.id}`)
      setArquivos(data ?? [])
    }
    setUploading(false)
  }

  return (
    <Modal title={isReviewMode ? 'Revisão de Lançamento' : 'Detalhes do Lançamento'} onClose={onClose} size="lg">
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
        <div>
          <p className="label">Status atual</p>
          <p className="text-sm text-slate-200">{STATUS_LABELS[lancamento.status] ?? lancamento.status}</p>
        </div>
      </div>

      <div className="border-t border-white/8 pt-4 flex flex-col gap-3">
        {isReviewMode ? (
          <>
            <div>
              <p className="label">Valor lançado {meta?.unidade ? `(${meta.unidade})` : ''}</p>
              <p className="text-sm text-slate-200 font-mono">{temValor ? valor : '—'}</p>
            </div>
            <div>
              <p className="label">Observações</p>
              <p className="text-sm text-slate-300 whitespace-pre-wrap min-h-[2rem]">{obs || '—'}</p>
            </div>
            <div>
              <p className="label">Comprovantes anexados</p>
              {arquivos.length > 0 ? (
                <ul className="flex flex-col gap-1 mt-1">
                  {arquivos.map(f => (
                    <li key={f.name} className="text-xs text-blue-400 font-mono">{f.name}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-slate-500 italic mt-1">Nenhum comprovante anexado.</p>
              )}
            </div>
          </>
        ) : (
          <>
            <div className={`grid gap-3 ${isMaster ? 'grid-cols-2' : 'grid-cols-1'}`}>
              <div>
                <label className="label">Valor lançado {meta?.unidade ? `(${meta.unidade})` : ''}</label>
                <input
                  className="input"
                  value={valor}
                  onChange={e => setValor(e.target.value)}
                  placeholder="Ex: 12400"
                />
              </div>
              {isMaster && (
                <div>
                  <label className="label">Status</label>
                  <select className="input" value={status} onChange={e => setStatus(e.target.value)}>
                    {Object.entries(STATUS_LABELS).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>
                </div>
              )}
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

            <div>
              <label className="label">Comprovante (Storage)</label>
              <div className="flex items-center gap-3">
                <label className="btn cursor-pointer text-xs">
                  {uploading ? 'Enviando...' : '↑ Anexar arquivo'}
                  <input type="file" className="hidden" onChange={handleUpload} disabled={uploading} />
                </label>
                {uploadMsg && <span className="text-xs text-green-400">{uploadMsg}</span>}
              </div>
              {arquivos.length > 0 && (
                <ul className="flex flex-col gap-1 mt-2">
                  {arquivos.map(f => (
                    <li key={f.name} className="text-xs text-slate-400 font-mono">{f.name}</li>
                  ))}
                </ul>
              )}
            </div>
          </>
        )}
      </div>

      {erro && <p className="text-red-400 text-sm mt-2">{erro}</p>}

      <div className="flex gap-2 justify-end mt-4 pt-3 border-t border-white/8">
        <button onClick={onClose} className="btn">Cancelar</button>
        {isReviewMode ? (
          <>
            <button
              onClick={handleReprovar}
              disabled={loading}
              className="btn bg-red-900/30 text-red-400 border-red-500/30 hover:bg-red-900/50"
            >
              {loading ? '...' : 'Reprovar'}
            </button>
            <button
              onClick={handleAprovar}
              disabled={loading}
              className="btn-primary"
            >
              {loading ? '...' : 'Aprovar'}
            </button>
          </>
        ) : (
          <button onClick={handleSave} disabled={loading} className="btn-primary">
            {loading ? 'Salvando...' : isLMMode ? 'Enviar para aprovação' : 'Salvar alterações'}
          </button>
        )}
      </div>
    </Modal>
  )
}
