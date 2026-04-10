import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import api from '../services/api'
import Input from '../components/ui/Input'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'

export default function Perfil() {
  const { usuario, salvarEmail } = useAuth()
  const [email, setEmail] = useState(usuario?.email || '')
  const [senhaAtual, setSenhaAtual] = useState('')
  const [novaSenha, setNovaSenha] = useState('')
  const [salvandoEmail, setSalvandoEmail] = useState(false)
  const [salvandoSenha, setSalvandoSenha] = useState(false)
  const [msgEmail, setMsgEmail] = useState('')
  const [msgSenha, setMsgSenha] = useState('')

  async function handleEmail(e) {
    e.preventDefault()
    setSalvandoEmail(true)
    setMsgEmail('')
    try {
      await salvarEmail(email)
      setMsgEmail('Email atualizado com sucesso.')
    } catch {
      setMsgEmail('Erro ao salvar email.')
    } finally {
      setSalvandoEmail(false)
    }
  }

  async function handleSenha(e) {
    e.preventDefault()
    setSalvandoSenha(true)
    setMsgSenha('')
    try {
      await api.put('/usuarios/senha', { senha_atual: senhaAtual, nova_senha: novaSenha })
      setMsgSenha('Senha alterada com sucesso.')
      setSenhaAtual('')
      setNovaSenha('')
    } catch (err) {
      setMsgSenha(err.response?.data?.erro || 'Erro ao alterar senha.')
    } finally {
      setSalvandoSenha(false)
    }
  }

  return (
    <div className="max-w-lg">
      <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-6">Meu Perfil</h1>

      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5 mb-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center text-white text-lg font-bold">
            {usuario?.nome?.[0]?.toUpperCase()}
          </div>
          <div>
            <p className="font-semibold text-gray-900 dark:text-gray-100">{usuario?.nome}</p>
            <Badge tipo={usuario?.role} />
          </div>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400">CPF: {usuario?.cpf?.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')}</p>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5 mb-4">
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Notificações por email</h2>
        <form onSubmit={handleEmail} className="flex flex-col gap-3">
          <Input label="Email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="seu@email.com" />
          {msgEmail && <p className="text-xs text-green-600">{msgEmail}</p>}
          <Button type="submit" variante="primario" tamanho="sm" carregando={salvandoEmail}>Salvar email</Button>
        </form>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5">
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Alterar senha</h2>
        <form onSubmit={handleSenha} className="flex flex-col gap-3">
          <Input label="Senha atual" type="password" value={senhaAtual} onChange={e => setSenhaAtual(e.target.value)} />
          <Input label="Nova senha" type="password" value={novaSenha} onChange={e => setNovaSenha(e.target.value)} />
          {msgSenha && <p className="text-xs text-green-600">{msgSenha}</p>}
          <Button type="submit" variante="primario" tamanho="sm" carregando={salvandoSenha}>Alterar senha</Button>
        </form>
      </div>
    </div>
  )
}