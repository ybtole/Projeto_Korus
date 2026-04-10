import { useState } from 'react'
import { Mail, X } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import Button from './Button'
import Input from './Input'

export default function EmailPopup() {
  const { mostrarPopupEmail, setMostrarPopupEmail, salvarEmail } = useAuth()
  const [email, setEmail] = useState('')
  const [salvando, setSalvando] = useState(false)

  if (!mostrarPopupEmail) return null

  async function handleSalvar() {
    if (!email || !email.includes('@')) return
    setSalvando(true)
    try {
      await salvarEmail(email)
    } finally {
      setSalvando(false)
    }
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 w-80 bg-white dark:bg-gray-900 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 p-4">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <Mail size={16} className="text-blue-600" />
          <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">Notificações por email</span>
        </div>
        <button onClick={() => setMostrarPopupEmail(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
          <X size={16} />
        </button>
      </div>
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
        Deseja receber alertas de metas e aprovações por email?
      </p>
      <Input
        type="email"
        placeholder="seu@email.com"
        value={email}
        onChange={e => setEmail(e.target.value)}
      />
      <div className="flex gap-2 mt-3">
        <Button variante="primario" tamanho="sm" onClick={handleSalvar} carregando={salvando} className="flex-1">
          Salvar
        </Button>
        <Button variante="fantasma" tamanho="sm" onClick={() => setMostrarPopupEmail(false)}>
          Agora não
        </Button>
      </div>
    </div>
  )
}