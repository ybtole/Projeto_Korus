import { useState, useEffect, useRef } from 'react'
import { Bell } from 'lucide-react'
import api from '../../services/api'
import Badge from './Badge'

export default function NotificationBell() {
  const [notificacoes, setNotificacoes] = useState([])
  const [aberto, setAberto] = useState(false)
  const ref = useRef()

  useEffect(() => {
    buscar()
    const interval = setInterval(buscar, 30000) // poll a cada 30s
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    function fechar(e) {
      if (ref.current && !ref.current.contains(e.target)) setAberto(false)
    }
    document.addEventListener('mousedown', fechar)
    return () => document.removeEventListener('mousedown', fechar)
  }, [])

  async function buscar() {
    try {
      const res = await api.get('/notificacoes')
      setNotificacoes(res.data)
    } catch {}
  }

  async function marcarLida(id) {
    await api.put(`/notificacoes/${id}/lida`)
    setNotificacoes(n => n.map(x => x.id === id ? { ...x, lida: true } : x))
  }

  async function marcarTodas() {
    await api.put('/notificacoes/todas-lidas')
    setNotificacoes(n => n.map(x => ({ ...x, lida: true })))
  }

  const naoLidas = notificacoes.filter(n => !n.lida).length

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setAberto(a => !a)}
        className="relative p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
      >
        <Bell size={18} className="text-gray-600 dark:text-gray-400" />
        {naoLidas > 0 && (
          <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center leading-none">
            {naoLidas > 9 ? '9+' : naoLidas}
          </span>
        )}
      </button>

      {aberto && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-white dark:bg-gray-900 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 z-50">
          <div className="flex items-center justify-between p-3 border-b border-gray-100 dark:border-gray-800">
            <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">Notificações</span>
            {naoLidas > 0 && (
              <button onClick={marcarTodas} className="text-xs text-blue-600 dark:text-blue-400 hover:underline">
                Marcar todas como lidas
              </button>
            )}
          </div>
          <div className="max-h-80 overflow-y-auto">
            {notificacoes.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6">Sem notificações</p>
            ) : (
              notificacoes.slice(0, 20).map(n => (
                <div
                  key={n.id}
                  onClick={() => !n.lida && marcarLida(n.id)}
                  className={`px-4 py-3 border-b border-gray-50 dark:border-gray-800 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors ${!n.lida ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''}`}
                >
                  <div className="flex items-start gap-2">
                    {!n.lida && <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-blue-500 flex-shrink-0" />}
                    <div className={!n.lida ? '' : 'pl-3.5'}>
                      <p className="text-xs font-medium text-gray-900 dark:text-gray-100">{n.titulo}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{n.mensagem}</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}