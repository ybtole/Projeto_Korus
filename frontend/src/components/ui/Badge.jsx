const cores = {
  PENDENTE:  'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300',
  APROVADO:  'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
  REPROVADO: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
  ATRASADO:  'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300',
  INFO:      'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
  ADMIN:               'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300',
  ESPECIALISTA_CUSTO:  'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300',
  GESTOR:    'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
  OPERADOR:  'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
}

export default function Badge({ texto, tipo, className = '' }) {
  const estilo = cores[tipo] || cores.INFO
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${estilo} ${className}`}>
      {texto || tipo}
    </span>
  )
}