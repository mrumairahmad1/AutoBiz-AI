import React, { createContext, useContext, useState, useCallback, useRef } from 'react'

const ToastContext = createContext()

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const counter = useRef(0)

  const addToast = useCallback((message, type = 'success', duration = 3500) => {
    const id = ++counter.current
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, duration)
  }, [])

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  const COLORS = {
    success: { bg: 'var(--green)',       border: 'rgba(0,224,150,0.3)',  text: '#fff' },
    error:   { bg: 'var(--red)',         border: 'rgba(255,77,106,0.3)', text: '#fff' },
    warning: { bg: 'var(--amber)',       border: 'rgba(255,181,71,0.3)', text: '#000' },
    info:    { bg: 'var(--blue-light)',  border: 'rgba(29,111,255,0.3)', text: '#fff' },
  }

  const ICONS = {
    success: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>,
    error:   <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
    warning: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
    info:    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>,
  }

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      <div style={{
        position: 'fixed', bottom: 28, right: 28, zIndex: 9999,
        display: 'flex', flexDirection: 'column', gap: 10,
        pointerEvents: 'none',
      }}>
        {toasts.map(toast => {
          const c = COLORS[toast.type] || COLORS.success
          return (
            <div key={toast.id} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              background: 'var(--card)', border: `1px solid ${c.border}`,
              borderLeft: `3px solid ${c.bg}`,
              borderRadius: 'var(--r-lg)', padding: '12px 16px',
              boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
              minWidth: 260, maxWidth: 380,
              animation: 'toast-in 0.25s var(--ease)',
              pointerEvents: 'all', cursor: 'pointer',
              backdropFilter: 'blur(12px)',
            }} onClick={() => removeToast(toast.id)}>
              <div style={{ color: c.bg, flexShrink: 0 }}>{ICONS[toast.type]}</div>
              <span style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.5, flex: 1 }}>
                {toast.message}
              </span>
              <button onClick={(e) => { e.stopPropagation(); removeToast(toast.id) }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-dim)', padding: 2, flexShrink: 0 }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
          )
        })}
      </div>
      <style>{`
        @keyframes toast-in {
          from { opacity:0; transform:translateY(12px) scale(0.96); }
          to   { opacity:1; transform:translateY(0)    scale(1); }
        }
      `}</style>
    </ToastContext.Provider>
  )
}

export const useToast = () => useContext(ToastContext)