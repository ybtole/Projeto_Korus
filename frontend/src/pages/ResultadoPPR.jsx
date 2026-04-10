import { useState, useEffect } from 'react'
import api from '../services/api'

function BarraProgresso({ valor, max = 100 }) {
  const pct = Math.min((valor / max) * 100, 100)
  const cor = pct >= 80 ? 'bg-green-500' : pct >= 50 ? 'bg-yellow-500' : 'bg-red-500'
  return (
    <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-2">
      <div className={`${cor} h-2 rounded-full transition-all duration-500`} style={{ width: `${pct}%` }} />
    </div>
  )
}

export default function ResultadoPPR() {
  const [ciclos, setCiclos] = useState([])
  const [cicloId, setCicloId] = useState('')
  const [resultado, setResultado] = useState(null)
  const [carregando, setCarregando] = useState(false)

  useEffect(() => {
    api.get('/ciclos').then(r => {
      setCiclos(r.data)
      const ativo = r.data.find(c => c.ativo)
      if (ativo) setCicloId(String(ativo.id))
    })
  }, [])

  useEffect(() => {
    if (!cicloId) return
    setCarregando(true)
    api.get('/dashboard/resultado-ppr', { params: { ciclo_id: cicloId } })
      .then(r => setResultado(r.data))
      .finally(() => setCarregando(false))
  }, [cicloId])

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Resultado PPR</h1>
        <select
          value={cicloId}
          onChange={e => setCicloId(e.target.value)}
          className="px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Selecione o ciclo...</option>
          {ciclos.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
        </select>
      </div>

      {carregando && <div className="text-center py-12 text-gray-400">Calculando...</div>}

      {resultado && !carregando && (
        <>
          {/* Total */}
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6 mb-6">
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">PPR Total do Ciclo</p>
            <div className="flex items-end gap-3 mb-3">
              <span className="text-4xl font-bold text-gray-900 dark:text-gray-100">
                {resultado.ppr_total.toFixed(1)}%
              </span>
              <span className="text-sm text-gray-400 mb-1">de 100%</span>
            </div>
            <BarraProgresso valor={resultado.ppr_total} />
          </div>

          {/* Por meta */}
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Detalhamento por meta</h2>
          <div className="flex flex-col gap-3">
            {resultado.metas.map(m => (
              <div key={m.meta_id} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{m.meta_nome}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{m.setor_nome} · Peso {m.peso}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-gray-900 dark:text-gray-100">{m.resultado_ppr.toFixed(1)}%</p>
                    <p className="text-xs text-gray-400">de {m.participacao_ppr.toFixed(1)}% possíveis</p>
                  </div>
                </div>
                <BarraProgresso valor={m.resultado_ppr} max={m.participacao_ppr || 100} />
                <p className="text-xs text-gray-400 mt-1.5">Média mensal: {m.media_percentual}%</p>
              </div>
            ))}
          </div>
        </>
      )}

      {!cicloId && !carregando && (
        <div className="text-center py-12 text-gray-400">Selecione um ciclo para visualizar o resultado.</div>
      )}
    </div>
  )
}