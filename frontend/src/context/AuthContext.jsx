import { createContext, useContext, useState, useEffect } from 'react'
import api from '../services/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(null)
  const [carregando, setCarregando] = useState(true)
  const [mostrarPopupEmail, setMostrarPopupEmail] = useState(false)

  useEffect(() => {
    const token = localStorage.getItem('korus_token')
    if (token) {
      api.get('/auth/me')
        .then(res => {
          setUsuario(res.data)
          if (!res.data.email) setMostrarPopupEmail(true)
        })
        .catch(() => localStorage.removeItem('korus_token'))
        .finally(() => setCarregando(false))
    } else {
      setCarregando(false)
    }
  }, [])

  async function login(cpf, senha) {
    const res = await api.post('/auth/login', { cpf, senha })
    localStorage.setItem('korus_token', res.data.token)
    setUsuario(res.data.usuario)
    setCarregando(false)
    if (!res.data.usuario.email) setMostrarPopupEmail(true)
    return res.data.usuario
  }

  function logout() {
    localStorage.removeItem('korus_token')
    setUsuario(null)
  }

  async function salvarEmail(email) {
    await api.put('/auth/email', { email })
    setUsuario(u => ({ ...u, email }))
    setMostrarPopupEmail(false)
  }

  return (
    <AuthContext.Provider value={{
      usuario, carregando, login, logout,
      mostrarPopupEmail, setMostrarPopupEmail, salvarEmail
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}