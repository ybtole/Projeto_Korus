import { Link, useLocation, useNavigate, Outlet } from 'react-router-dom'
import {
  LayoutDashboard, Target, FileText, CheckCircle,
  GitBranch, Users, RefreshCw, BarChart2, User,
  LogOut, Sun, Moon
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useTheme } from '../../context/ThemeContext'
import NotificationBell from '../ui/NotificationBell'
import EmailPopup from '../ui/EmailPopup'

const navItens = [
  { caminho: '/', icone: LayoutDashboard, label: 'Dashboard', roles: ['ADMIN','ESPECIALISTA_CUSTO','GESTOR','OPERADOR'] },
  { caminho: '/metas', icone: Target, label: 'Metas', roles: ['ADMIN','ESPECIALISTA_CUSTO','GESTOR','OPERADOR'] },
  { caminho: '/lancamentos', icone: FileText, label: 'Lançamentos', roles: ['ADMIN','ESPECIALISTA_CUSTO','GESTOR','OPERADOR'] },
  { caminho: '/aprovacoes', icone: CheckCircle, label: 'Aprovações', roles: ['ADMIN','ESPECIALISTA_CUSTO'] },
  { caminho: '/setores', icone: GitBranch, label: 'Setores', roles: ['ADMIN'] },
  { caminho: '/usuarios', icone: Users, label: 'Usuários', roles: ['ADMIN'] },
  { caminho: '/ciclos', icone: RefreshCw, label: 'Ciclos PPR', roles: ['ADMIN'] },
  { caminho: '/resultado-ppr', icone: BarChart2, label: 'Resultado PPR', roles: ['ADMIN','ESPECIALISTA_CUSTO','GESTOR'] },
]

export default function Layout({ children }) {
  const { usuario, logout } = useAuth()
  const { tema, alternarTema } = useTheme()
  const location = useLocation()
  const navigate = useNavigate()

  const itensFiltrados = navItens.filter(i => i.roles.includes(usuario?.role))

  function handleLogout() {
    logout()
    navigate('/login')
  }

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-950 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-56 flex-shrink-0 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 flex flex-col">
        <div className="px-4 py-5 border-b border-gray-100 dark:border-gray-800">
          <span className="text-lg font-bold text-blue-600 tracking-tight">KORUS</span>
          <p className="text-xs text-gray-400 mt-0.5">Gestão de PPR</p>
        </div>

        <nav className="flex-1 px-2 py-3 overflow-y-auto">
          {itensFiltrados.map(item => {
            const ativo = location.pathname === item.caminho
            return (
              <Link
                key={item.caminho}
                to={item.caminho}
                className={`
                  flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium mb-0.5 transition-colors
                  ${ativo
                    ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-100'
                  }
                `}
              >
                <item.icone size={16} />
                {item.label}
              </Link>
            )
          })}
        </nav>

        <div className="p-3 border-t border-gray-100 dark:border-gray-800">
          <Link to="/perfil" className="flex items-center gap-2 px-2 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
            <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
              {usuario?.nome?.[0]?.toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium text-gray-800 dark:text-gray-200 truncate">{usuario?.nome}</p>
              <p className="text-xs text-gray-400 truncate">{usuario?.role}</p>
            </div>
          </Link>
        </div>
      </aside>

      {/* Conteúdo */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 flex items-center justify-end gap-2 px-4 flex-shrink-0">
          <NotificationBell />
          <button
            onClick={alternarTema}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            {tema === 'claro'
              ? <Moon size={16} className="text-gray-600 dark:text-gray-400" />
              : <Sun size={16} className="text-gray-600 dark:text-gray-400" />
            }
          </button>
          <button
            onClick={handleLogout}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            title="Sair"
          >
            <LogOut size={16} className="text-gray-600 dark:text-gray-400" />
          </button>
        </header>

        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>

      <EmailPopup />
    </div>
  )
}