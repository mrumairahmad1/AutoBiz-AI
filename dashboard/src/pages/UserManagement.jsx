import React, { useEffect, useState, useCallback } from 'react'
import API from '../api/axios'
import Navbar from '../components/Navbar.jsx'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { useNavigate } from 'react-router-dom'

const ROLE_CFG = {
  admin:   { badge:'badge-red',   label:'Admin'   },
  manager: { badge:'badge-amber', label:'Manager' },
  viewer:  { badge:'badge-blue',  label:'Viewer'  },
}
const checkPwd = p => [
  { ok: p.length >= 8,                               msg: 'At least 8 characters'  },
  { ok: /[A-Z]/.test(p),                             msg: 'One uppercase letter'   },
  { ok: /[a-z]/.test(p),                             msg: 'One lowercase letter'   },
  { ok: /[0-9]/.test(p),                             msg: 'One number'             },
  { ok: /[!@#$%^&*()\-_=+\[\]{}|;:,.<>?]/.test(p),  msg: 'One special character'  },
]
const EyeOpen   = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
const EyeClosed = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>

/* ── Confirm Dialog (no browser confirm()) ─────────────────── */
function ConfirmDialog({ message, onConfirm, onCancel }) {
  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onCancel() }}>
      <div className="modal-box" style={{ maxWidth:400 }}>
        <h3 className="modal-title" style={{ marginBottom:12 }}>Confirm Action</h3>
        <p style={{ fontSize:14, color:'var(--text-muted)', marginBottom:24, lineHeight:1.6 }}>{message}</p>
        <div style={{ display:'flex', gap:10, justifyContent:'flex-end' }}>
          <button className="btn btn-ghost" onClick={onCancel}>Cancel</button>
          <button className="btn btn-danger" onClick={onConfirm}>Confirm</button>
        </div>
      </div>
    </div>
  )
}

export default function UserManagement() {
  const [users,      setUsers]      = useState([])
  const [loading,    setLoading]    = useState(true)
  const [showForm,   setShowForm]   = useState(false)
  const [form,       setForm]       = useState({ email:'', password:'', role:'viewer' })
  const [showPwd,    setShowPwd]    = useState(false)
  const [formErr,    setFormErr]    = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [confirm,    setConfirm]    = useState(null) // { message, onConfirm }
  const { user } = useAuth()
  const { addToast } = useToast()
  const navigate = useNavigate()

  useEffect(() => {
    if (user?.role !== 'admin') { navigate('/chat'); return }
    fetchUsers()
    const t = setInterval(fetchUsers, 15000)
    return () => clearInterval(t)
  }, [])

  const fetchUsers = useCallback(async () => {
    try {
      const r = await API.get('/auth/users')
      setUsers((r.data || []).map(u => ({
        ...u,
        role: typeof u.role === 'object' ? (u.role.value || String(u.role)) : String(u.role || 'viewer')
      })))
    } catch(e) { console.error(e) }
    finally { setLoading(false) }
  }, [])

  const pwdRules = checkPwd(form.password)

  const handleRegister = async () => {
    setFormErr('')
    if (!form.email.trim()) { setFormErr('Email is required.'); return }
    const fails = pwdRules.filter(r => !r.ok)
    if (fails.length) { setFormErr(fails[0].msg); return }
    setSubmitting(true)
    try {
      await API.post('/auth/register', form)
      addToast(`User ${form.email} created with role: ${form.role}.`, 'success')
      setShowForm(false)
      setForm({ email:'', password:'', role:'viewer' })
      fetchUsers()
    } catch(e) {
      const d = e.response?.data?.detail
      setFormErr(typeof d === 'string' ? d : 'Failed to create user.')
    } finally { setSubmitting(false) }
  }

  const handleRoleChange = (uid, email, newRole) => {
    setConfirm({
      message: `Change ${email}'s role to ${newRole}?`,
      onConfirm: async () => {
        setConfirm(null)
        try {
          await API.put(`/auth/users/${uid}/role`, { role: newRole })
          addToast(`Role updated to ${newRole} for ${email}.`, 'info')
          fetchUsers()
        } catch(e) { addToast(e.response?.data?.detail || 'Error updating role.', 'error') }
      }
    })
  }

  const handleDelete = (uid, email) => {
    setConfirm({
      message: `Remove user ${email} from the platform? This cannot be undone.`,
      onConfirm: async () => {
        setConfirm(null)
        try {
          await API.delete(`/auth/users/${uid}`)
          addToast(`User ${email} has been removed.`, 'info')
          fetchUsers()
        } catch(e) { addToast(e.response?.data?.detail || 'Error removing user.', 'error') }
      }
    })
  }

  const closeForm = () => { setShowForm(false); setForm({ email:'', password:'', role:'viewer' }); setFormErr(''); setShowPwd(false) }

  return (
    <div style={{ background:'var(--void)', minHeight:'100vh' }}>
      <div className="grid-bg"/><Navbar/>
      <div style={{ padding:'32px 40px', maxWidth:1300, margin:'0 auto', position:'relative', zIndex:1 }}>

        <div className="page-header">
          <div>
            <h1 className="page-title">User Management</h1>
            <p className="page-subtitle">{users.length} registered users · auto-refreshes every 15 seconds</p>
          </div>
          <button className="btn btn-primary" onClick={() => setShowForm(true)}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Add User
          </button>
        </div>

        {/* Stats */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:16, marginBottom:24 }}>
          {[
            { label:'Admins',   value:users.filter(u=>u.role==='admin').length,   color:'var(--red)'        },
            { label:'Managers', value:users.filter(u=>u.role==='manager').length, color:'var(--amber)'      },
            { label:'Viewers',  value:users.filter(u=>u.role==='viewer').length,  color:'var(--blue-light)' },
            { label:'Total',    value:users.length,                                color:'var(--text)'       },
          ].map(s => (
            <div key={s.label} className="stat-card">
              <div className="stat-value" style={{ color:s.color }}>{s.value}</div>
              <div className="stat-label">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Add User Modal */}
        {showForm && (
          <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) closeForm() }}>
            <div className="modal-box" style={{ maxWidth:460 }}>
              <div className="modal-header">
                <h3 className="modal-title">Add New User</h3>
                <button className="modal-close" onClick={closeForm}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              </div>
              {formErr && <div className="alert alert-error" style={{ marginBottom:16 }}>{formErr}</div>}
              <div className="form-group">
                <label className="form-label">Email <span style={{ color:'var(--red)' }}>*</span></label>
                <input className="form-input" type="email" value={form.email}
                  onChange={e => setForm({...form,email:e.target.value})} placeholder="user@company.com"/>
              </div>
              <div className="form-group">
                <label className="form-label">Password <span style={{ color:'var(--red)' }}>*</span></label>
                <div style={{ position:'relative' }}>
                  <input className="form-input" type={showPwd?'text':'password'} style={{ paddingRight:44 }}
                    value={form.password} onChange={e => setForm({...form,password:e.target.value})}
                    placeholder="Min. 8 chars, uppercase, number, special"/>
                  <button type="button" onClick={() => setShowPwd(p=>!p)}
                    style={{ position:'absolute', right:12, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', color:'var(--text-muted)', display:'flex', padding:4 }}>
                    {showPwd ? <EyeClosed/> : <EyeOpen/>}
                  </button>
                </div>
                {form.password.length > 0 && (
                  <div style={{ marginTop:8, display:'flex', flexDirection:'column', gap:3 }}>
                    {pwdRules.map(r => (
                      <div key={r.msg} style={{ display:'flex', alignItems:'center', gap:6, fontSize:12, color:r.ok?'var(--green)':'var(--text-muted)' }}>
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                          {r.ok ? <polyline points="20 6 9 17 4 12"/> : <><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>}
                        </svg>
                        {r.msg}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="form-group">
                <label className="form-label">Role</label>
                <select className="form-input" value={form.role} onChange={e => setForm({...form,role:e.target.value})} style={{ cursor:'pointer' }}>
                  <option value="viewer">Viewer</option>
                  <option value="manager">Manager</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div style={{ display:'flex', gap:10, justifyContent:'flex-end', marginTop:8 }}>
                <button className="btn btn-ghost" onClick={closeForm}>Cancel</button>
                <button className="btn btn-primary" onClick={handleRegister}
                  disabled={submitting || pwdRules.some(r=>!r.ok) || !form.email.trim()}>
                  {submitting ? <><span className="spinner" style={{ width:14, height:14, borderWidth:2 }}/>Creating...</> : 'Create User'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Confirm Dialog */}
        {confirm && <ConfirmDialog message={confirm.message} onConfirm={confirm.onConfirm} onCancel={() => setConfirm(null)}/>}

        {/* Users Table */}
        {loading ? (
          <div className="loading-screen"><div className="spinner"/><p className="loading-text">Loading users...</p></div>
        ) : users.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/></svg></div>
            <p className="empty-state-title">No users found</p>
            <p className="empty-state-sub">Click "Add User" to create the first user</p>
          </div>
        ) : (
          <div className="card" style={{ overflow:'hidden' }}>
            <div style={{ overflowX:'auto' }}>
              <table className="data-table" style={{ minWidth:560 }}>
                <thead><tr>{['ID','Email','Role','Change Role','Actions'].map(h => <th key={h}>{h}</th>)}</tr></thead>
                <tbody>
                  {users.map(u => {
                    const roleStr = String(u.role || 'viewer').toLowerCase()
                    const rc = ROLE_CFG[roleStr] || ROLE_CFG.viewer
                    return (
                      <tr key={u.id}>
                        <td style={{ color:'var(--text-muted)', fontFamily:'var(--font-mono)', fontSize:12 }}>#{u.id}</td>
                        <td style={{ fontWeight:500, fontSize:13 }}>{u.email}</td>
                        <td><span className={`badge ${rc.badge}`}>{rc.label}</span></td>
                        <td>
                          <select className="form-input" style={{ width:'auto', padding:'6px 12px', fontSize:12, cursor:'pointer' }}
                            value={roleStr} onChange={e => handleRoleChange(u.id, u.email, e.target.value)}>
                            <option value="viewer">Viewer</option>
                            <option value="manager">Manager</option>
                            <option value="admin">Admin</option>
                          </select>
                        </td>
                        <td>
                          <button className="btn btn-danger btn-sm" onClick={() => handleDelete(u.id, u.email)} style={{ gap:5 }}>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/></svg>
                            Remove
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}