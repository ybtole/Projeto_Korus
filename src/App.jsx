import { useState, useEffect } from 'react'
import { supabase } from './lib/supabase'
import { ThemeProvider } from './hooks/useTheme'
import LoginPage from './pages/LoginPage'
import MainLayout from './pages/MainLayout'

export default function App() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-brand-900">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-slate-400 text-sm font-mono">Carregando...</span>
        </div>
      </div>
    )
  }

  return (
    <ThemeProvider>
      {session ? <MainLayout session={session} /> : <LoginPage />}
    </ThemeProvider>
  )
}
