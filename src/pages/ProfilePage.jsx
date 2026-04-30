import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useResponsabilidades } from '../hooks/useResponsabilidades'

const PAPEL_BADGE_COLORS = {
  'A.C':     'bg-amber-500 text-amber-950 border-amber-600',
  'T.I':     'bg-cyan-500 text-cyan-950 border-cyan-600',
  'R.A':     'bg-purple-500 text-purple-950 border-purple-600',
  'R.M':     'bg-blue-500 text-blue-950 border-blue-600',
  'L.M':     'bg-green-500 text-green-950 border-green-600',
  'Usuário': 'bg-slate-500 text-slate-950 border-slate-600',
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



  // Formulário de alteração de senha
  const [cpfConfirm, setCpfConfirm]         = useState('')
  const [novaSenha, setNovaSenha]           = useState('')
  const [confirmarSenha, setConfirmarSenha] = useState('')
  const [mostrarNova, setMostrarNova]               = useState(false)
  const [mostrarConfirmar, setMostrarConfirmar]     = useState(false)
  const [editandoNome, setEditandoNome] = useState(false)
  const [novoNome, setNovoNome]           = useState(nome)
  const [loadingNome, setLoadingNome]     = useState(false)

  // Sincroniza o estado local se o nome no metadata mudar (ex: via props)
  useEffect(() => {
    setNovoNome(nome)
  }, [nome])

  const [loading, setLoading]   = useState(false)
  const [erro, setErro]         = useState('')
  const [sucesso, setSucesso]   = useState(false)

  const [sucessoNome, setSucessoNome] = useState(false)

  async function handleSalvarNome() {
    if (!novoNome.trim()) return
    setLoadingNome(true)
    setErro('')
    try {
      // Atualiza na tabela `usuarios` (banco de dados)
      const { error: dbError } = await supabase.from('usuarios').update({ nome: novoNome }).eq('id', userId)
      if (dbError) throw new Error('Não foi possível atualizar o banco de dados. Verifique suas permissões.')

      // Atualiza o metadata localmente usando "nome" (para o app) e "name" (para aparecer no painel do Supabase)
      await supabase.auth.updateUser({ data: { nome: novoNome, name: novoNome, display_name: novoNome } })
      
      setEditandoNome(false)
      setSucessoNome(true)
      setTimeout(() => setSucessoNome(false), 3000)
    } catch (e) {
      setErro(e.message)
    } finally {
      setLoadingNome(false)
    }
  }

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
      <div className="max-w-5xl mx-auto px-6 py-8 flex flex-col gap-6">

        {/* Header */}
        <div className="border-b border-white/8 pb-4">
          <h1 className="text-xl font-semibold text-white tracking-tight">Meu Perfil</h1>
          <p className="text-sm text-slate-500 mt-0.5">Gerencie suas informações e credenciais</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
          {/* Informações da conta */}
          <div className="card p-6 flex flex-col gap-5 shadow-xl shadow-black/20 border-white/5 bg-gradient-to-b from-white/[0.02] to-transparent">
            <p className="text-[10px] text-slate-500 uppercase tracking-wider font-mono">Informações da conta</p>

          <div className="flex flex-col gap-4">
            {/* Nome */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <p className="label">Nome</p>
                {!editandoNome ? (
                  <button
                    onClick={() => setEditandoNome(true)}
                    className="btn flex items-center gap-1.5 px-2 py-1 text-xs"
                  >
                    <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                    Editar
                  </button>
                ) : (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setEditandoNome(false)}
                      className="btn px-2 py-1 text-xs"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={handleSalvarNome}
                      disabled={loadingNome}
                      className="btn-primary px-3 py-1 text-xs disabled:opacity-50"
                    >
                      {loadingNome ? 'Salvando...' : 'Salvar'}
                    </button>
                  </div>
                )}
              </div>
              
              {editandoNome ? (
                <input
                  autoFocus
                  className="input py-1.5 text-sm"
                  value={novoNome}
                  onChange={e => setNovoNome(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSalvarNome()}
                />
              ) : (
                <div className="flex items-center gap-2">
                  <p className="text-sm text-slate-200 font-medium">{novoNome}</p>
                  {sucessoNome && (
                    <span className="text-[10px] text-green-400 bg-green-500/10 px-1.5 py-0.5 rounded border border-green-500/20 flex items-center gap-1 animate-in fade-in zoom-in slide-in-from-left-2 duration-300 ease-out">
                      <svg viewBox="0 0 24 24" className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                      Atualizado
                    </span>
                  )}
                </div>
              )}
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

          </div>
        </div>

        {/* Alterar senha */}
        <div className="card p-6 flex flex-col gap-5 shadow-xl shadow-black/20 border-white/5 bg-gradient-to-b from-white/[0.02] to-transparent">
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
    </div>
  )
}
