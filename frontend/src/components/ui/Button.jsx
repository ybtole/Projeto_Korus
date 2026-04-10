const variantes = {
  primario: 'bg-blue-600 hover:bg-blue-700 text-white',
  secundario: 'bg-gray-100 hover:bg-gray-200 text-gray-800 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-gray-100',
  perigo: 'bg-red-600 hover:bg-red-700 text-white',
  sucesso: 'bg-green-600 hover:bg-green-700 text-white',
  fantasma: 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300',
}

const tamanhos = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-sm',
  lg: 'px-5 py-2.5 text-base',
}

export default function Button({
  children, variante = 'primario', tamanho = 'md',
  className = '', carregando = false, ...props
}) {
  return (
    <button
      className={`
        inline-flex items-center gap-2 font-medium rounded-lg transition-colors
        disabled:opacity-50 disabled:cursor-not-allowed
        ${variantes[variante]} ${tamanhos[tamanho]} ${className}
      `}
      disabled={carregando || props.disabled}
      {...props}
    >
      {carregando && (
        <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
      )}
      {children}
    </button>
  )
}