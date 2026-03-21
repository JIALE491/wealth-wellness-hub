import { createContext, useContext, useState, useEffect } from 'react'
import axios from 'axios'
import { loginApi, registerApi, getMeApi } from '../api/authApi'

const AuthContext = createContext(null)

// Attach JWT to every axios request
axios.interceptors.request.use(config => {
  const token = localStorage.getItem('ventura_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('ventura_token')
    if (token) {
      getMeApi()
        .then(u => { setUser(u); setLoading(false) })
        .catch(() => { localStorage.removeItem('ventura_token'); setLoading(false) })
    } else {
      setLoading(false)
    }
  }, [])

  const login = async (email, password) => {
    const data = await loginApi(email, password)
    localStorage.setItem('ventura_token', data.token)
    setUser({ email: data.email, name: data.name })
    return data
  }

  const register = async (name, email, password) => {
    const data = await registerApi(name, email, password)
    localStorage.setItem('ventura_token', data.token)
    setUser({ email: data.email, name: data.name })
    return data
  }

  const logout = () => {
    localStorage.removeItem('ventura_token')
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
