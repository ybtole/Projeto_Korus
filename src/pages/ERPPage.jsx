import { useState, useEffect, useRef, useCallback } from 'react'
import { useAdminUsuarios } from '../hooks/useAdminUsuarios'
import { useResponsabilidades } from '../hooks/useResponsabilidades'
import Modal from '../components/shared/Modal'

// ── Constantes ────────────────────────────────────────────────────────────────

const PAPEIS = ['A.C', 'T.I', 'R.A', 'R.M', 'L.M', 'Usuário']
const PAPEL_LABELS = {
  'A.C':     'Analista de Custos',
  'T.I':     'Tecnologia da Informação',
  'R.A':     'Responsável de Aprovação',
  'R.M':     'Responsável de Meta',
  'L.M':     'Lançador de Meta',
  'Usuário': 'Usuário Padrão',
  '—':       'Sem cargo',
}
const PAPEL_COLORS = {
  'A.C':    'bg-amber-900/50 text-amber-300 border-amber-500/30',
  'T.I':    'bg-cyan-900/50   text-cyan-300   border-cyan-500/30',
  'R.A':    'bg-purple-900/50 text-purple-300 border-purple-500/30',
  'R.M':    'bg-blue-900/50   text-blue-300   border-blue-500/30',
  'L.M':    'bg-green-900/50  text-green-300  border-green-500/30',
  'Usuário':'bg-slate-800     text-slate-400  border-white/10',
  '—':      'bg-slate-800     text-slate-500  border-white/8',
}

function formatCPF(value) {
  const d = value.replace(/\D/g, '').slice(0, 11)
  return d.replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})$/, '$1-$2')
}

// ── Acesso Negado ─────────────────────────────────────────────────────────────

function AcessoNegado() {
  return (
    <div className="flex-1 flex items-center justify-center p-8" style={{ minHeight: '60vh' }}>
      <div className="card p-8 max-w-sm w-full text-center">
        <div className="w-12 h-12 rounded-full bg-red-900/30 border border-red-500/20 flex items-center justify-center mx-auto mb-4">
          <svg viewBox="0 0 24 24" className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 9v4m0 4h.01"/><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
          </svg>
        </div>
        <h2 className="text-sm font-semibold text-white mb-1">Acesso Negado</h2>
        <p className="text-xs text-slate-400 leading-relaxed">
          Apenas <span className="font-mono text-slate-300">A.C</span> e{' '}
          <span className="font-mono text-slate-300">T.I</span> podem acessar o módulo ERP.
        </p>
      </div>
    </div>
  )
}

// ── Menu de Contexto ──────────────────────────────────────────────────────────

function ContextMenu({ x, y, usuario, papel, onEdit, onChangeRole, onResponsabilidades, onDelete, onClose }) {
  const isTI = papel === 'T.I'
  const menuRef = useRef(null)

  useEffect(() => {
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) onClose()
    }
    const escHandler = (e) => e.key === 'Escape' && onClose()
    document.addEventListener('mousedown', handler)
    document.addEventListener('keydown', escHandler)
    return () => {
      document.removeEventListener('mousedown', handler)
      document.removeEventListener('keydown', escHandler)
    }
  }, [onClose])

  // Ajustar posição para não sair da tela
  const style = {
    position: 'fixed',
    top: Math.min(y, window.innerHeight - 200),
    left: Math.min(x, window.innerWidth - 220),
    zIndex: 9999,
  }

  const cpf = usuario.email?.replace('@aguia.com', '') ?? usuario.email

  return (
    <div ref={menuRef} style={style}
      className="w-52 rounded-lg border border-white/10 shadow-2xl overflow-hidden"
      style={{ ...style, background: 'rgb(18 24 38)', backdropFilter: 'blur(12px)' }}
    >
      {/* Header do menu */}
      <div className="px-3 py-2.5 border-b border-white/8">
        <p className="text-[11px] font-mono text-slate-300 truncate">{cpf}</p>
        <span className={`inline-block mt-1 text-[10px] font-mono px-1.5 py-0.5 rounded border ${PAPEL_COLORS[usuario.papel] ?? PAPEL_COLORS['—']}`}>
          {usuario.papel}
        </span>
      </div>

      {/* Ações */}
      <div className="py-1">

        {/* Editar nome — apenas T.I */}
        {isTI && (
          <button onClick={() => { onEdit(usuario); onClose() }}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-slate-300 hover:bg-white/8 hover:text-white transition-colors text-left">
            <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
            Editar nome
          </button>
        )}

        {/* Mudar cargo — todos */}
        <button onClick={() => { onChangeRole(usuario); onClose() }}
          className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-slate-300 hover:bg-white/8 hover:text-white transition-colors text-left">
          <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>
          </svg>
          Mudar cargo
        </button>

        {/* Responsabilidades — apenas T.I */}
        {isTI && (
          <button onClick={() => { onResponsabilidades(usuario); onClose() }}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-slate-300 hover:bg-white/8 hover:text-white transition-colors text-left">
            <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
            </svg>
            Responsabilidades
          </button>
        )}

        {/* Remover — apenas T.I */}
        {isTI && (
          <>
            <div className="mx-2 my-1 h-px bg-white/8" />
            <button onClick={() => { onDelete(usuario); onClose() }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-red-400 hover:bg-red-900/20 hover:text-red-300 transition-colors text-left">
              <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/>
              </svg>
              Remover usuário
            </button>
          </>
        )}
      </div>
    </div>
  )
}

// ── Modal: Criar Usuário ──────────────────────────────────────────────────────

function CriarUsuarioModal({ onSalvar, onClose }) {
  const [form, setForm] = useState({ cpf: '', nome: '', papel: '' })
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState(null)
  const [sucesso, setSucesso] = useState(null)
  const cpfLimpo = form.cpf.replace(/\D/g, '')

  const handleCPF = (e) => setForm(p => ({ ...p, cpf: formatCPF(e.target.value) }))
  const handleChange = (e) => setForm(p => ({ ...p, [e.target.name]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault(); setErro(null); setSucesso(null)
    if (cpfLimpo.length !== 11) { setErro('CPF inválido. Informe os 11 dígitos.'); return }
    if (!form.papel) { setErro('Selecione um cargo.'); return }
    setSalvando(true)
    try {
      await onSalvar({ cpf: form.cpf, nome: form.nome || null, papel: form.papel })
      setSucesso(`Login: ${cpfLimpo}@aguia.com · Senha: ${cpfLimpo}`)
      setForm({ cpf: '', nome: '', papel: '' })
    } catch (err) { setErro(err.message) }
    finally { setSalvando(false) }
  }

  return (
    <Modal title="Criar Novo Usuário" onClose={onClose} size="md">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label className="label">CPF <span className="text-slate-600 font-normal">(define o login e a senha)</span></label>
          <input type="text" value={form.cpf} onChange={handleCPF} placeholder="000.000.000-00"
            className="input font-mono" autoComplete="off" inputMode="numeric" />
          {cpfLimpo.length === 11 && (
            <p className="text-[10px] text-slate-500 font-mono mt-1">
              Login: <span className="text-slate-300">{cpfLimpo}@aguia.com</span>
              &nbsp;·&nbsp;Senha: <span className="text-slate-300">{cpfLimpo}</span>
            </p>
          )}
        </div>
        <div>
          <label className="label">Nome <span className="text-slate-600 font-normal">(opcional)</span></label>
          <input type="text" name="nome" value={form.nome} onChange={handleChange}
            placeholder="Nome completo do funcionário" className="input" />
        </div>
        <div>
          <label className="label">Cargo</label>
          <select name="papel" value={form.papel} onChange={handleChange} className="input">
            <option value="">Selecione um cargo...</option>
            {PAPEIS.map(p => <option key={p} value={p}>{p} — {PAPEL_LABELS[p]}</option>)}
          </select>
        </div>
        {erro && <p className="text-xs text-red-400 bg-red-900/20 border border-red-500/20 rounded px-3 py-2">{erro}</p>}
        {sucesso && (
          <div className="text-xs text-green-400 bg-green-900/20 border border-green-500/20 rounded px-3 py-2 font-mono leading-relaxed">
            <span className="font-semibold text-green-300">✓ Criado com sucesso!</span><br />{sucesso}
          </div>
        )}
        <div className="flex justify-end gap-2 pt-1">
          <button type="button" onClick={onClose} className="btn">Fechar</button>
          <button type="submit" disabled={salvando} className="btn-primary">
            {salvando ? 'Criando...' : 'Criar Usuário'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

// ── Modal: Editar Nome ────────────────────────────────────────────────────────

function EditarNomeModal({ usuario, onSalvar, onClose }) {
  const cpf = usuario.email?.replace('@aguia.com', '') ?? ''
  const [nome, setNome] = useState(usuario.nome ?? '')
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault(); setErro(null); setSalvando(true)
    try { await onSalvar(usuario.id, nome); onClose() }
    catch (err) { setErro(err.message) }
    finally { setSalvando(false) }
  }

  return (
    <Modal title="Editar Nome" onClose={onClose} size="sm">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label className="label">CPF / Login</label>
          <p className="text-sm font-mono text-slate-300 bg-white/5 rounded px-3 py-2 border border-white/8">{cpf}</p>
        </div>
        <div>
          <label className="label">Nome</label>
          <input type="text" value={nome} onChange={e => setNome(e.target.value)}
            placeholder="Nome completo" className="input" autoFocus />
        </div>
        {erro && <p className="text-xs text-red-400 bg-red-900/20 border border-red-500/20 rounded px-3 py-2">{erro}</p>}
        <div className="flex justify-end gap-2 pt-1">
          <button type="button" onClick={onClose} className="btn">Cancelar</button>
          <button type="submit" disabled={salvando} className="btn-primary">
            {salvando ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

// ── Modal: Mudar Cargo ────────────────────────────────────────────────────────

function MudarCargoModal({ usuario, onSalvar, onClose }) {
  const cpf = usuario.email?.replace('@aguia.com', '') ?? ''
  const [papel, setPapel] = useState(usuario.papel ?? '')
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault(); setErro(null); setSalvando(true)
    try { await onSalvar(usuario.id, papel); onClose() }
    catch (err) { setErro(err.message) }
    finally { setSalvando(false) }
  }

  return (
    <Modal title="Mudar Cargo" onClose={onClose} size="sm">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label className="label">Usuário</label>
          <div className="flex items-center gap-2 bg-white/5 rounded px-3 py-2 border border-white/8">
            <span className="text-sm font-mono text-slate-300 flex-1 truncate">{cpf}</span>
            <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${PAPEL_COLORS[usuario.papel] ?? PAPEL_COLORS['—']}`}>
              {usuario.papel}
            </span>
          </div>
        </div>
        <div>
          <label className="label">Novo Cargo</label>
          <select value={papel} onChange={e => setPapel(e.target.value)} className="input">
            <option value="">Selecione...</option>
            {PAPEIS.map(p => <option key={p} value={p}>{p} — {PAPEL_LABELS[p]}</option>)}
          </select>
        </div>
        {erro && <p className="text-xs text-red-400 bg-red-900/20 border border-red-500/20 rounded px-3 py-2">{erro}</p>}
        <div className="flex justify-end gap-2 pt-1">
          <button type="button" onClick={onClose} className="btn">Cancelar</button>
          <button type="submit" disabled={salvando || !papel} className="btn-primary">
            {salvando ? 'Salvando...' : 'Aplicar'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

// ── Modal: Responsabilidades do Usuário ────────────────────────────────────────

function ResponsabilidadesModal({ usuario, onClose }) {
  const cpf = usuario.email?.replace('@aguia.com', '') ?? ''
  const { responsabilidades, setores, loading, adicionar, remover } = useResponsabilidades()
  const [form, setForm] = useState({ setor_id: '', papel: '' })
  const [salvando, setSalvando] = useState(false)
  const [removendo, setRemovendo] = useState(null)
  const [erro, setErro] = useState(null)

  const minhasResponsabilidades = responsabilidades.filter(r => r.user_id === usuario.id || r.usuarios?.id === usuario.id)

  const PAPEIS_RESP = ['R.A', 'R.M', 'L.M']
  const PAPEL_COLORS_RESP = {
    'R.A': 'bg-purple-900/50 text-purple-300 border-purple-500/30',
    'R.M': 'bg-blue-900/50 text-blue-300 border-blue-500/30',
    'L.M': 'bg-green-900/50 text-green-300 border-green-500/30',
  }

  const handleAdicionar = async (e) => {
    e.preventDefault(); setErro(null)
    if (!form.setor_id || !form.papel) { setErro('Preencha setor e papel.'); return }
    setSalvando(true)
    try {
      await adicionar({ user_id: usuario.id, setor_id: form.setor_id, papel: form.papel })
      setForm({ setor_id: '', papel: '' })
    } catch (err) { setErro(err.message) }
    finally { setSalvando(false) }
  }

  const handleRemover = async (id) => {
    setRemovendo(id)
    try { await remover(id) }
    catch (err) { alert(err.message) }
    finally { setRemovendo(null) }
  }

  return (
    <Modal title="Responsabilidades" onClose={onClose} size="lg">
      <div className="flex flex-col gap-5">

        {/* Usuário */}
        <div className="flex items-center gap-2.5 px-3 py-2.5 rounded border border-white/8 bg-white/5">
          <div className="w-7 h-7 rounded-full bg-brand-500/30 border border-brand-500/20 flex items-center justify-center text-[11px] text-brand-200 font-mono flex-shrink-0 uppercase">
            {cpf.replace(/\D/g, '').slice(0, 2)}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-mono text-slate-200 truncate">{cpf}</p>
            {usuario.nome && <p className="text-[10px] text-slate-500 truncate">{usuario.nome}</p>}
          </div>
          <span className={`ml-auto text-[10px] font-mono px-1.5 py-0.5 rounded border ${PAPEL_COLORS[usuario.papel] ?? PAPEL_COLORS['—']}`}>
            {usuario.papel}
          </span>
        </div>

        {/* Atribuições atuais */}
        <div>
          <p className="text-[10px] uppercase tracking-wider text-slate-500 font-medium mb-2">Atribuições atuais</p>
          {loading ? (
            <div className="flex justify-center py-4"><div className="w-5 h-5 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" /></div>
          ) : minhasResponsabilidades.length === 0 ? (
            <p className="text-xs text-slate-600 italic py-2">Nenhuma responsabilidade atribuída.</p>
          ) : (
            <div className="flex flex-col gap-1">
              {minhasResponsabilidades.map(r => (
                <div key={r.id} className="flex items-center gap-2 px-3 py-2 rounded border border-white/5 bg-white/3 group">
                  <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded border flex-shrink-0 ${PAPEL_COLORS_RESP[r.papel] ?? 'bg-slate-800 text-slate-400 border-white/10'}`}>
                    {r.papel}
                  </span>
                  <span className="text-xs text-slate-300 flex-1 truncate">{r.setores?.nome ?? '—'}</span>
                  <button onClick={() => handleRemover(r.id)} disabled={removendo === r.id}
                    className="btn-danger px-1.5 py-1 opacity-0 group-hover:opacity-100 transition-opacity" title="Remover">
                    {removendo === r.id
                      ? <div className="w-3 h-3 border border-red-400 border-t-transparent rounded-full animate-spin" />
                      : <svg viewBox="0 0 24 24" className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/></svg>
                    }
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Adicionar nova */}
        <div>
          <p className="text-[10px] uppercase tracking-wider text-slate-500 font-medium mb-2">Adicionar responsabilidade</p>
          <form onSubmit={handleAdicionar} className="flex gap-2 items-end flex-wrap">
            <div className="flex-1 min-w-32">
              <select value={form.setor_id} onChange={e => setForm(p => ({ ...p, setor_id: e.target.value }))} className="input text-xs py-1.5">
                <option value="">Setor...</option>
                {setores.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}
              </select>
            </div>
            <div className="w-28">
              <select value={form.papel} onChange={e => setForm(p => ({ ...p, papel: e.target.value }))} className="input text-xs py-1.5">
                <option value="">Papel...</option>
                {PAPEIS_RESP.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <button type="submit" disabled={salvando} className="btn-primary py-1.5 text-xs whitespace-nowrap">
              {salvando ? '...' : '+ Atribuir'}
            </button>
          </form>
          {erro && <p className="text-xs text-red-400 mt-2">{erro}</p>}
        </div>

        <div className="flex justify-end">
          <button onClick={onClose} className="btn text-xs">Fechar</button>
        </div>
      </div>
    </Modal>
  )
}

// ── Modal: Confirmar remoção ───────────────────────────────────────────────────

function ConfirmarRemocaoModal({ usuario, onConfirmar, onClose }) {
  const cpf = usuario.email?.replace('@aguia.com', '') ?? usuario.email
  const [removendo, setRemovendo] = useState(false)

  const handleConfirmar = async () => {
    setRemovendo(true)
    try { await onConfirmar(usuario.id); onClose() }
    catch (err) { alert(err.message); setRemovendo(false) }
  }

  return (
    <Modal title="Confirmar Remoção" onClose={onClose} size="sm">
      <div className="flex flex-col gap-4">
        <div className="flex items-start gap-3 px-3 py-3 rounded border border-red-500/20 bg-red-900/10">
          <svg viewBox="0 0 24 24" className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
            <path d="M12 9v4m0 4h.01"/><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
          </svg>
          <div>
            <p className="text-xs text-red-300 font-semibold">Esta ação não pode ser desfeita.</p>
            <p className="text-xs text-slate-400 mt-1">
              O usuário <span className="font-mono text-slate-200">{cpf}</span> será permanentemente removido do sistema.
            </p>
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="btn">Cancelar</button>
          <button onClick={handleConfirmar} disabled={removendo} className="btn-danger">
            {removendo ? 'Removendo...' : 'Sim, remover'}
          </button>
        </div>
      </div>
    </Modal>
  )
}

// ── ERPPage Principal ─────────────────────────────────────────────────────────

export default function ERPPage({ session }) {
  const papel = session?.user?.user_metadata?.papel
  const podeAcessar = papel === 'A.C' || papel === 'T.I'

  const { usuarios, loading, erro, listar, criar, remover } = useAdminUsuarios()
  const [busca, setBusca] = useState('')
  const [modalCriar, setModalCriar] = useState(false)
  const [modalEditar, setModalEditar] = useState(null)
  const [modalCargo, setModalCargo] = useState(null)
  const [modalResp, setModalResp] = useState(null)
  const [modalRemover, setModalRemover] = useState(null)
  const [contextMenu, setContextMenu] = useState(null) // { x, y, usuario }

  useEffect(() => { listar() }, [listar])

  // Fechar menu de contexto com clique fora
  useEffect(() => {
    const handler = () => setContextMenu(null)
    window.addEventListener('click', handler)
    return () => window.removeEventListener('click', handler)
  }, [])

  const handleContextMenu = useCallback((e, usuario) => {
    e.preventDefault()
    setContextMenu({ x: e.clientX, y: e.clientY, usuario })
  }, [])

  // Mudar cargo via Edge Function (atualiza user_metadata)
  const handleMudarCargo = async (userId, novoPapel) => {
    // Chama função admin para atualizar metadata
    const { data: { session: s } } = await (await import('../lib/supabase')).supabase.auth.getSession()
    const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-usuarios`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${s.access_token}` },
      body: JSON.stringify({ acao: 'mudar_cargo', user_id: userId, papel: novoPapel }),
    })
    const json = await res.json()
    if (!res.ok || json.error) throw new Error(json.error ?? 'Erro ao mudar cargo')
    await listar()
  }

  // Editar nome via Edge Function
  const handleEditarNome = async (userId, nome) => {
    const { data: { session: s } } = await (await import('../lib/supabase')).supabase.auth.getSession()
    const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-usuarios`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${s.access_token}` },
      body: JSON.stringify({ acao: 'editar_nome', user_id: userId, nome }),
    })
    const json = await res.json()
    if (!res.ok || json.error) throw new Error(json.error ?? 'Erro ao editar nome')
    await listar()
  }

  const usuariosFiltrados = usuarios.filter(u => {
    const q = busca.toLowerCase()
    return !q || u.email?.toLowerCase().includes(q) || u.papel?.toLowerCase().includes(q) || u.nome?.toLowerCase().includes(q)
  })

  if (!podeAcessar) return <AcessoNegado />

  return (
    <div className="p-6 max-w-5xl mx-auto" onContextMenu={e => e.preventDefault()}>

      {/* ── Cabeçalho ──────────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-lg font-semibold text-white">Módulo ERP</h1>
          <p className="text-xs text-slate-500 mt-0.5 font-mono">
            {loading ? 'Carregando...' : `${usuarios.length} usuário${usuarios.length !== 1 ? 's' : ''} no sistema`}
            &nbsp;·&nbsp;
            <span className="text-slate-600">Clique com botão direito para ações</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={busca}
            onChange={e => setBusca(e.target.value)}
            placeholder="Buscar por CPF ou cargo..."
            className="input py-1.5 text-xs w-52 font-mono"
          />
          <button onClick={listar} title="Atualizar" className="btn px-2 py-1.5">
            <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 4v5h5"/><path d="M20 20v-5h-5"/>
              <path d="M4 9A8 8 0 0120 15M20 15a8 8 0 01-16 6"/>
            </svg>
          </button>
          {papel === 'T.I' && (
            <button onClick={() => setModalCriar(true)} className="btn-primary whitespace-nowrap">
              <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M12 5v14M5 12h14"/>
              </svg>
              Novo Usuário
            </button>
          )}
        </div>
      </div>

      {/* ── Erro ───────────────────────────────────────────────────────────────── */}
      {erro && (
        <div className="mb-4 px-4 py-3 rounded border border-red-500/20 bg-red-900/20 text-xs text-red-400 flex items-center gap-2">
          <svg viewBox="0 0 24 24" className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
            <path d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
          </svg>
          {erro}
        </div>
      )}

      {/* ── Tabela de usuários ─────────────────────────────────────────────────── */}
      <div className="card overflow-hidden select-none">

        {/* Header */}
        <div className="grid gap-4 px-5 py-3 border-b border-white/8 text-[10px] uppercase tracking-wider text-slate-500 font-medium"
          style={{ gridTemplateColumns: '1.6fr 1.2fr 1fr 1fr' }}>
          <span>CPF / Login</span>
          <span>Nome</span>
          <span>Cargo</span>
          <span>Último acesso</span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : usuariosFiltrados.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-xs text-slate-500">{busca ? 'Nenhum resultado para a busca.' : 'Nenhum usuário cadastrado.'}</p>
            {!busca && <p className="text-[10px] text-slate-600 mt-1">Clique em &quot;+ Novo Usuário&quot; para começar.</p>}
          </div>
        ) : (
          usuariosFiltrados.map(u => {
            const cpf = u.email?.replace('@aguia.com', '') ?? u.email ?? '—'
            const ultimoAcesso = u.last_sign_in_at
              ? new Date(u.last_sign_in_at).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
              : 'Nunca'

            return (
              <div
                key={u.id}
                onContextMenu={(e) => handleContextMenu(e, u)}
                className="grid gap-4 px-5 py-3.5 border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors items-center cursor-context-menu group"
                style={{ gridTemplateColumns: '1.6fr 1.2fr 1fr auto' }}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-7 h-7 rounded-full bg-brand-500/20 border border-brand-500/15 flex items-center justify-center text-[10px] text-brand-300 font-mono flex-shrink-0">
                    {cpf.replace(/\D/g, '').slice(0, 2)}
                  </div>
                  <span className="text-sm text-slate-200 font-mono truncate">{cpf}</span>
                </div>
                <span className="text-xs text-slate-400 truncate">
                  {u.nome ?? <span className="italic text-slate-600">—</span>}
                </span>
                <span>
                  <span className={`text-[11px] font-mono px-2 py-0.5 rounded border whitespace-nowrap ${PAPEL_COLORS[u.papel] ?? PAPEL_COLORS['—']}`}>
                    {u.papel}
                  </span>
                </span>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-slate-500 font-mono whitespace-nowrap">{ultimoAcesso}</span>
                  {/* Botão pincel */}
                  <button
                    onClick={(e) => { e.stopPropagation(); handleContextMenu(e, u) }}
                    onContextMenu={(e) => { e.stopPropagation(); handleContextMenu(e, u) }}
                    title="Ações"
                    className="p-1.5 rounded text-slate-600 hover:text-brand-300 hover:bg-brand-500/10 transition-all opacity-0 group-hover:opacity-100 border border-transparent hover:border-brand-500/20 flex-shrink-0"
                  >
                    <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M18.37 2.63 14 7l-1.59-1.59a2 2 0 0 0-2.82 0L8 7l9 9 1.59-1.58a2 2 0 0 0 0-2.82L17 10l4.37-4.37a2.12 2.12 0 1 0-3-3Z"/>
                      <path d="M9 8c-2 3-4 3.5-7 4l8 8c1-.5 3.5-2 4-7"/>
                      <path d="M14.5 17.5 4.5 15"/>
                    </svg>
                  </button>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* ── Legenda ────────────────────────────────────────────────────────────── */}
      {!loading && usuariosFiltrados.length > 0 && (
        <div className="flex flex-wrap gap-3 mt-3 px-1">
          {Object.entries(PAPEL_COLORS).filter(([k]) => k !== '—').map(([key, cls]) => (
            <span key={key} className="flex items-center gap-1.5 text-[10px] text-slate-500">
              <span className={`font-mono px-1.5 py-0.5 rounded border ${cls}`}>{key}</span>
              {PAPEL_LABELS[key]}
            </span>
          ))}
        </div>
      )}

      {/* ── Menu de Contexto ───────────────────────────────────────────────────── */}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          usuario={contextMenu.usuario}
          papel={papel}
          onEdit={(u) => setModalEditar(u)}
          onChangeRole={(u) => setModalCargo(u)}
          onResponsabilidades={(u) => setModalResp(u)}
          onDelete={(u) => setModalRemover(u)}
          onClose={() => setContextMenu(null)}
        />
      )}

      {/* ── Modais ─────────────────────────────────────────────────────────────── */}
      {modalCriar     && <CriarUsuarioModal onSalvar={criar} onClose={() => { setModalCriar(false); listar() }} />}
      {modalEditar    && <EditarNomeModal usuario={modalEditar} onSalvar={handleEditarNome} onClose={() => setModalEditar(null)} />}
      {modalCargo     && <MudarCargoModal usuario={modalCargo} onSalvar={handleMudarCargo} onClose={() => setModalCargo(null)} />}
      {modalResp      && <ResponsabilidadesModal usuario={modalResp} onClose={() => setModalResp(null)} />}
      {modalRemover   && <ConfirmarRemocaoModal usuario={modalRemover} onConfirmar={remover} onClose={() => setModalRemover(null)} />}

    </div>
  )
}
