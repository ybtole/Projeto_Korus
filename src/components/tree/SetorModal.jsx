import { useState } from 'react'
import Modal from '../shared/Modal'

const TIPOS = ['CORPORATIVO', 'DIVISÃO', 'SETOR', 'EQUIPE', 'CÉLULA']

export default function SetorModal({ modo, setor, parentNome, onSave, onClose }) {
  const [nome, setNome] = useState(setor?.nome ?? '')
  const [tipo, setTipo] = useState(setor?.tipo ?? 'SETOR')
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState('')

  const isEdit = modo === 'editar'
  const title = isEdit
    ? `Editar — ${setor.nome}`
    : parentNome
      ? `Novo subsetor de "${parentNome}"`
      : 'Novo setor raiz'

  async function handle(e) {
    e.preventDefault()
    if (!nome.trim()) return setErro('Informe o nome.')
    setLoading(true)
    setErro('')
    try {
      await onSave({ nome: nome.trim(), tipo })
      onClose()
    } catch (err) {
      setErro(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal title={title} onClose={onClose}>
      <form onSubmit={handle} className="flex flex-col gap-4">
        <div>
          <label className="label">Nome</label>
          <input
            className="input"
            value={nome}
            onChange={e => setNome(e.target.value)}
            placeholder="Ex: Colheita Sul"
            autoFocus
          />
        </div>

        <div>
          <label className="label">Tipo</label>
          <select
            className="input"
            value={tipo}
            onChange={e => setTipo(e.target.value)}
          >
            {TIPOS.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>

        {erro && <p className="text-red-400 text-sm">{erro}</p>}

        <div className="flex gap-2 justify-end pt-1">
          <button type="button" onClick={onClose} className="btn">Cancelar</button>
          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? 'Salvando...' : isEdit ? 'Salvar' : 'Criar'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
