import { useState } from 'react'
import Modal from '../shared/Modal'

const PAPEIS = ['R.A', 'R.M', 'L.M']

export default function AtribuicaoModal({ usuarios, setores, onSalvar, onClose }) {
  const [form, setForm] = useState({ user_id: '', setor_id: '', papel: '' })
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState(null)

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.user_id || !form.setor_id || !form.papel) {
      setErro('Preencha todos os campos.')
      return
    }
    setSalvando(true)
    setErro(null)
    try {
      await onSalvar(form)
      onClose()
    } catch (err) {
      setErro(err.message)
    } finally {
      setSalvando(false)
    }
  }

  return (
    <Modal title="Nova Atribuição de Responsabilidade" onClose={onClose} size="md">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">

        <div>
          <label className="label">Usuário</label>
          <select
            name="user_id"
            value={form.user_id}
            onChange={handleChange}
            className="input"
          >
            <option value="">Selecione um usuário...</option>
            {usuarios.map(u => (
              <option key={u.id} value={u.id}>
                {u.nome} ({u.email})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="label">Setor</label>
          <select
            name="setor_id"
            value={form.setor_id}
            onChange={handleChange}
            className="input"
          >
            <option value="">Selecione um setor...</option>
            {setores.map(s => (
              <option key={s.id} value={s.id}>
                {s.nome}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="label">Papel</label>
          <select
            name="papel"
            value={form.papel}
            onChange={handleChange}
            className="input"
          >
            <option value="">Selecione um papel...</option>
            {PAPEIS.map(p => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>

        {erro && (
          <p className="text-xs text-red-400 bg-red-900/20 border border-red-500/20 rounded px-3 py-2">
            {erro}
          </p>
        )}

        <div className="flex justify-end gap-2 pt-1">
          <button type="button" onClick={onClose} className="btn">
            Cancelar
          </button>
          <button type="submit" disabled={salvando} className="btn-primary">
            {salvando ? 'Salvando...' : 'Atribuir'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
