import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useSetores } from '../hooks/useSetores'
import { usePerfil } from '../hooks/usePerfil'
import Modal from '../components/shared/Modal'
import { calcularMeta } from '../utils/calculoMetas'

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
      let parsedRanges = meta.ranges
      if (typeof parsedRanges === 'string') {
        try { parsedRanges = JSON.parse(parsedRanges) } catch (e) { parsedRanges = null }
      }
      
      const isBooleano = meta.tipo_calculo === 'BOOLEANO'
      const isCategorico = meta.tipo_calculo === 'CATEGORICO'
      const isMarginal = meta.tipo_calculo === 'MARGINAL' || meta.tipo_calculo === 'range'

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
        tipo_calculo: meta.tipo_calculo === 'range' ? 'MARGINAL' : (meta.tipo_calculo === 'booleano' ? 'BOOLEANO' : (meta.tipo_calculo === 'categorico' ? 'CATEGORICO' : (meta.tipo_calculo ?? 'MARGINAL'))),
        config_booleano: isBooleano && parsedRanges ? parsedRanges : EMPTY_FORM.config_booleano,
        config_categorico: isCategorico && Array.isArray(parsedRanges) ? parsedRanges : EMPTY_FORM.config_categorico,
        ranges: isMarginal && Array.isArray(parsedRanges) ? parsedRanges : EMPTY_FORM.ranges,
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
      let finalRanges = form.ranges
      if (form.tipo_calculo === 'BOOLEANO') finalRanges = form.config_booleano
      if (form.tipo_calculo === 'CATEGORICO') finalRanges = form.config_categorico

      const mapTipo = { 'MARGINAL': 'range', 'BOOLEANO': 'booleano', 'CATEGORICO': 'categorico' }

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
        tipo_calculo: mapTipo[form.tipo_calculo] || form.tipo_calculo,
        ranges: typeof finalRanges === 'string' ? finalRanges : JSON.stringify(finalRanges),
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

// ─── Modal de Lançamento (L.M.) ───────────────────────────────────────────────────

function LancamentoModal({ meta, lancamentoAtual, onClose, onSave }) {
  let parsedRanges = meta.ranges
  if (typeof parsedRanges === 'string') {
    try { parsedRanges = JSON.parse(parsedRanges) } catch(e) { parsedRanges = null }
  }

  const tipoNorm =
    meta.tipo_calculo === 'booleano' || meta.tipo_calculo === 'BOOLEANO' ? 'BOOLEANO' :
    meta.tipo_calculo === 'categorico' || meta.tipo_calculo === 'CATEGORICO' ? 'CATEGORICO' :
    'MARGINAL'

  const categorias = tipoNorm === 'CATEGORICO' && Array.isArray(parsedRanges) ? parsedRanges : []
  const boolConfig = tipoNorm === 'BOOLEANO' && parsedRanges
    ? parsedRanges
    : { valor_sucesso: 'Concluído', valor_falha: 'Não Concluído' }

  const [valorReal, setValorReal] = useState(() => {
    if (lancamentoAtual?.valor_real !== undefined) return String(lancamentoAtual.valor_real)
    if (tipoNorm === 'BOOLEANO') return boolConfig.valor_falha
    if (tipoNorm === 'CATEGORICO' && categorias.length > 0) return categorias[0].categoria
    return ''
  })
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState('')

  const configMeta = {
    tipo_calculo: tipoNorm,
    direcao: meta.direcao ?? 'MAXIMIZAR',
    peso: meta.peso ?? 0,
    config_booleano: tipoNorm === 'BOOLEANO' ? parsedRanges : null,
    config_categorico: tipoNorm === 'CATEGORICO' ? parsedRanges : null,
    ranges: tipoNorm === 'MARGINAL' && Array.isArray(parsedRanges) ? parsedRanges : null,
  }

  const resultado = valorReal !== '' ? calcularMeta(valorReal, configMeta) : null

  async function handle() {
    if (valorReal === '' || valorReal === null) return setErro('Informe o valor.')
    setLoading(true)
    setErro('')
    try {
      await onSave({ meta_id: meta.id, valor_real: valorReal, percentual_atingido: resultado?.percentual_atingido ?? 0 })
      onClose()
    } catch(e) {
      setErro(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal title={`Lançar — ${meta.nome}`} onClose={onClose} size="sm">
      <div className="flex flex-col gap-4">
        <div className="bg-white/5 rounded-lg p-3 flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-400">{meta.setores?.nome ?? '—'}</p>
            <p className="text-sm font-medium text-white mt-0.5">{meta.nome}</p>
          </div>
          <span className="text-[10px] font-mono px-2 py-1 rounded bg-brand-500/15 text-brand-300 border border-brand-500/20">
            Peso: {meta.peso}%
          </span>
        </div>

        <div>
          <label className="label">
            {tipoNorm === 'BOOLEANO' ? 'Resultado' :
             tipoNorm === 'CATEGORICO' ? 'Categoria atingida' :
             `Valor realizado${meta.unidade ? ` (${meta.unidade})` : ''}`}
          </label>

          {tipoNorm === 'BOOLEANO' && (
            <div className="grid grid-cols-2 gap-2 mt-1">
              {[boolConfig.valor_sucesso, boolConfig.valor_falha].map(v => (
                <button
                  key={v}
                  onClick={() => setValorReal(v)}
                  className={`px-3 py-2.5 rounded border text-sm font-medium transition-all ${
                    valorReal === v
                      ? v === boolConfig.valor_sucesso
                        ? 'border-emerald-500/50 bg-emerald-500/15 text-emerald-300'
                        : 'border-red-500/50 bg-red-500/15 text-red-300'
                      : 'border-white/10 bg-white/5 text-slate-400 hover:bg-white/8'
                  }`}
                >{v}</button>
              ))}
            </div>
          )}

          {tipoNorm === 'CATEGORICO' && (
            <div className="flex flex-wrap gap-2 mt-1">
              {categorias.map(c => (
                <button
                  key={c.categoria}
                  onClick={() => setValorReal(c.categoria)}
                  className={`px-3 py-2 rounded border text-sm transition-all ${
                    valorReal === c.categoria
                      ? 'border-purple-500/50 bg-purple-500/15 text-purple-300'
                      : 'border-white/10 bg-white/5 text-slate-400 hover:bg-white/8'
                  }`}
                >
                  {c.categoria} <span className="text-[10px] opacity-60">({c.percentual}%)</span>
                </button>
              ))}
            </div>
          )}

          {tipoNorm === 'MARGINAL' && (
            <input
              className="input mt-1 font-mono"
              type="number"
              placeholder={`Ex: 1500${meta.unidade ? ' ' + meta.unidade : ''}`}
              value={valorReal}
              onChange={e => setValorReal(e.target.value)}
              autoFocus
            />
          )}
        </div>

        {resultado && (
          <div className={`rounded-lg border p-3 flex items-center justify-between ${
            resultado.percentual_atingido >= 100 ? 'bg-emerald-500/10 border-emerald-500/20' :
            resultado.percentual_atingido > 0 ? 'bg-amber-500/10 border-amber-500/20' :
            'bg-red-500/10 border-red-500/20'
          }`}>
            <div>
              <p className="text-[10px] text-slate-500 uppercase tracking-wider">PPR Calculado</p>
              <p className={`text-2xl font-mono font-bold mt-0.5 ${
                resultado.percentual_atingido >= 100 ? 'text-emerald-400' :
                resultado.percentual_atingido > 0 ? 'text-amber-400' : 'text-red-400'
              }`}>{resultado.percentual_atingido.toFixed(0)}%</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-slate-500 uppercase tracking-wider">Status</p>
              <p className="text-sm font-medium text-slate-200 mt-0.5">{resultado.status}</p>
            </div>
          </div>
        )}

        {erro && <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded px-3 py-2">{erro}</p>}
      </div>

      <div className="flex gap-2 justify-end mt-4 pt-3 border-t border-white/8">
        <button onClick={onClose} className="btn">Cancelar</button>
        <button onClick={handle} disabled={loading || !resultado} className="btn-primary">
          {loading ? 'Enviando...' : 'Enviar para aprovação'}
        </button>
      </div>
    </Modal>
  )
}

// ─── Notas por Cargo ───────────────────────────────────────────────────────

const PAPEL_COLORS = {
  'A.C': { av: 'bg-amber-500',  badge: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
  'T.I': { av: 'bg-cyan-500',   badge: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30' },
  'R.A': { av: 'bg-purple-500', badge: 'bg-purple-500/20 text-purple-400 border-purple-500/30' },
  'R.M': { av: 'bg-blue-500',   badge: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  'L.M': { av: 'bg-emerald-500',badge: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
}
const getCor = p => PAPEL_COLORS[p] ?? { av: 'bg-slate-500', badge: 'bg-slate-500/20 text-slate-400 border-slate-500/30' }

function formatarTempo(ts) {
  const m = Math.floor((Date.now() - new Date(ts)) / 60000)
  if (m < 1) return 'agora'
  if (m < 60) return `há ${m}min`
  const h = Math.floor(m / 60)
  if (h < 24) return `há ${h}h`
  const d = Math.floor(h / 24)
  return `há ${d} dia${d !== 1 ? 's' : ''}`
}

function MetaNotasModal({ meta, session, papel, onClose }) {
  const [notas, setNotas] = useState([])
  const [novaNota, setNovaNota] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [carregando, setCarregando] = useState(true)
  const [erraNota, setErraNota] = useState('')
  const threadRef = useRef(null)

  let parsedRanges = meta.ranges
  if (typeof parsedRanges === 'string') {
    try { parsedRanges = JSON.parse(parsedRanges) } catch(e) { parsedRanges = null }
  }
  const tipoLabel =
    meta.tipo_calculo === 'booleano' || meta.tipo_calculo === 'BOOLEANO' ? 'Booleano' :
    meta.tipo_calculo === 'categorico' || meta.tipo_calculo === 'CATEGORICO' ? 'Categórico' : 'Marginal'

  const fetchNotas = useCallback(async () => {
    const { data } = await supabase.from('meta_notas').select('*').eq('meta_id', meta.id).order('created_at', { ascending: true })
    setNotas(data ?? [])
    setCarregando(false)
    setTimeout(() => { if (threadRef.current) threadRef.current.scrollTop = threadRef.current.scrollHeight }, 50)
  }, [meta.id])

  useEffect(() => {
    fetchNotas()
    const ch = supabase.channel(`notas-${meta.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'meta_notas', filter: `meta_id=eq.${meta.id}` }, fetchNotas)
      .subscribe()
    return () => supabase.removeChannel(ch)
  }, [fetchNotas])

  async function enviar() {
    if (!novaNota.trim()) return
    setEnviando(true)
    setErraNota('')
    const nome = session.user.user_metadata?.nome ?? session.user.email?.replace('@aguia.com', '') ?? 'Usuário'
    const payload = {
      meta_id: meta.id,
      user_id: session.user.id,
      autor_nome: nome,
      autor_papel: papel ?? 'Usuário',
      conteudo: novaNota.trim(),
    }
    console.log('[MetaNotas] enviando:', payload)
    const { error } = await supabase.from('meta_notas').insert(payload)
    if (error) {
      console.error('[MetaNotas] erro:', error)
      setErraNota(error.message)
    } else {
      setNovaNota('')
    }
    setEnviando(false)
  }

  return (
    <Modal title={meta.nome} onClose={onClose} size="xl">
      <div className="flex flex-col gap-4">
        {/* Resumo da meta */}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {[{l:'Setor',v:meta.setores?.nome??'—'},{l:'Peso PPR',v:`${meta.peso??0}%`},{l:'Tipo',v:tipoLabel},{l:'Prazo',v:`Dia ${meta.dia_lancamento??28}`}]
            .map(({l,v})=>(
              <div key={l} className="bg-white/5 rounded-lg px-3 py-2">
                <p className="text-[10px] text-slate-500 uppercase tracking-wider">{l}</p>
                <p className="text-sm text-white font-medium mt-0.5 truncate">{v}</p>
              </div>
          ))}
        </div>

        {/* Config PPR */}
        {parsedRanges && (
          <div className="bg-white/5 rounded-lg px-3 py-2.5">
            <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-2">Configuração PPR</p>
            {(meta.tipo_calculo==='booleano'||meta.tipo_calculo==='BOOLEANO') && (
              <div className="flex gap-2 flex-wrap">
                <span className="text-xs font-mono bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded text-emerald-300">{parsedRanges.valor_sucesso} = 100%</span>
                <span className="text-xs font-mono bg-red-500/10 border border-red-500/20 px-2 py-0.5 rounded text-red-300">{parsedRanges.valor_falha} = 0%</span>
              </div>
            )}
            {(meta.tipo_calculo==='categorico'||meta.tipo_calculo==='CATEGORICO') && Array.isArray(parsedRanges) && (
              <div className="flex gap-1.5 flex-wrap">{parsedRanges.map((c,i)=>(
                <span key={i} className="text-xs font-mono bg-purple-500/10 border border-purple-500/20 px-2 py-0.5 rounded text-purple-200">{c.categoria} = {c.percentual}%</span>
              ))}</div>
            )}
            {Array.isArray(parsedRanges) && !['booleano','BOOLEANO','categorico','CATEGORICO'].includes(meta.tipo_calculo) && (
              <div className="flex gap-1.5 flex-wrap">{parsedRanges.map((r,i)=>(
                <span key={i} className="text-xs font-mono bg-brand-500/10 border border-brand-500/20 px-2 py-0.5 rounded text-brand-200">{r.de}–{r.ate||'∞'} = {r.percentual}%</span>
              ))}</div>
            )}
          </div>
        )}

        {/* Thread de notas */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Notas da equipe</span>
            <div className="flex-1 h-px bg-white/8" />
            <span className="text-[10px] text-slate-600">{notas.length} nota{notas.length!==1?'s':''}</span>
          </div>
          <div ref={threadRef} className="flex flex-col gap-3 max-h-60 overflow-y-auto pr-1 mb-3">
            {carregando && (
              <div className="flex items-center justify-center py-8 gap-2 text-slate-500">
                <div className="w-3.5 h-3.5 border border-brand-500 border-t-transparent rounded-full animate-spin"/>
                <span className="text-xs">Carregando...</span>
              </div>
            )}
            {!carregando && notas.length===0 && (
              <div className="text-center py-8 text-slate-600 text-xs">Nenhuma nota ainda. Seja o primeiro a registrar!</div>
            )}
            {notas.map(nota => {
              const cor = getCor(nota.autor_papel)
              const isOwn = nota.user_id === session.user.id
              const ini = nota.autor_nome.split(' ').filter(Boolean).map(n=>n[0]).join('').slice(0,2).toUpperCase()
              return (
                <div key={nota.id} className={`flex gap-2.5 ${isOwn?'flex-row-reverse':''}`}>
                  <div className={`w-7 h-7 rounded-full ${cor.av} flex items-center justify-center text-[10px] font-bold flex-shrink-0 text-white uppercase`}>{ini}</div>
                  <div className={`flex flex-col gap-0.5 ${isOwn?'items-end':'items-start'} max-w-[85%]`}>
                    <div className={`flex items-center gap-1.5 mb-0.5 ${isOwn?'flex-row-reverse':''}`}>
                      <span className="text-[11px] font-semibold text-slate-300 truncate">{nota.autor_nome}</span>
                      <span className={`text-[9px] px-1.5 py-0.5 rounded border font-mono ${cor.badge}`}>{nota.autor_papel}</span>
                      <span className="text-[9px] text-slate-600">{formatarTempo(nota.created_at)}</span>
                    </div>
                    <div className={`px-3 py-2 rounded-2xl text-sm text-slate-200 leading-relaxed whitespace-pre-wrap w-fit ${
                      isOwn 
                        ? 'bg-brand-500/20 border border-brand-500/30 rounded-tr-none text-right' 
                        : 'bg-white/5 border border-white/10 rounded-tl-none'
                    }`}>{nota.conteudo}</div>
                  </div>
                </div>
              )
            })}
          </div>
          {erraNota && (
            <p className="text-red-400 text-xs bg-red-500/10 border border-red-500/20 rounded px-3 py-1.5 mb-1">
              Erro: {erraNota}
            </p>
          )}
          <div className="flex gap-2">
            <textarea
              className="input flex-1 resize-none text-sm py-2 px-3 bg-white/5 border-white/10 focus:border-brand-500/50"
              placeholder="Escreva uma nota... (Shift+Enter para pular linha)"
              value={novaNota}
              onChange={e=>setNovaNota(e.target.value)}
              onKeyDown={e=>{
                if(e.key==='Enter' && !e.shiftKey) {
                  e.preventDefault();
                  enviar();
                }
              }}
              rows={2}
              maxLength={1000}
            />
            <button onClick={enviar} disabled={enviando||!novaNota.trim()} className="btn-primary w-10 h-10 flex items-center justify-center rounded-xl self-end">
              {enviando ? (
                <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
              ) : (
                <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current rotate-90">
                  <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                </svg>
              )}
            </button>
          </div>
          <p className="text-[10px] text-slate-600 mt-1">Ctrl+Enter para enviar · {novaNota.length}/1000</p>
        </div>
      </div>
    </Modal>
  )
}

// ─── Helpers de status ────────────────────────────────────────────────────────

const STATUS_CONFIG = {
  concluida: {
    label: 'Concluída',
    icon: '✓',
    bar: 'bg-emerald-500',
    badge: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    glow: 'shadow-emerald-500/10',
  },
  em_progresso: {
    label: 'Em Progresso',
    icon: '◑',
    bar: 'bg-blue-500',
    badge: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
    glow: 'shadow-blue-500/10',
  },
  parcial: {
    label: 'Parcial',
    icon: '◔',
    bar: 'bg-amber-500',
    badge: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
    glow: 'shadow-amber-500/10',
  },
  atrasada: {
    label: 'Atrasada',
    icon: '⚠',
    bar: 'bg-red-500',
    badge: 'bg-red-500/15 text-red-400 border-red-500/30',
    glow: 'shadow-red-500/10',
  },
  pendente: {
    label: 'Pendente',
    icon: '○',
    bar: 'bg-slate-600',
    badge: 'bg-slate-700/60 text-slate-400 border-slate-600/40',
    glow: '',
  },
}

function getStatusKey(lancamento, meta) {
  if (!lancamento) {
    // Verifica se está atrasada (sem lançamento e passou o dia limite)
    const hoje = new Date()
    const diaLimite = Number(meta.dia_lancamento ?? 28)
    if (hoje.getDate() > diaLimite) return 'atrasada'
    return 'pendente'
  }
  const pct = Number(lancamento.percentual_atingido ?? 0)
  const statusLanc = lancamento.status ?? ''
  if (statusLanc === 'APROVADO' || pct >= 100) return 'concluida'
  if (pct > 0 && pct < 100) return 'parcial'
  if (statusLanc === 'AGUARDANDO_APROVACAO' || statusLanc === 'EM_PROGRESSO') return 'em_progresso'
  return 'pendente'
}

function MetaCard({ meta, onEdit, onDelete, onToggleAtivo, podeEditar, podeExcluir, totalPesoSetor, numMetasSetor, lancamento, onLancar, podeMovimentarLancamento, onVerNotas }) {
  const pct = meta.peso ? `${meta.peso}%` : '—'
  const isAtiva = meta.ativa !== false
  const pesoEquitativo = numMetasSetor > 0 && totalPesoSetor > 0
    ? (totalPesoSetor / numMetasSetor).toFixed(2)
    : null

  let parsedRanges = meta.ranges
  if (typeof parsedRanges === 'string') {
    try { parsedRanges = JSON.parse(parsedRanges) } catch(e) { parsedRanges = null }
  }

  const isBooleano = meta.tipo_calculo === 'BOOLEANO' || meta.tipo_calculo === 'booleano'
  const isCategorico = meta.tipo_calculo === 'CATEGORICO' || meta.tipo_calculo === 'categorico'
  const isMarginal = meta.tipo_calculo === 'MARGINAL' || meta.tipo_calculo === 'range' || !meta.tipo_calculo

  const statusKey = getStatusKey(lancamento, meta)
  const statusCfg = STATUS_CONFIG[statusKey]
  const progressPct = lancamento ? Math.min(100, Math.max(0, Number(lancamento.percentual_atingido ?? 0))) : 0
  const valorReal = lancamento?.valor_real

  return (
    <div className={`card p-0 overflow-hidden transition-all ${
      isAtiva ? '' : 'opacity-50'
    }`}>
      {/* Barra de progresso topo */}
      <div className="h-0.5 w-full bg-white/5 relative">
        <div
          className={`h-full transition-all duration-700 ease-out ${statusCfg.bar}`}
          style={{ width: `${progressPct}%` }}
        />
      </div>

      <div className="p-4">
        {/* Header */}
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
            {podeMovimentarLancamento && isAtiva && (
              <button
                onClick={() => onLancar(meta)}
                className="btn py-1 px-2.5 text-xs font-semibold text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10"
                title="Lançar valor desta meta"
              >
                ⊕ Lançar
              </button>
            )}
            {podeEditar && (
              <button onClick={() => onEdit(meta)} className="btn py-1 px-2 text-xs" title="Editar meta">✎</button>
            )}
            {podeEditar && (
              <button onClick={() => onToggleAtivo(meta)} className="btn py-1 px-2 text-xs text-slate-400" title={isAtiva ? 'Inativar meta (Pausar)' : 'Ativar meta (Retomar)'}>
                {isAtiva ? '⏸' : '▶'}
              </button>
            )}
            {podeExcluir && (
              <button onClick={() => onDelete(meta)} className="btn-danger py-1 px-2 text-xs" title="Excluir meta">✕</button>
            )}
          </div>
        </div>

        {/* Status visual */}
        <div className={`flex items-center justify-between mb-3 px-3 py-2 rounded-lg border ${
          statusCfg.badge
        }`}>
          <span className="flex items-center gap-1.5 text-xs font-medium">
            <span className="text-base leading-none">{statusCfg.icon}</span>
            {statusCfg.label}
          </span>
          <div className="text-right">
            {progressPct > 0 ? (
              <span className="text-sm font-mono font-bold">{progressPct.toFixed(0)}%</span>
            ) : (
              <span className="text-xs opacity-50">—</span>
            )}
            {valorReal !== undefined && valorReal !== null && (
              <p className="text-[10px] opacity-70 mt-0">
                Último: {valorReal} {meta.unidade ?? ''}
              </p>
            )}
          </div>
        </div>

        {/* Barra de progresso interna */}
        <div className="mb-3">
          <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-700 ease-out ${statusCfg.bar}`}
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <div className="flex justify-between mt-1 text-[9px] text-slate-600 font-mono">
            <span>0%</span>
            <span>100%</span>
          </div>
        </div>

        {/* Info grid */}
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

        {pesoEquitativo !== null && (
          <div className="mt-2.5 pt-2.5 border-t border-white/5 flex items-center gap-2 text-[10px] text-slate-600 flex-wrap">
            <span className="font-mono">{numMetasSetor} meta{numMetasSetor !== 1 ? 's' : ''} no setor</span>
            <span>·</span>
            <span className="font-mono">{totalPesoSetor % 1 === 0 ? totalPesoSetor : Number(totalPesoSetor).toFixed(2)}% PPR do setor</span>
            <span>·</span>
            <span className="font-mono text-slate-500">≈{pesoEquitativo}% por meta</span>
          </div>
        )}

        {/* Configuração da meta */}
        {(isBooleano && parsedRanges) && (
          <div className="mt-3 pt-3 border-t border-white/8">
            <p className="text-[10px] text-slate-600 uppercase tracking-wider mb-1.5">Booleano PPR</p>
            <div className="flex flex-wrap gap-2">
              <span className="text-[10px] font-mono bg-green-500/10 border border-green-500/20 px-2 py-0.5 rounded text-green-300">
                {parsedRanges.valor_sucesso} = 100%
              </span>
              <span className="text-[10px] font-mono bg-red-500/10 border border-red-500/20 px-2 py-0.5 rounded text-red-300">
                {parsedRanges.valor_falha} = 0%
              </span>
            </div>
          </div>
        )}

        {(isCategorico && Array.isArray(parsedRanges)) && (
          <div className="mt-3 pt-3 border-t border-white/8">
            <p className="text-[10px] text-slate-600 uppercase tracking-wider mb-1.5">Categorias PPR</p>
            <div className="flex flex-wrap gap-1">
              {parsedRanges.map((c, i) => (
                <span key={i} className="text-[10px] font-mono bg-purple-500/10 border border-purple-500/20 px-2 py-0.5 rounded text-purple-200">
                  {c.categoria} = {c.percentual}%
                </span>
              ))}
            </div>
          </div>
        )}

        {(isMarginal && Array.isArray(parsedRanges)) && (
          <div className="mt-3 pt-3 border-t border-white/8">
            <p className="text-[10px] text-slate-600 uppercase tracking-wider mb-1.5">Faixas PPR</p>
            <div className="flex flex-wrap gap-1">
              {parsedRanges.map((r, i) => (
                <span key={i} className="text-[10px] font-mono bg-brand-500/10 border border-brand-500/20 px-2 py-0.5 rounded text-brand-200">
                  {r.de}–{r.ate || '∞'} = {r.percentual}%
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Footer: botão de notas */}
        <div className="mt-3 pt-2.5 border-t border-white/5">
          <button
            onClick={() => onVerNotas(meta)}
            className="w-full flex items-center justify-center gap-1.5 py-1.5 text-xs text-slate-500 hover:text-slate-300 hover:bg-white/5 rounded transition-colors"
          >
            <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
            </svg>
            Ver detalhes &amp; notas da equipe
          </button>
        </div>
      </div>
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
  const [lancamentosMap, setLancamentosMap] = useState({})
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState(null)
  const [modal, setModal] = useState(null)
  const [modalLancamento, setModalLancamento] = useState(null)
  const [modalNotas, setModalNotas] = useState(null) // { meta }
  const [filtroSetor, setFiltroSetor] = useState('')
  const [filtroArea, setFiltroArea] = useState('')
  const [filtroSemestre, setFiltroSemestre] = useState('')
  const [filtroAno, setFiltroAno] = useState('')
  const { setores } = useSetores()
  const { papel, setorIds, metasPermitidas, isAC, isTI, isLM, podeCriarMeta, podeExcluirMeta, podeEditarMeta, podeMovimentarLancamento, isMaster, loading: perfilLoading } = usePerfil(session)
  
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
  
      // T.I (isMaster) e A.C vêem todas as metas sem restrição de setor
      if (!isAC && !isMaster) {
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
  }, [filtroSetor, filtroArea, filtroSemestre, filtroAno, isAC, isMaster, JSON.stringify(setorIds), JSON.stringify(metasPermitidas), perfilLoading, JSON.stringify(setores)])

  // Busca o lançamento mais recente de cada meta (para exibir status no card)
  const fetchLancamentos = useCallback(async () => {
    if (metas.length === 0) return
    const metaIds = metas.map(m => m.id)
    const { data } = await supabase
      .from('lancamentos')
      .select('meta_id, valor_real, percentual_atingido, status, created_at')
      .in('meta_id', metaIds)
      .order('created_at', { ascending: false })

    if (data) {
      // Mantém apenas o lançamento mais recente por meta
      const map = {}
      for (const l of data) {
        if (!map[l.meta_id]) map[l.meta_id] = l
      }
      setLancamentosMap(map)
    }
  }, [metas])

  useEffect(() => {
    fetchMetas()
    const channel = supabase
      .channel('metas-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'metas' }, fetchMetas)
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [fetchMetas])

  useEffect(() => {
    fetchLancamentos()
    if (metas.length === 0) return
    const channel = supabase
      .channel('lancamentos-metas-status')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'lancamentos' }, fetchLancamentos)
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [fetchLancamentos, metas])

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

  async function handleLancar({ meta_id, valor_real, percentual_atingido }) {
    const { error } = await supabase.from('lancamentos').insert({
      meta_id,
      valor_real: String(valor_real),
      percentual_atingido: Number(percentual_atingido),
      status: 'AGUARDANDO_APROVACAO',
      user_id: session.user.id,
    })
    if (error) throw error
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

          {(isAC || isTI) && (
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
        {!loading && !erro && Object.entries(porSetor).map(([setor, metasDoSetor]) => {
          const metasAtivas = metasDoSetor.filter(m => m.ativa !== false)
          const totalPesoSetor = metasAtivas.reduce((s, m) => s + (Number(m.peso) || 0), 0)
          const numMetasSetor = metasAtivas.length
          return (
            <div key={setor} className="mb-8">
              <div className="flex items-center gap-3 mb-3">
                <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{setor}</h2>
                <div className="flex-1 h-px bg-white/8" />
                <span className="text-xs text-slate-600 font-mono">
                  {totalPesoSetor % 1 === 0 ? totalPesoSetor : totalPesoSetor.toFixed(2)}% do PPR · {numMetasSetor} meta{numMetasSetor !== 1 ? 's' : ''}
                </span>
              </div>
              <div className="grid grid-cols-1 gap-3 lg:grid-cols-2 xl:grid-cols-3">
                {metasDoSetor.map(m => (
                  <MetaCard
                    key={m.id}
                    meta={m}
                    lancamento={lancamentosMap[m.id] ?? null}
                    totalPesoSetor={totalPesoSetor}
                    numMetasSetor={numMetasSetor}
                    onEdit={meta => setModal({ modo: 'editar', meta })}
                    onDelete={handleDelete}
                    onToggleAtivo={handleToggleAtivo}
                    onLancar={meta => setModalLancamento({ meta })}
                    onVerNotas={meta => setModalNotas({ meta })}
                    podeEditar={podeEditarMeta}
                    podeExcluir={podeExcluirMeta}
                    podeMovimentarLancamento={podeMovimentarLancamento}
                  />
                ))}
              </div>
            </div>
          )
        })}
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

      {modalLancamento && (
        <LancamentoModal
          meta={modalLancamento.meta}
          lancamentoAtual={lancamentosMap[modalLancamento.meta.id] ?? null}
          onSave={handleLancar}
          onClose={() => setModalLancamento(null)}
        />
      )}

      {modalNotas && (
        <MetaNotasModal
          meta={modalNotas.meta}
          session={session}
          papel={papel}
          onClose={() => setModalNotas(null)}
        />
      )}
    </div>
  )
}
