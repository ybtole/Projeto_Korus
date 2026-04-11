import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function LoginPage() {
  const [cpf, setCpf] = useState('')
  const [senha, setSenha] = useState('')
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState('')

  // CPF format: numbers only → email: 00000000000@aguia.com
  const formatCpf = (v) => {
    const nums = v.replace(/\D/g, '').slice(0, 11)
    return nums
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})$/, '$1-$2')
  }

  const cpfToEmail = (cpf) => cpf.replace(/\D/g, '') + '@aguia.com'

  async function handleLogin(e) {
    e.preventDefault()
    setLoading(true)
    setErro('')
    const email = cpfToEmail(cpf)
    const { error } = await supabase.auth.signInWithPassword({ email, password: senha })
    if (error) setErro('CPF ou senha inválidos.')
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-brand-900 flex items-center justify-center p-4">
      {/* Background grid */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: 'linear-gradient(#2a6099 1px, transparent 1px), linear-gradient(90deg, #2a6099 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />

      <div className="relative w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-brand-500/20 border border-brand-500/30 mb-4">
            <svg viewBox="0 0 24 24" className="w-7 h-7 text-accent" fill="currentColor">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <h1 className="text-2xl font-semibold text-white tracking-tight">PCM Águia</h1>
          <p className="text-slate-400 text-sm mt-1">Sistema de Gestão de Metas — PPR</p>
        </div>

        <form onSubmit={handleLogin} className="card p-6 flex flex-col gap-4">
          <div>
            <label className="label">CPF</label>
            <input
              className="input font-mono"
              placeholder="000.000.000-00"
              value={cpf}
              onChange={e => setCpf(formatCpf(e.target.value))}
              required
            />
          </div>
          <div>
            <label className="label">Senha</label>
            <input
              className="input"
              type="password"
              placeholder="••••••••"
              value={senha}
              onChange={e => setSenha(e.target.value)}
              required
            />
          </div>

          {erro && (
            <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded px-3 py-2">
              {erro}
            </p>
          )}

          <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-2.5 mt-1">
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border border-white/40 border-t-white rounded-full animate-spin" />
                Entrando...
              </span>
            ) : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  )
}
