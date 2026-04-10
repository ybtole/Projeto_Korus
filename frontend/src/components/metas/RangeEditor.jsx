import { Plus, Trash2 } from 'lucide-react'
import Button from '../ui/Button'
import Input from '../ui/Input'
import Select from '../ui/Select'

const opcoesOperador = [
  { value: '>=', label: '>= (maior ou igual)' },
  { value: '<=', label: '<= (menor ou igual)' },
]

export default function RangeEditor({ ranges, onChange }) {
  function adicionar() {
    onChange([...ranges, { valor_minimo: '', operador: '>=', percentual_resultado: '' }])
  }

  function remover(idx) {
    onChange(ranges.filter((_, i) => i !== idx))
  }

  function atualizar(idx, campo, valor) {
    onChange(ranges.map((r, i) => i === idx ? { ...r, [campo]: valor } : r))
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Ranges de resultado</label>
        <Button variante="secundario" tamanho="sm" onClick={adicionar} type="button">
          <Plus size={14} /> Adicionar range
        </Button>
      </div>

      {ranges.length === 0 && (
        <p className="text-xs text-gray-400 text-center py-4 border border-dashed border-gray-300 dark:border-gray-600 rounded-lg">
          Nenhum range cadastrado. Adicione pelo menos um.
        </p>
      )}

      {ranges.map((r, idx) => (
        <div key={idx} className="flex gap-2 items-end bg-gray-50 dark:bg-gray-800/50 p-3 rounded-lg">
          <Select
            label={idx === 0 ? 'Operador' : undefined}
            options={opcoesOperador}
            value={r.operador}
            onChange={e => atualizar(idx, 'operador', e.target.value)}
            className="w-44"
          />
          <Input
            label={idx === 0 ? 'Valor' : undefined}
            type="number"
            placeholder="Ex: 10"
            value={r.valor_minimo}
            onChange={e => atualizar(idx, 'valor_minimo', e.target.value)}
            className="w-32"
          />
          <div className="flex flex-col gap-1 w-32">
            {idx === 0 && <label className="text-sm font-medium text-gray-700 dark:text-gray-300">% PPR</label>}
            <div className="relative">
              <input
                type="number" min="0" max="100"
                placeholder="100"
                value={r.percentual_resultado}
                onChange={e => atualizar(idx, 'percentual_resultado', e.target.value)}
                className="w-full px-3 py-2 pr-7 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-gray-400">%</span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => remover(idx)}
            className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
          >
            <Trash2 size={14} />
          </button>
        </div>
      ))}

      {ranges.length > 0 && (
        <p className="text-xs text-gray-400">
          Os ranges são verificados de cima para baixo. O primeiro que satisfizer a condição será aplicado.
        </p>
      )}
    </div>
  )
}