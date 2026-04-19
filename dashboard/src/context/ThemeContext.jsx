import React, { createContext, useContext, useEffect } from 'react'

const ThemeContext = createContext()

export const ThemeProvider = ({ children }) => {
  // Dark mode is permanent — no toggle
  useEffect(() => {
    document.body.classList.remove('light')
  }, [])

  // Keep colors object for backwards compatibility with all pages
  const colors = {
    bg:        'var(--void)',
    sidebar:   'var(--deep)',
    card:      'var(--card)',
    border:    'var(--border)',
    text:      'var(--text)',
    textMuted: 'var(--text-muted)',
    primary:   'var(--blue)',
    accent:    'var(--blue-light)',
    success:   'var(--green)',
    warning:   'var(--amber)',
    danger:    'var(--red)',
    input:     'var(--surface)',
    hover:     'var(--elevated)',
    badge:     'var(--elevated)',
  }

  return (
    <ThemeContext.Provider value={{ isDark: true, toggleTheme: () => {}, colors }}>
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = () => useContext(ThemeContext)