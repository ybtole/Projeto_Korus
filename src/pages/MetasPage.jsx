import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useSetores } from '../hooks/useSetores'
import { usePerfil } from '../hooks/usePerfil'
import Modal from '../components/shared/Modal'

const ANO_INICIO = 2024

const DIRECAO_OPTS = [
  { value: 'MAXIMIZAR', label: '↑ Maximizar', desc: 'Quanto maior, melhor (ex: faturamento)' },
  { value: 'MINIMIZAR', label: '↓ Minimizar', desc: 'Quanto menor, melhor (ex: custo, faltas)' },
]

const FREQUENCIA_OPTS = [
  { value: 'MENSAL',    label: 'Mensal',    desc: 'Lançamento todo mês' },
  { value: 'BIMESTRAL', label: 'Bimestral', desc: 'A cada 2 meses' },
  { value: 'SEMESTRAL', label: 'Semestral', desc: '1x por semestre' },
]

const SEMESTRES = [
  { value: 'FEV_SET', label: 'Fev → Set' },
  { value: 'SET_MAR', label: 'Set → Mar' },
]

const EMPTY_FORM = {
  nome: '',
  setor_id: '',
  direcao: 'MAXIMIZAR',
  peso: '',
  unidade: '',
  frequencia: 'MENSAL',
  dia_lancamento: '28',
  semestre: 'FEV_SET',
  ano: String(new Date().getFullYear()),
  multiSetor: false,
  setores_adicionais: [],
  tipo_calculo: 'MARGINAL',
  config_booleano: { valor_sucesso: 'Concluído', valor_falha: 'Não Concluído' },
  config_categorico: [
    { categoria: 'A', percentual: 100 },
    { categoria: 'B', percentual: 80 },
    { categoria: 'C', percentual: 60 },
    { categoria: 'D', percentual: 0 }
  ],
  ranges: [
    { de: '', ate: '', percentual: 100 },
    { de: '', ate: '', percentual: 80 },
    { de: '', ate: '', percentual: 0 },
  ],
}

function RangeEditor({ ranges, onChange, direcao }) {
  function update(i, field, value) {
    const next = ranges.map((r, idx) => idx === i ? { ...r, [field]: value } : r)
    onChange(next)
  }
  function addRange() {
    onChange([...ranges, { de: '', ate: '', percentual: '' }])
  }
  function removeRange(i) {
    onChange(ranges.filter((_, idx) => idx !== i))
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="grid grid-cols-4 gap-2 text-xs text-slate-500 uppercase tracking-wider px-1">
        <span>De</span>
        <span>Até</span>
        <span>PPR %</span>
        <span></span>
      </div>
      {ranges.map((r, i) => (
        <div key={i} className="grid grid-cols-4 gap-2 items-center">
          <input
            className="input py-1.5 text-sm"
            placeholder="Mínimo"
            value={r.de}
            onChange={e => update(i, 'de', e.target.value)}
          />
          <input
            className="input py-1.5 text-sm"
            placeholder="Máximo"
            value={r.ate}
            onChange={e => update(i, 'ate', e.target.value)}
          />
          <div className="flex items-center gap-1">
            <input
              className="input py-1.5 text-sm"
              placeholder="%"
              value={r.percentual}
              onChange={e => update(i, 'percentual', e.target.value)}
            />
            <span className="text-slate-500 text-xs">%</span>
          </div>
          <button
            onClick={() => removeRange(i)}
            className="btn-danger px-2 py-1.5 text-xs"
            disabled={ranges.length <= 1}
          >✕</button>
        </div>
      ))}
      <button onClick={addRange} className="btn text-xs mt-1 w-fit">
        + Adicionar faixa
      </button>
      {direcao === 'MINIMIZAR' && (
        <p className="text-xs text-amber-400 mt-1">
          ↓ Minimizar: a faixa com menor valor deve ter o maior percentual PPR.
        </p>
      )}
    </div>
  )
}

function CategoricoEditor({ categorias, onChange }) {
  function update(i, field, value) {
    const next = categorias.map((c, idx) => idx === i ? { ...c, [field]: value } : c)
    onChange(next)
  }
  function addCat() {
    onChange([...categorias, { categoria: '', percentual: '' }])
  }
  function removeCat(i) {
    onChange(categorias.filter((_, idx) => idx !== i))
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="grid grid-cols-12 gap-2 text-xs text-slate-500 uppercase tracking-wider px-1">
        <span className="col-span-7">Categoria (Texto)</span>
        <span className="col-span-4">PPR %</span>
        <span className="col-span-1"></span>
      </div>
      {categorias.map((c, i) => (
        <div key={i} className="grid grid-cols-12 gap-2 items-center">
          <input
            className="input py-1.5 text-sm col-span-7"
            placeholder="Ex: A, B, Ótimo, Bom..."
            value={c.categoria}
            onChange={e => update(i, 'categoria', e.target.value)}
          />
          <div className="flex items-center gap-1 col-span-4">
            <input
              className="input py-1.5 text-sm"
              placeholder="%"
              value={c.percentual}
              onChange={e => update(i, 'percentual', e.target.value)}
            />
            <span className="text-slate-500 text-xs">%</span>
          </div>
          <button
            onClick={() => removeCat(i)}
            className="btn-danger px-2 py-1.5 text-xs col-span-1"
            disabled={categorias.length <= 1}
          >✕</button>
        </div>
      ))}
      <button onClick={addCat} className="btn text-xs mt-1 w-fit">
        + Adicionar categoria
      </button>
    </div>
  )
}

function MetaFormModal({ modo, meta, setores, onSave, onClose }) {
  const isEdit = modo === 'editar'
  const anoAtual = new Date().getFullYear()

  const [form, setForm] = useState(() => {
    if (isEdit && meta) {
      return {
        ...EMPTY_FORM,
        nome: meta.nome ?? '',
        setor_id: meta.setor_id ?? '',
        direcao: meta.direcao ?? 'MAXIMIZAR',
        peso: meta.peso ?? '',
        unidade: meta.unidade ?? '',
        frequencia: meta.frequencia ?? 'MENSAL',
        dia_lancamento: meta.dia_lancamento ?? '28',
        semestre: meta.semestre ?? 'FEV_SET',
        ano: meta.ano ? String(meta.ano) : String(anoAtual),
        tipo_calculo: meta.tipo_calculo ?? 'MARGINAL',
        config_booleano: meta.config_booleano ?? EMPTY_FORM.config_booleano,
        config_categorico: meta.config_categorico ?? EMPTY_FORM.config_categorico,
        ranges: meta.ranges ?? EMPTY_FORM.ranges,
      }
    }
    return { ...EMPTY_FORM }
  })
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState('')

  function set(field, value) {
    setForm(f => ({ ...f, [field]: value }))
  }

  async function handle() {
    if (!form.nome.trim()) return setErro('Informe o nome da meta.')
    if (!form.setor_id) return setErro('Selecione o setor responsável.')
    if (!form.peso || isNaN(Number(form.peso))) return setErro('Informe o peso (%) da meta.')
    setLoading(true)
    setErro('')
    try {
      await onSave({
        nome: form.nome.trim(),
        setor_id: form.setor_id,
        direcao: form.direcao,
        peso: Number(form.peso),
        unidade: form.unidade.trim(),
        frequencia: form.frequencia,
        dia_lancamento: Number(form.dia_lancamento),
        semestre: form.semestre,
        ano: Number(form.ano) || anoAtual,
        tipo_calculo: form.tipo_calculo,
        config_booleano: form.config_booleano,
        config_categorico: form.config_categorico,
        ranges: form.ranges,
      })
      onClose()
    } catch (e) {
      setErro(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal
      title={isEdit ? `Editar meta — ${meta.nome}` : 'Nova meta'}
      onClose={onClose}
      size="xl"
    >
      <div className="flex flex-col gap-4 max-h-[70vh] overflow-y-auto pr-1">
        {/* Nome */}
        <div>
          <label className="label">Nome da meta</label>
          <input
            className="input"
            placeholder="Ex: Faturamento mensal, Toras cortadas..."
            value={form.nome}
            onChange={e => set('nome', e.target.value)}
            autoFocus
          />
        </div>

        {/* Setor + Peso */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Setor responsável</label>
            <select className="input" value={form.setor_id} onChange={e => set('setor_id', e.target.value)}>
              <option value="">Selecione...</option>
              {setores.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Peso da meta (%)</label>
            <input
              className="input font-mono"
              placeholder="Ex: 50"
              value={form.peso}
              onChange={e => set('peso', e.target.value)}
            />
            <p className="text-[10px] text-slate-600 mt-1">Soma dos pesos = 100% do PPR</p>
          </div>
        </div>



        {/* Direção */}
        <div>
          <label className="label">Direção da meta</label>
          <div className="grid grid-cols-2 gap-2">
            {DIRECAO_OPTS.map(d => (
              <button
                key={d.value}
                onClick={() => set('direcao', d.value)}
                className={`flex flex-col items-start px-3 py-2.5 rounded border text-left transition-all
                  ${form.direcao === d.value
                    ? d.value === 'MAXIMIZAR'
                      ? 'border-green-500/50 bg-green-500/10 text-green-300'
                      : 'border-red-500/50 bg-red-500/10 text-red-300'
                    : 'border-white/10 bg-white/5 text-slate-400 hover:bg-white/8'
                  }`}
              >
                <span className="text-sm font-medium">{d.label}</span>
                <span className="text-[10px] opacity-70 mt-0.5">{d.desc}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Unidade + Frequência */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Unidade de medida</label>
            <input
              className="input"
              placeholder="Ex: toras, R$, %, unidades"
              value={form.unidade}
              onChange={e => set('unidade', e.target.value)}
            />
          </div>
          <div>
            <label className="label">Frequência de lançamento</label>
            <select className="input" value={form.frequencia} onChange={e => set('frequencia', e.target.value)}>
              {FREQUENCIA_OPTS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
            </select>
          </div>
        </div>

        {/* Semestre + Ano + Prazo */}
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="label">Ciclo semestral</label>
            <select className="input" value={form.semestre} onChange={e => set('semestre', e.target.value)}>
              {SEMESTRES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Ano de referência</label>
            <input
              className="input font-mono"
              placeholder={String(anoAtual)}
              value={form.ano}
              onChange={e => set('ano', e.target.value)}
              maxLength={4}
            />
          </div>
          <div>
            <label className="label">Dia limite de lançamento</label>
            <input
              className="input font-mono"
              placeholder="28"
              value={form.dia_lancamento}
              onChange={e => set('dia_lancamento', e.target.value)}
            />
            <p className="text-[10px] text-slate-600 mt-1">Após este dia, meta fica "Atrasada"</p>
          </div>
        </div>

        {/* Editor de Configuração */}
        <div className="flex flex-col gap-4">
          <div>
            <label className="label">Configuração da Meta</label>
            <p className="text-[10px] text-slate-500 mb-3">
              Configure as regras de percentual PPR atingido para esta meta. O sistema validará o lançamento contra estas regras.
            </p>

            <div className="grid grid-cols-3 gap-2">
              {[
                { value: 'BOOLEANO', label: 'Booleano', desc: 'Concluído / Não Concluído' },
                { value: 'CATEGORICO', label: 'Categórico', desc: 'A=100%, B=80%...' },
                { value: 'MARGINAL', label: 'Marginal', desc: 'Faixas de valores (De/Até)' },
              ].map(t => (
                <button
                  key={t.value}
                  onClick={() => set('tipo_calculo', t.value)}
                  className={`flex flex-col items-start px-3 py-2.5 rounded border text-left transition-all
                    ${form.tipo_calculo === t.value
                      ? 'border-brand-500/50 bg-brand-500/10 text-brand-300'
                      : 'border-white/10 bg-white/5 text-slate-400 hover:bg-white/8'
                    }`}
                >
                  <span className="text-sm font-medium">{t.label}</span>
                  <span className="text-[10px] opacity-70 mt-0.5">{t.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {form.tipo_calculo === 'BOOLEANO' && (
            <div className="grid grid-cols-2 gap-3 bg-white/5 p-3 rounded border border-white/5">
              <div>
                <label className="text-[10px] text-slate-500 uppercase font-semibold">Valor de Sucesso (100%)</label>
                <input
                  className="input py-1.5 text-sm mt-1"
                  value={form.config_booleano.valor_sucesso}
                  onChange={e => set('config_booleano', { ...form.config_booleano, valor_sucesso: e.target.value })}
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-500 uppercase font-semibold">Valor de Falha (0%)</label>
                <input
                  className="input py-1.5 text-sm mt-1"
                  value={form.config_booleano.valor_falha}
                  onChange={e => set('config_booleano', { ...form.config_booleano, valor_falha: e.target.value })}
                />
              </div>
            </div>
          )}

          {form.tipo_calculo === 'CATEGORICO' && (
            <CategoricoEditor 
              categorias={form.config_categorico} 
              onChange={v => set('config_categorico', v)} 
            />
          )}

          {form.tipo_calculo === 'MARGINAL' && (
            <RangeEditor
              ranges={form.ranges}
              onChange={v => set('ranges', v)}
              direcao={form.direcao}
            />
          )}
        </div>

        {erro && <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded px-3 py-2">{erro}</p>}
      </div>

      <div className="flex gap-2 justify-end mt-4 pt-3 border-t border-white/8">
        <button onClick={onClose} className="btn">Cancelar</button>
        <button onClick={handle} disabled={loading} className="btn-primary">
          {loading ? 'Salvando...' : isEdit ? 'Salvar alterações' : 'Criar meta'}
        </button>
      </div>
    </Modal>
  )
}

function MetaCard({ meta, onEdit, onDelete, onToggleAtivo, podeEditar, podeExcluir }) {
  const pct = meta.peso ? `${meta.peso}%` : '—'
  const isAtiva = meta.ativa !== false

  return (
    <div className={`card p-4 transition-all ${isAtiva ? '' : 'opacity-50'}`}>
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-sm font-semibold text-white truncate">{meta.nome}</h3>
            <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-medium ${
              meta.direcao === 'MAXIMIZAR'
                ? 'bg-green-500/15 text-green-400 border border-green-500/20'
                : 'bg-red-500/15 text-red-400 border border-red-500/20'
            }`}>
              {meta.direcao === 'MAXIMIZAR' ? '↑ MAX' : '↓ MIN'}
            </span>
            {!isAtiva && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-700 text-slate-400">inativa</span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-0.5">{meta.setores?.nome ?? '—'}</p>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          {podeEditar && (
            <button onClick={() => onEdit(meta)} className="btn py-1 px-2 text-xs">✎</button>
          )}
          {podeEditar && (
            <button onClick={() => onToggleAtivo(meta)} className="btn py-1 px-2 text-xs text-slate-400">
              {isAtiva ? '⏸' : '▶'}
            </button>
          )}
          {podeExcluir && (
            <button onClick={() => onDelete(meta)} className="btn-danger py-1 px-2 text-xs">✕</button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 text-xs">
        <div>
          <p className="text-slate-500 uppercase tracking-wider text-[10px]">Peso</p>
          <p className="text-slate-200 font-mono font-medium">{pct}</p>
        </div>
        <div>
          <p className="text-slate-500 uppercase tracking-wider text-[10px]">Frequência</p>
          <p className="text-slate-200">{meta.frequencia ?? 'Mensal'}</p>
        </div>
        <div>
          <p className="text-slate-500 uppercase tracking-wider text-[10px]">Prazo</p>
          <p className="text-slate-200 font-mono">Dia {meta.dia_lancamento ?? 28}</p>
        </div>
      </div>

      {(meta.tipo_calculo === 'BOOLEANO' && meta.config_booleano) && (
        <div className="mt-3 pt-3 border-t border-white/8">
          <p className="text-[10px] text-slate-600 uppercase tracking-wider mb-1.5">Booleano PPR</p>
          <div className="flex flex-wrap gap-2">
            <span className="text-[10px] font-mono bg-green-500/10 border border-green-500/20 px-2 py-0.5 rounded text-green-300">
              {meta.config_booleano.valor_sucesso} = 100%
            </span>
            <span className="text-[10px] font-mono bg-red-500/10 border border-red-500/20 px-2 py-0.5 rounded text-red-300">
              {meta.config_booleano.valor_falha} = 0%
            </span>
          </div>
        </div>
      )}

      {(meta.tipo_calculo === 'CATEGORICO' && meta.config_categorico?.length > 0) && (
        <div className="mt-3 pt-3 border-t border-white/8">
          <p className="text-[10px] text-slate-600 uppercase tracking-wider mb-1.5">Categorias PPR</p>
          <div className="flex flex-wrap gap-1">
            {meta.config_categorico.map((c, i) => (
              <span key={i} className="text-[10px] font-mono bg-purple-500/10 border border-purple-500/20 px-2 py-0.5 rounded text-purple-200">
                {c.categoria} = {c.percentual}%
              </span>
            ))}
          </div>
        </div>
      )}

      {((!meta.tipo_calculo || meta.tipo_calculo === 'MARGINAL') && meta.ranges?.length > 0) && (
        <div className="mt-3 pt-3 border-t border-white/8">
          <p className="text-[10px] text-slate-600 uppercase tracking-wider mb-1.5">Faixas PPR</p>
          <div className="flex flex-wrap gap-1">
            {meta.ranges.map((r, i) => (
              <span key={i} className="text-[10px] font-mono bg-brand-500/10 border border-brand-500/20 px-2 py-0.5 rounded text-brand-200">
                {r.de}–{r.ate || '∞'} = {r.percentual}%
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default function MetasPage({ session }) {
  const anoAtual = new Date().getFullYear()
  const anosDisponiveis = Array.from(
    { length: anoAtual - ANO_INICIO + 1 },
    (_, i) => ANO_INICIO + i
  )

  const [metas, setMetas] = useState([])
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState(null)
  const [modal, setModal] = useState(null)
  const [filtroSetor, setFiltroSetor] = useState('')
  const [filtroArea, setFiltroArea] = useState('')
  const [filtroSemestre, setFiltroSemestre] = useState('')
  const [filtroAno, setFiltroAno] = useState(String(anoAtual))
  const { setores } = useSetores()
  const { papel, setorIds, metasPermitidas, isAC, isLM, podeCriarMeta, loading: perfilLoading } = usePerfil(session)

  const fetchMetas = useCallback(async () => {
    if (perfilLoading) return;

    setLoading(true)
    let query = supabase
      .from('metas')
      .select('*, setores(nome)')
      .order('nome')

    if (filtroSetor) query = query.eq('setor_id', filtroSetor)
    if (filtroArea) {
      // Find all sectors that are descendants of the selected Area
      const idsArea = [filtroArea]
      const queue = [filtroArea]
      while (queue.length > 0) {
        const curr = queue.shift()
        const children = setores.filter(s => s.parent_id === curr).map(s => s.id)
        idsArea.push(...children)
        queue.push(...children)
      }
      query = query.in('setor_id', idsArea)
    }
    if (filtroSemestre) query = query.eq('semestre', filtroSemestre)
    if (filtroAno) query = query.eq('ano', Number(filtroAno))

    if (!isAC) {
      const hasSetores = setorIds.length > 0
      const hasMetas = metasPermitidas !== null && metasPermitidas.length > 0
      
      if (hasSetores && hasMetas) {
        query = query.or(`setor_id.in.(${setorIds.join(',')}),id.in.(${metasPermitidas.join(',')})`)
      } else if (hasSetores) {
        query = query.in('setor_id', setorIds)
      } else if (hasMetas) {
        query = query.in('id', metasPermitidas)
      } else {
        setMetas([])
        setLoading(false)
        return
      }
    }

    const { data, error } = await query
    if (error) setErro(error.message)
    else setMetas(data ?? [])
    setLoading(false)
  }, [filtroSetor, filtroArea, filtroSemestre, filtroAno, isAC, JSON.stringify(setorIds), JSON.stringify(metasPermitidas), perfilLoading, JSON.stringify(setores)])

  useEffect(() => {
    fetchMetas()
    const channel = supabase
      .channel('metas-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'metas' }, fetchMetas)
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [fetchMetas])

  async function handleSave(payload) {
    // Determina a qual DIVISÃO (Área) o setor pertence
    const setorEscolhido = setores.find(s => s.id === payload.setor_id)
    let area_id = null
    let current = setorEscolhido
    while (current) {
      if (current.tipo === 'DIVISÃO') {
        area_id = current.id
        break
      }
      current = setores.find(s => s.id === current.parent_id)
    }

    const finalPayload = { ...payload, area_id }

    if (modal?.modo === 'editar') {
      const { error } = await supabase.from('metas').update(finalPayload).eq('id', modal.meta.id)
      if (error) throw error
    } else {
      const { error } = await supabase.from('metas').insert(finalPayload)
      if (error) throw error
    }
  }

  async function handleDelete(meta) {
    if (!confirm(`Excluir a meta "${meta.nome}"? Esta ação não pode ser desfeita.`)) return
    const { error } = await supabase.from('metas').delete().eq('id', meta.id)
    if (error) alert(error.message)
  }

  async function handleToggleAtivo(meta) {
    const { error } = await supabase.from('metas').update({ ativa: !(meta.ativa !== false) }).eq('id', meta.id)
    if (error) alert(error.message)
  }

  // Agrupar por setor
  const porSetor = metas.reduce((acc, m) => {
    const key = m.setores?.nome ?? 'Sem setor'
    acc[key] = acc[key] ?? []
    acc[key].push(m)
    return acc
  }, {})

  const pesoTotal = metas.filter(m => m.ativa !== false && (!filtroSetor || m.setor_id === filtroSetor))
    .reduce((s, m) => s + (Number(m.peso) || 0), 0)

  const temFiltroAtivo = filtroArea || filtroSetor || filtroSemestre || filtroAno

  function limparFiltros() {
    setFiltroArea('')
    setFiltroSetor('')
    setFiltroSemestre('')
    setFiltroAno('')
  }

  function abrirModalCriar() {
    if (!podeCriarMeta) return
    setModal({ modo: 'criar' })
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-6 py-4 border-b border-white/8 flex items-center justify-between flex-shrink-0">
        <div>
          <h1 className="text-base font-semibold text-white">Metas PPR</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {metas.length} meta{metas.length !== 1 ? 's' : ''} cadastrada{metas.length !== 1 ? 's' : ''}
            {pesoTotal > 0 && (
              <span className={`ml-2 ${Math.abs(pesoTotal - 100) < 0.01 ? 'text-green-400' : 'text-amber-400'}`}>
                · Soma dos pesos: {pesoTotal}%
                {Math.abs(pesoTotal - 100) > 0.01 && ' ⚠ deve somar 100%'}
              </span>
            )}
          </p>
        </div>
        {podeCriarMeta && (
          <button onClick={abrirModalCriar} className="btn-primary">
            + Nova meta
          </button>
        )}
      </div>

      {/* Filtros */}
      <div className="px-6 py-3 border-b border-white/5 flex-shrink-0">
        <div className="flex items-end gap-5 flex-wrap">

          {isAC && (
          <>
            <div className="flex flex-col gap-1.5">
              <span className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold">
                Área / Divisão
              </span>
              <select
                className="input w-auto text-xs py-1.5 px-2"
                value={filtroArea}
                onChange={e => {
                  setFiltroArea(e.target.value)
                  setFiltroSetor('') // Limpa o setor ao trocar de área
                }}
              >
                <option value="">Todas as áreas</option>
                {setores.filter(s => s.tipo === 'DIVISÃO').map(s => (
                  <option key={s.id} value={s.id}>{s.nome}</option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <span className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold">
                Setores
              </span>
              <select
                className="input w-auto text-xs py-1.5 px-2"
                value={filtroSetor}
                onChange={e => setFiltroSetor(e.target.value)}
              >
                <option value="">Todos os setores</option>
                {setores
                  // Se tiver uma área filtrada, mostra apenas setores abaixo dela
                  .filter(s => !filtroArea || (function checkDescendant(sid) {
                     if (sid === filtroArea) return true;
                     const parent = setores.find(x => x.id === sid)?.parent_id;
                     return parent ? checkDescendant(parent) : false;
                  })(s.id))
                  .map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}
              </select>
            </div>
          </>
          )}

          {/* Filtro: Semestre */}
          <div className="flex flex-col gap-1.5">
            <span className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold">
              Semestre
            </span>
            <select
              className="input w-auto text-xs py-1.5 px-2"
              value={filtroSemestre}
              onChange={e => setFiltroSemestre(e.target.value)}
            >
              <option value="">Todos os semestres</option>
              {SEMESTRES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>

          {/* Filtro: Ano */}
          <div className="flex flex-col gap-1.5">
            <span className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold">
              Ano
            </span>
            <select
              className="input w-auto text-xs py-1.5 px-2"
              value={filtroAno}
              onChange={e => setFiltroAno(e.target.value)}
            >
              <option value="">Todos os anos</option>
              {anosDisponiveis.map(ano => (
                <option key={ano} value={String(ano)}>{ano}</option>
              ))}
            </select>
          </div>

          {/* Limpar filtros */}
          {temFiltroAtivo && (
            <button
              className="btn text-xs py-1.5 text-slate-400 self-end"
              onClick={limparFiltros}
            >
              Limpar filtros
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        {loading && (
          <div className="flex items-center justify-center h-40 gap-2 text-slate-500">
            <div className="w-4 h-4 border border-brand-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-sm">Carregando...</span>
          </div>
        )}
        {erro && (
          <div className="bg-red-500/10 border border-red-500/20 rounded p-4 text-red-400 text-sm">Erro: {erro}</div>
        )}
        {!loading && !erro && metas.length === 0 && (
          <div className="flex flex-col items-center justify-center h-64 text-slate-500 gap-3">
            <div className="text-4xl opacity-20">🎯</div>
            <p className="text-sm">Nenhuma meta cadastrada.</p>
            {podeCriarMeta && (
              <button onClick={abrirModalCriar} className="btn-primary text-sm">
                Criar primeira meta
              </button>
            )}
          </div>
        )}
        {!loading && !erro && Object.entries(porSetor).map(([setor, metasDoSetor]) => (
          <div key={setor} className="mb-8">
            <div className="flex items-center gap-3 mb-3">
              <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{setor}</h2>
              <div className="flex-1 h-px bg-white/8" />
              <span className="text-xs text-slate-600 font-mono">
                {metasDoSetor.filter(m => m.ativa !== false).reduce((s, m) => s + (Number(m.peso) || 0), 0)}% do PPR
              </span>
            </div>
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-2 xl:grid-cols-3">
              {metasDoSetor.map(m => (
                <MetaCard
                  key={m.id}
                  meta={m}
                  onEdit={meta => setModal({ modo: 'editar', meta })}
                  onDelete={handleDelete}
                  onToggleAtivo={handleToggleAtivo}
                  podeEditar={isAC || papel === 'R.A' || papel === 'R.M'}
                  podeExcluir={isAC}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      {modal && (
        <MetaFormModal
          modo={modal.modo}
          meta={modal.meta}
          setores={setores}
          onSave={handleSave}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  )
}
