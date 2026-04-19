import React, { createContext, useState, useContext, useEffect } from 'react'
import { jwtDecode } from 'jwt-decode'

const AuthContext = createContext()

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [token, setToken] = useState(localStorage.getItem('token'))

  useEffect(() => {
    if (token) {
      try {
        const decoded = jwtDecode(token)
        setUser({ email: decoded.sub, role: decoded.role })
      } catch {
        logout()
      }
    }
  }, [token])

  const login = (accessToken) => {
    localStorage.setItem('token', accessToken)
    setToken(accessToken)
    const decoded = jwtDecode(accessToken)
    setUser({ email: decoded.sub, role: decoded.role })
  }

  const logout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('role')
    setToken(null)
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, token, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)