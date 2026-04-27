import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useResponsabilidades } from '../hooks/useResponsabilidades'

const PAPEL_BADGE_COLORS = {
  'A.C':     'bg-amber-900/50 text-amber-300 border-amber-500/30',
  'T.I':     'bg-cyan-900/50 text-cyan-300 border-cyan-500/30',
  'R.A':     'bg-purple-900/50 text-purple-300 border-purple-500/30',
  'R.M':     'bg-blue-900/50 text-blue-300 border-blue-500/30',
  'L.M':     'bg-green-900/50 text-green-300 border-green-500/30',
  'Usuário': 'bg-slate-800 text-slate-400 border-white/10',
}

function formatCpf(nums) {
  const n = (nums ?? '').replace(/\D/g, '').slice(0, 11)
  return n
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2')
}

function EyeIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
  )
}

function EyeOffIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94"/>
      <path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19"/>
      <line x1="1" y1="1" x2="23" y2="23"/>
    </svg>
  )
}

export default function ProfilePage({ session }) {
  const cpfLimpo = session.user.email?.replace('@aguia.com', '') ?? ''
  const nome = session.user.user_metadata?.nome ?? formatCpf(cpfLimpo)
  const papel = session.user.user_metadata?.papel ?? 'Usuário'
  const senhaTrocada = !!session.user.user_metadata?.senha_trocada

  const { responsabilidades, metasLm, loading: loadingResp } = useResponsabilidades()

  const userId = session.user.id
  const papeisAdicionais = new Set()
  const minhaListaAtribuicoes = []

  responsabilidades?.forEach(r => {
    if (r.user_id === userId || r.usuarios?.id === userId) {
      papeisAdicionais.add(r.papel)
      minhaListaAtribuicoes.push({ id: r.id, papel: r.papel, desc: r.setores?.nome ?? '—' })
    }
  })
  metasLm?.forEach(m => {
    if (m.perfil_id === userId) {
      papeisAdicionais.add('L.M')
      minhaListaAtribuicoes.push({ id: m.id, papel: 'L.M', desc: `Meta: ${m.metas?.nome ?? '—'}` })
    }
  })
  papeisAdicionais.delete(papel)

  // Exibição da senha atual
  const [mostrarSenhaAtual, setMostrarSenhaAtual] = useState(false)

  // Formulário de alteração de senha
  const [cpfConfirm, setCpfConfirm]         = useState('')
  const [novaSenha, setNovaSenha]           = useState('')
  const [confirmarSenha, setConfirmarSenha] = useState('')
  const [mostrarNova, setMostrarNova]               = useState(false)
  const [mostrarConfirmar, setMostrarConfirmar]     = useState(false)
  const [loading, setLoading]   = useState(false)
  const [erro, setErro]         = useState('')
  const [sucesso, setSucesso]   = useState(false)

  async function handleAlterarSenha(e) {
    e.preventDefault()
    setErro('')
    setSucesso(false)

    if (cpfConfirm.replace(/\D/g, '') !== cpfLimpo) {
      setErro('CPF de confirmação não corresponde ao seu cadastro.')
      return
    }
    if (novaSenha.length < 6) {
      setErro('A nova senha deve ter pelo menos 6 caracteres.')
      return
    }
    if (novaSenha !== confirmarSenha) {
      setErro('As senhas não coincidem.')
      return
    }

    setLoading(true)
    const { error } = await supabase.auth.updateUser({
      password: novaSenha,
      data: { senha_trocada: true },
    })

    if (error) {
      setErro('Erro ao atualizar a senha. Tente novamente.')
    } else {
      setSucesso(true)
      setCpfConfirm('')
      setNovaSenha('')
      setConfirmarSenha('')
    }
    setLoading(false)
  }

  return (
    <div className="h-full overflow-auto">
      <div className="max-w-lg mx-auto px-6 py-8 flex flex-col gap-6">

        {/* Header */}
        <div className="border-b border-white/8 pb-4">
          <h1 className="text-base font-semibold text-white">Meu Perfil</h1>
          <p className="text-xs text-slate-500 mt-0.5">Informações da sua conta</p>
        </div>

        {/* Informações da conta */}
        <div className="card p-6 flex flex-col gap-5">
          <p className="text-[10px] text-slate-500 uppercase tracking-wider font-mono">Informações da conta</p>

          <div className="flex flex-col gap-4">
            {/* Nome */}
            <div>
              <p className="label mb-1">Nome</p>
              <p className="text-sm text-slate-200 font-medium">{nome}</p>
            </div>

            {/* CPF */}
            <div>
              <p className="label mb-1">CPF</p>
              <p className="text-sm text-slate-200 font-mono">{formatCpf(cpfLimpo)}</p>
            </div>

            {/* Responsabilidades */}
            <div>
              <p className="label mb-1">Cargos e Responsabilidades</p>
              <div className="flex flex-wrap gap-1">
                <span className={`text-[11px] font-mono px-2 py-0.5 rounded border ${PAPEL_BADGE_COLORS[papel] ?? PAPEL_BADGE_COLORS['Usuário']}`}>
                  {papel}
                </span>
                {Array.from(papeisAdicionais).map(p => (
                  <span key={p} className={`text-[11px] font-mono px-2 py-0.5 rounded border ${PAPEL_BADGE_COLORS[p] ?? PAPEL_BADGE_COLORS['Usuário']}`}>
                    {p}
                  </span>
                ))}
              </div>

              <div className="mt-3">
                {loadingResp ? (
                  <div className="text-xs text-slate-500 flex items-center gap-2">
                    <div className="w-3 h-3 border border-brand-500 border-t-transparent rounded-full animate-spin" />
                    Carregando vínculos...
                  </div>
                ) : minhaListaAtribuicoes.length > 0 ? (
                  <div className="flex flex-col gap-1.5">
                    {minhaListaAtribuicoes.map((r, i) => (
                      <div key={i} className="flex items-center gap-2 px-3 py-2 rounded border border-white/5 bg-white/5">
                        <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded border flex-shrink-0 ${PAPEL_BADGE_COLORS[r.papel] ?? PAPEL_BADGE_COLORS['Usuário']}`}>
                          {r.papel}
                        </span>
                        <span className="text-xs text-slate-300">{r.desc}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-600 italic">Nenhum vínculo adicional de setor ou meta.</p>
                )}
              </div>
            </div>

            {/* Senha atual */}
            <div>
              <p className="label mb-1">Senha atual</p>
              <div className="relative">
                <input
                  readOnly
                  className="input pr-10 font-mono text-slate-300"
                  type={mostrarSenhaAtual && !senhaTrocada ? 'text' : 'password'}
                  value={senhaTrocada ? '' : formatCpf(cpfLimpo)}
                  placeholder={senhaTrocada ? 'Senha personalizada' : undefined}
                  disabled={senhaTrocada}
                />
                {!senhaTrocada && (
                  <button
                    type="button"
                    onClick={() => setMostrarSenhaAtual(v => !v)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 p-1"
                    tabIndex={-1}
                  >
                    {mostrarSenhaAtual ? <EyeOffIcon /> : <EyeIcon />}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Alterar senha */}
        <div className="card p-6 flex flex-col gap-5">
          <p className="text-[10px] text-slate-500 uppercase tracking-wider font-mono">Alterar senha</p>

          {sucesso && (
            <div className="bg-green-500/10 border border-green-500/20 rounded px-3 py-2 text-green-400 text-sm">
              Senha atualizada com sucesso.
            </div>
          )}

          <form onSubmit={handleAlterarSenha} className="flex flex-col gap-4">

            {/* Confirmar CPF */}
            <div>
              <label className="label">Confirme seu CPF</label>
              <input
                className="input font-mono"
                placeholder="000.000.000-00"
                value={cpfConfirm}
                onChange={e => setCpfConfirm(formatCpf(e.target.value))}
                required
              />
            </div>

            {/* Nova senha */}
            <div>
              <label className="label">Nova senha</label>
              <div className="relative">
                <input
                  className="input pr-10"
                  type={mostrarNova ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={novaSenha}
                  onChange={e => setNovaSenha(e.target.value)}
                  required
                />
                <button
                  type="button"
                  onClick={() => setMostrarNova(v => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 p-1"
                  tabIndex={-1}
                >
                  {mostrarNova ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              </div>
            </div>

            {/* Confirmar nova senha */}
            <div>
              <label className="label">Confirmar nova senha</label>
              <div className="relative">
                <input
                  className="input pr-10"
                  type={mostrarConfirmar ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={confirmarSenha}
                  onChange={e => setConfirmarSenha(e.target.value)}
                  required
                />
                <button
                  type="button"
                  onClick={() => setMostrarConfirmar(v => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 p-1"
                  tabIndex={-1}
                >
                  {mostrarConfirmar ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              </div>
            </div>

            {erro && (
              <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded px-3 py-2">
                {erro}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full justify-center py-2.5"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border border-white/40 border-t-white rounded-full animate-spin" />
                  Atualizando...
                </span>
              ) : 'Atualizar senha'}
            </button>
          </form>
        </div>

      </div>
    </div>
  )
}
