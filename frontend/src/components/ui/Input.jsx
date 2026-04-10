export default function Input({ label, erro, className = '', ...props }) {
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {label}
        </label>
      )}
      <input
        className={`
          w-full px-3 py-2 text-sm rounded-lg border transition-colors
          bg-white dark:bg-gray-900
          text-gray-900 dark:text-gray-100
          border-gray-300 dark:border-gray-600
          focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
          disabled:bg-gray-50 dark:disabled:bg-gray-800 disabled:cursor-not-allowed
          ${erro ? 'border-red-500 focus:ring-red-500' : ''}
          ${className}
        `}
        {...props}
      />
      {erro && <span className="text-xs text-red-500">{erro}</span>}
    </div>
  )
}