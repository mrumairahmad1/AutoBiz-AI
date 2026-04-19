import { useAuth } from './AuthContext'
import { Navigate } from 'react-router-dom'

export function RoleGuard({ allowedRoles, children }) {
  const { user } = useAuth()

  if (!user) return <Navigate to="/login" />

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--void)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
        <div style={{ textAlign: 'center', maxWidth: '440px', width: '100%', animation: 'fade-up 0.4s var(--ease) both' }}>
          {/* Icon */}
          <div style={{ width: 80, height: 80, borderRadius: 'var(--r-xl)', background: 'rgba(255,77,106,0.08)', border: '1px solid rgba(255,77,106,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 28px' }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--red)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/>
            </svg>
          </div>

          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 800, color: 'var(--text)', marginBottom: 10, letterSpacing: '-0.5px' }}>Access Restricted</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: 15, marginBottom: 6, lineHeight: 1.7 }}>
            You do not have permission to view this page.
          </p>
          <p style={{ color: 'var(--text-dim)', fontSize: 13, marginBottom: 36 }}>
            Current role: <span style={{ color: 'var(--blue-light)', fontWeight: 600, fontFamily: 'var(--font-mono)' }}>{user.role}</span>
          </p>

          <a href="/chat" className="btn btn-primary btn-lg" style={{ display: 'inline-flex' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
            Back to Chat
          </a>
        </div>
      </div>
    )
  }

  return children
}