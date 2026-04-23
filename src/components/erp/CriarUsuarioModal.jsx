import { useState } from 'react'
import Modal from '../shared/Modal'

const PAPEIS = ['A.C', 'T.I', 'R.A', 'R.M', 'L.M', 'Usuário']

const PAPEL_LABELS = {
  'A.C': 'Analista de Custos',
  'T.I': 'Tecnologia da Informação',
  'R.A': 'Responsável de Aprovação',
  'R.M': 'Responsável de Meta',
  'L.M': 'Lançador de Meta',
  'Usuário': 'Usuário Padrão',
}

function formatCPF(value) {
  const digits = value.replace(/\D/g, '').slice(0, 11)
  return digits
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2')
}

export default function CriarUsuarioModal({ onSalvar, onClose }) {
  const [form, setForm] = useState({ cpf: '', nome: '', papel: '' })
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState(null)
  const [sucesso, setSucesso] = useState(null)

  const cpfLimpo = form.cpf.replace(/\D/g, '')

  const handleCPF = (e) => {
    setForm(prev => ({ ...prev, cpf: formatCPF(e.target.value) }))
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setErro(null)
    setSucesso(null)

    if (cpfLimpo.length !== 11) {
      setErro('CPF inválido. Informe os 11 dígitos.')
      return
    }
    if (!form.papel) {
      setErro('Selecione um cargo.')
      return
    }

    setSalvando(true)
    try {
      await onSalvar({ cpf: form.cpf, nome: form.nome || null, papel: form.papel })
      setSucesso(`Usuário criado! Login: ${cpfLimpo}@aguia.com · Senha: ${cpfLimpo}`)
      setForm({ cpf: '', nome: '', papel: '' })
    } catch (err) {
      setErro(err.message)
    } finally {
      setSalvando(false)
    }
  }

  return (
    <Modal title="Criar Novo Usuário" onClose={onClose} size="md">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">

        {/* CPF */}
        <div>
          <label className="label">CPF <span className="text-slate-600 font-normal">(define o login e a senha)</span></label>
          <input
            type="text"
            name="cpf"
            value={form.cpf}
            onChange={handleCPF}
            placeholder="000.000.000-00"
            className="input font-mono"
            autoComplete="off"
            inputMode="numeric"
          />
          {cpfLimpo.length === 11 && (
            <p className="text-[10px] text-slate-500 font-mono mt-1">
              Login: <span className="text-slate-300">{cpfLimpo}@aguia.com</span>
              &nbsp;·&nbsp;Senha: <span className="text-slate-300">{cpfLimpo}</span>
            </p>
          )}
        </div>

        {/* Nome (opcional) */}
        <div>
          <label className="label">
            Nome <span className="text-slate-600 font-normal">(opcional)</span>
          </label>
          <input
            type="text"
            name="nome"
            value={form.nome}
            onChange={handleChange}
            placeholder="Nome completo do funcionário"
            className="input"
          />
        </div>

        {/* Cargo */}
        <div>
          <label className="label">Cargo</label>
          <select
            name="papel"
            value={form.papel}
            onChange={handleChange}
            className="input"
          >
            <option value="">Selecione um cargo...</option>
            {PAPEIS.map(p => (
              <option key={p} value={p}>{p} — {PAPEL_LABELS[p]}</option>
            ))}
          </select>
        </div>

        {/* Feedback */}
        {erro && (
          <p className="text-xs text-red-400 bg-red-900/20 border border-red-500/20 rounded px-3 py-2">
            {erro}
          </p>
        )}
        {sucesso && (
          <div className="text-xs text-green-400 bg-green-900/20 border border-green-500/20 rounded px-3 py-2 font-mono leading-relaxed">
            <span className="font-semibold text-green-300">✓ Criado com sucesso!</span><br />
            {sucesso}
          </div>
        )}

        <div className="flex justify-end gap-2 pt-1">
          <button type="button" onClick={onClose} className="btn">
            Fechar
          </button>
          <button type="submit" disabled={salvando} className="btn-primary">
            {salvando ? 'Criando...' : 'Criar Usuário'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
