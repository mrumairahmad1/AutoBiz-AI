import React, { useState, useRef, useEffect, useCallback } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import API from '../api/axios'

/* ── Icons ─────────────────────────────────────────────────── */
const Icon = ({ d, size = 15 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
)
const NAV_ICONS = {
  '/chat':      'd="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"',
  '/dashboard': null,
  '/inventory': 'd="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"',
  '/sales':     'd="M12 1v22M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"',
  '/orders':    'd="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"',
  '/users':     'd="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 7a4 4 0 100 8 4 4 0 000-8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"',
  '/db-setup':  'd="M12 2C6.48 2 2 4.24 2 7v10c0 2.76 4.48 5 10 5s10-2.24 10-5V7c0-2.76-4.48-5-10-5z"',
}
const ROLE_CFG = {
  admin:   { label:'Admin',   color:'var(--red)',        bg:'rgba(255,77,106,0.12)'  },
  manager: { label:'Manager', color:'var(--amber)',      bg:'rgba(255,181,71,0.12)'  },
  viewer:  { label:'Viewer',  color:'var(--blue-light)', bg:'rgba(29,111,255,0.12)'  },
}
const checkPwd = p => [
  { ok: p.length >= 8,                                msg: 'At least 8 characters'  },
  { ok: /[A-Z]/.test(p),                              msg: 'One uppercase letter'   },
  { ok: /[a-z]/.test(p),                              msg: 'One lowercase letter'   },
  { ok: /[0-9]/.test(p),                              msg: 'One number'             },
  { ok: /[!@#$%^&*()\-_=+\[\]{}|;:,.<>?]/.test(p),   msg: 'One special character'  },
]

/* ── Change Password Modal ─────────────────────────────────── */
function ChangePwdModal({ onClose }) {
  const [old,  setOld]  = useState('')
  const [nw,   setNw]   = useState('')
  const [conf, setConf] = useState('')
  const [showO,setShowO]= useState(false)
  const [showN,setShowN]= useState(false)
  const [err,  setErr]  = useState('')
  const [done, setDone] = useState(false)
  const [busy, setBusy] = useState(false)
  const { addToast } = useToast()
  const rules = checkPwd(nw)
  const valid = rules.every(r => r.ok)
  const match = nw === conf && conf.length > 0

  const submit = async () => {
    setErr('')
    if (!old.trim())   { setErr('Current password is required.'); return }
    if (!valid)        { setErr('New password does not meet requirements.'); return }
    if (!match)        { setErr('Passwords do not match.'); return }
    if (old === nw)    { setErr('New password must differ from current.'); return }
    setBusy(true)
    try {
      await API.post('/auth/change-password', { old_password: old, new_password: nw })
      setDone(true)
      addToast('Password changed successfully.', 'success')
      setTimeout(onClose, 1600)
    } catch(e) {
      const d = e.response?.data?.detail
      setErr(typeof d === 'string' ? d : 'Failed to change password.')
    } finally { setBusy(false) }
  }

  const Eye = ({ show, toggle }) => (
    <button type="button" onClick={toggle}
      style={{ position:'absolute',right:12,top:'50%',transform:'translateY(-50%)',background:'none',border:'none',cursor:'pointer',color:'var(--text-muted)',display:'flex',padding:4 }}>
      {show
        ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
        : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
      }
    </button>
  )

  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal-box" style={{ maxWidth:420 }}>
        <div className="modal-header">
          <h3 className="modal-title">Change Password</h3>
          <button className="modal-close" onClick={onClose}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        {done ? (
          <div style={{ textAlign:'center', padding:'28px 0' }}>
            <div style={{ width:52, height:52, borderRadius:'50%', background:'rgba(0,224,150,0.1)', border:'1px solid rgba(0,224,150,0.3)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 16px', color:'var(--green)' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
            </div>
            <div style={{ fontSize:15, fontWeight:700, color:'var(--text)' }}>Password changed successfully</div>
          </div>
        ) : (
          <>
            {err && <div className="alert alert-error" style={{ marginBottom:16 }}>{err}</div>}
            <div className="form-group">
              <label className="form-label">Current Password <span style={{ color:'var(--red)' }}>*</span></label>
              <div style={{ position:'relative' }}>
                <input type={showO?'text':'password'} className="form-input" style={{ paddingRight:44 }}
                  value={old} onChange={e=>{ setOld(e.target.value); setErr('') }} placeholder="Current password" autoComplete="current-password"/>
                <Eye show={showO} toggle={()=>setShowO(p=>!p)}/>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">New Password <span style={{ color:'var(--red)' }}>*</span></label>
              <div style={{ position:'relative' }}>
                <input type={showN?'text':'password'} className="form-input" style={{ paddingRight:44 }}
                  value={nw} onChange={e=>{ setNw(e.target.value); setErr('') }} placeholder="New password" autoComplete="new-password"/>
                <Eye show={showN} toggle={()=>setShowN(p=>!p)}/>
              </div>
              {nw.length > 0 && (
                <div style={{ marginTop:8, display:'flex', flexDirection:'column', gap:3 }}>
                  {rules.map(r => (
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
              <label className="form-label">Confirm Password <span style={{ color:'var(--red)' }}>*</span></label>
              <input type="password" className={`form-input ${conf && !match ? 'error' : ''}`}
                value={conf} onChange={e=>{ setConf(e.target.value); setErr('') }} placeholder="Re-enter new password" autoComplete="new-password"/>
              {conf && !match && <p className="form-error">Passwords do not match</p>}
            </div>
            <div style={{ display:'flex', gap:10, justifyContent:'flex-end' }}>
              <button className="btn btn-ghost" onClick={onClose} disabled={busy}>Cancel</button>
              <button className="btn btn-primary" onClick={submit}
                disabled={busy || !old.trim() || !valid || !match} style={{ minWidth:140 }}>
                {busy ? <><span className="spinner" style={{ width:14, height:14, borderWidth:2 }}/>Saving...</> : 'Change Password'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

/* ── Notification Bell ─────────────────────────────────────── */
function NotificationBell() {
  const [open,     setOpen]     = useState(false)
  const [notes,    setNotes]    = useState([])    // all alerts (never cleared)
  const [readIds,  setReadIds]  = useState(new Set())
  const ref = useRef(null)

  const fetchAlerts = useCallback(async () => {
    try {
      const [invRes, salesRes] = await Promise.all([
        API.get('/inventory/'), API.get('/sales/')
      ])
      const inv   = invRes.data   || []
      const sales = salesRes.data || []
      const alerts = []

      // Low stock alerts
      inv.filter(i => i.quantity <= i.reorder_point).forEach(i => {
        alerts.push({
          id:    `low-${i.id}-${i.quantity}`,
          type:  'warning',
          title: 'Low Stock',
          msg:   `${i.name} has only ${i.quantity} units (reorder at ${i.reorder_point})`,
          time:  Date.now(),
        })
      })

      // Trending: highest revenue product last 7 days
      const cutoff = Date.now() - 7 * 86400000
      const recent = sales.filter(s => s.sale_date && new Date(s.sale_date).getTime() >= cutoff)
      const byProd = {}
      recent.forEach(s => { byProd[s.product] = (byProd[s.product] || 0) + (s.amount || 0) })
      const top = Object.entries(byProd).sort((a, b) => b[1] - a[1])[0]
      if (top) {
        alerts.push({
          id:    `trend-${top[0]}`,
          type:  'info',
          title: 'Trending',
          msg:   `${top[0]} is your top product this week — $${top[1].toLocaleString(undefined, { maximumFractionDigits:0 })} revenue`,
          time:  Date.now(),
        })
      }

      // Merge — keep existing notes, add new ones by id
      setNotes(prev => {
        const existingIds = new Set(prev.map(n => n.id))
        const newOnes = alerts.filter(a => !existingIds.has(a.id))
        return [...prev, ...newOnes]
      })
    } catch(e) { console.error(e) }
  }, [])

  useEffect(() => {
    fetchAlerts()
    const t = setInterval(fetchAlerts, 30000)
    return () => clearInterval(t)
  }, [fetchAlerts])

  useEffect(() => {
    const h = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  const unread = notes.filter(n => !readIds.has(n.id)).length

  const handleOpen = () => {
    setOpen(o => !o)
    if (!open) {
      // Mark all current as read when opening
      setReadIds(new Set(notes.map(n => n.id)))
    }
  }

  const COLOR = { warning:'var(--amber)', info:'var(--blue-light)', error:'var(--red)' }

  return (
    <div ref={ref} style={{ position:'relative' }}>
      <button onClick={handleOpen}
        style={{ width:34, height:34, borderRadius:'var(--r-md)', background:'var(--elevated)', border:'1px solid var(--border)', color:'var(--text-muted)', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', position:'relative', transition:'var(--t)' }}>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/>
        </svg>
        {unread > 0 && (
          <span style={{ position:'absolute', top:-4, right:-4, width:16, height:16, borderRadius:'50%', background:'var(--red)', color:'#fff', fontSize:9, fontWeight:700, display:'flex', alignItems:'center', justifyContent:'center', border:'2px solid var(--void)' }}>
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div style={{ position:'absolute', top:'calc(100% + 8px)', right:0, background:'var(--card)', border:'1px solid var(--border-md)', borderRadius:'var(--r-lg)', padding:6, minWidth:300, maxWidth:340, boxShadow:'0 16px 48px rgba(0,0,0,0.5)', zIndex:9999, maxHeight:400, overflowY:'auto' }}>
          <div style={{ padding:'10px 12px 8px', borderBottom:'1px solid var(--border)', marginBottom:4, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <span style={{ fontSize:13, fontWeight:700, color:'var(--text)' }}>Alerts</span>
            <span style={{ fontSize:11, color:'var(--text-dim)' }}>{notes.length} total</span>
          </div>
          {notes.length === 0 ? (
            <div style={{ padding:'20px 12px', textAlign:'center', color:'var(--text-dim)', fontSize:13 }}>No alerts at this time</div>
          ) : (
            [...notes].reverse().map(n => (
              <div key={n.id} style={{ padding:'10px 12px', borderRadius:'var(--r-md)', marginBottom:2, borderLeft:`3px solid ${COLOR[n.type] || 'var(--border)'}`, background:`${COLOR[n.type] || 'var(--border)'}08`, opacity:readIds.has(n.id)?0.7:1 }}>
                <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:3 }}>
                  <div style={{ width:6, height:6, borderRadius:'50%', background:COLOR[n.type], flexShrink:0 }}/>
                  <span style={{ fontSize:12, fontWeight:700, color:COLOR[n.type] }}>{n.title}</span>
                  {!readIds.has(n.id) && <span style={{ fontSize:10, background:'var(--red)', color:'#fff', borderRadius:100, padding:'1px 5px', fontWeight:700 }}>New</span>}
                </div>
                <div style={{ fontSize:12, color:'var(--text-muted)', lineHeight:1.5 }}>{n.msg}</div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}

/* ── Main Navbar ───────────────────────────────────────────── */
export default function Navbar() {
  const { user, logout } = useAuth()
  const navigate  = useNavigate()
  const location  = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)
  const [dropOpen, setDropOpen] = useState(false)
  const [showPwd,  setShowPwd]  = useState(false)
  const dropRef = useRef(null)

  useEffect(() => {
    const h = e => { if (dropRef.current && !dropRef.current.contains(e.target)) setDropOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  const handleLogout = () => {
    logout(); navigate('/login'); setMenuOpen(false); setDropOpen(false)
  }

  const navItems = [
    { path:'/chat',      label:'Manager',  roles:['admin','manager','viewer'] },
    { path:'/dashboard', label:'Dashboard',roles:['admin','manager','viewer'] },
    { path:'/inventory', label:'Inventory',roles:['admin','manager','viewer'] },
    { path:'/sales',     label:'Sales',    roles:['admin','manager','viewer'] },
    { path:'/orders',    label:'Orders',   roles:['admin','manager']          },
    { path:'/users',     label:'Users',    roles:['admin']                    },
    { path:'/db-setup',  label:'DB Setup', roles:['admin']                    },
  ].filter(i => i.roles.includes(user?.role))

  const role   = ROLE_CFG[user?.role] || ROLE_CFG.viewer
  const active = p => location.pathname === p

  const NavIconSvg = ({ path }) => {
    if (path === '/dashboard') return (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
        <rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>
      </svg>
    )
    const d = NAV_ICONS[path]
    return d ? (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d={d.match(/d="([^"]+)"/)?.[1] || ''} />
      </svg>
    ) : null
  }

  return (
    <>
      <style>{`
        .navbar{position:sticky;top:0;z-index:200;background:rgba(12,15,24,0.92);backdrop-filter:blur(20px);border-bottom:1px solid var(--border);}
        .nav-top{display:flex;align-items:center;justify-content:space-between;padding:0 32px;height:60px;gap:12px;}
        .nav-logo{display:flex;align-items:center;gap:10px;cursor:pointer;flex-shrink:0;text-decoration:none;}
        .nav-logo-mark{width:30px;height:30px;border-radius:8px;background:var(--blue);display:flex;align-items:center;justify-content:center;position:relative;overflow:hidden;}
        .nav-logo-mark::before{content:'';position:absolute;width:16px;height:16px;border:2px solid rgba(255,255,255,0.85);border-radius:4px;}
        .nav-logo-mark::after{content:'';position:absolute;width:7px;height:7px;background:#fff;border-radius:50%;}
        .nav-logo-text{font-family:var(--font-display);font-size:15px;font-weight:800;color:var(--text);letter-spacing:-0.3px;}
        .nav-logo-sub{font-size:10px;color:var(--text-muted);letter-spacing:1.5px;text-transform:uppercase;}
        .nav-links{display:flex;align-items:center;border-top:1px solid var(--border);padding:0 32px;gap:2px;overflow-x:auto;scrollbar-width:none;justify-content:center;}
        .nav-links::-webkit-scrollbar{display:none;}
        .nav-link{display:flex;align-items:center;gap:7px;padding:10px 14px;font-size:13px;font-weight:500;color:var(--text-muted);border:none;background:none;cursor:pointer;white-space:nowrap;border-bottom:2px solid transparent;transition:var(--t);}
        .nav-link:hover{color:var(--text);}
        .nav-link.active{color:var(--blue-light);border-bottom-color:var(--blue);}
        .nav-actions{display:flex;align-items:center;gap:8px;flex-shrink:0;}
        .nav-user-wrap{position:relative;}
        .nav-user{display:flex;align-items:center;gap:7px;background:var(--elevated);border:1px solid var(--border);border-radius:var(--r-md);padding:6px 10px;cursor:pointer;transition:var(--t);user-select:none;}
        .nav-user:hover{border-color:var(--border-md);}
        .nav-badge{font-size:10px;font-weight:700;padding:2px 7px;border-radius:100px;text-transform:uppercase;letter-spacing:0.5px;}
        .nav-dropdown{position:absolute;top:calc(100% + 8px);right:0;background:var(--card);border:1px solid var(--border-md);border-radius:var(--r-lg);padding:6px;min-width:200px;box-shadow:0 16px 48px rgba(0,0,0,0.55);z-index:9999;}
        .nav-drop-info{padding:10px 12px;border-bottom:1px solid var(--border);margin-bottom:4px;}
        .nav-drop-email{font-size:12px;font-weight:600;color:var(--text);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
        .nav-drop-role{font-size:11px;font-weight:700;text-transform:uppercase;margin-top:2px;}
        .nav-drop-btn{display:flex;align-items:center;gap:10px;padding:9px 12px;border-radius:var(--r-md);font-size:13px;color:var(--text-muted);cursor:pointer;border:none;background:none;width:100%;text-align:left;font-family:var(--font-body);transition:var(--t);}
        .nav-drop-btn:hover{background:var(--elevated);color:var(--text);}
        .nav-drop-btn.danger{color:var(--red);}
        .nav-drop-btn.danger:hover{background:rgba(255,77,106,0.08);}
        .nav-hamburger{width:34px;height:34px;border-radius:var(--r-md);background:var(--elevated);border:1px solid var(--border);color:var(--text);cursor:pointer;display:none;align-items:center;justify-content:center;}
        .mobile-menu{position:fixed;top:60px;left:0;right:0;bottom:0;z-index:199;background:var(--deep);border-top:1px solid var(--border);overflow-y:auto;}
        .mobile-nav-item{display:flex;align-items:center;gap:14px;padding:16px 28px;font-size:15px;color:var(--text-muted);cursor:pointer;border-left:3px solid transparent;transition:var(--t);}
        .mobile-nav-item:hover{color:var(--text);background:rgba(29,111,255,0.04);}
        .mobile-nav-item.active{color:var(--blue-light);border-left-color:var(--blue);}
        @media(max-width:900px){.nav-links{display:none;}.nav-hamburger{display:flex;}.nav-user .nav-user-name{display:none;}.nav-top{padding:0 16px;}}
      `}</style>

      <nav className="navbar">
        <div className="nav-top">
          <div className="nav-logo" onClick={() => navigate('/')}>
            <div className="nav-logo-mark"/>
            <div>
              <div className="nav-logo-text">AutoBiz AI</div>
              <div className="nav-logo-sub">Business Platform</div>
            </div>
          </div>

          <div className="nav-actions">
            <NotificationBell/>

            <div className="nav-user-wrap" ref={dropRef}>
              <div className="nav-user" onClick={() => setDropOpen(o => !o)}>
                <span className="nav-user-name" style={{ fontSize:12, color:'var(--text)', fontWeight:500, maxWidth:100, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                  {user?.email?.split('@')[0]}
                </span>
                <span className="nav-badge" style={{ background:role.bg, color:role.color }}>{role.label}</span>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"
                  style={{ color:'var(--text-dim)', transition:'transform 0.2s', transform:dropOpen?'rotate(180deg)':'none' }}>
                  <polyline points="6 9 12 15 18 9"/>
                </svg>
              </div>

              {dropOpen && (
                <div className="nav-dropdown">
                  <div className="nav-drop-info">
                    <div className="nav-drop-email">{user?.email}</div>
                    <div className="nav-drop-role" style={{ color:role.color }}>{role.label}</div>
                  </div>
                  <button className="nav-drop-btn" onClick={() => { setShowPwd(true); setDropOpen(false) }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                      <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/>
                    </svg>
                    Change Password
                  </button>
                  <div style={{ height:1, background:'var(--border)', margin:'4px 0' }}/>
                  <button className="nav-drop-btn danger" onClick={handleLogout}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                      <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/>
                      <polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
                    </svg>
                    Sign Out
                  </button>
                </div>
              )}
            </div>

            <button className="nav-hamburger" onClick={() => setMenuOpen(o => !o)}>
              {menuOpen
                ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
              }
            </button>
          </div>
        </div>

        <div className="nav-links">
          {navItems.map(item => (
            <button key={item.path} className={`nav-link ${active(item.path)?'active':''}`} onClick={() => navigate(item.path)}>
              <NavIconSvg path={item.path}/>{item.label}
            </button>
          ))}
        </div>
      </nav>

      {menuOpen && (
        <div className="mobile-menu">
          {navItems.map(item => (
            <div key={item.path} className={`mobile-nav-item ${active(item.path)?'active':''}`}
              onClick={() => { navigate(item.path); setMenuOpen(false) }}>
              <NavIconSvg path={item.path}/>{item.label}
            </div>
          ))}
          <div style={{ height:1, background:'var(--border)', margin:'8px 28px' }}/>
          <div className="mobile-nav-item" onClick={() => { setShowPwd(true); setMenuOpen(false) }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
            Change Password
          </div>
          <div className="mobile-nav-item" onClick={handleLogout} style={{ color:'var(--red)' }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
            Sign Out
          </div>
        </div>
      )}

      {showPwd && <ChangePwdModal onClose={() => setShowPwd(false)}/>}
    </>
  )
}