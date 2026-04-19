//Login.jsx

import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import API from '../api/axios'
import { useAuth } from '../context/AuthContext'

const EyeOpen   = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
const EyeClosed = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
const MailIcon  = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
const LockIcon  = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
const BackIcon  = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
const CheckBig  = () => <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>

function IInput({ icon, children }) {
  return (
    <div style={{ position:'relative' }}>
      <span style={{ position:'absolute', left:14, top:'50%', transform:'translateY(-50%)', color:'var(--text-dim)', display:'flex', pointerEvents:'none' }}>{icon}</span>
      {children}
    </div>
  )
}

function Err({ msg }) {
  return (
    <div className="alert alert-error" style={{ marginBottom:16 }}>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink:0 }}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
      {msg}
    </div>
  )
}

/* Password strength — mirrors backend validate_password() */
const checkPassword = (p) => {
  const rules = [
    { ok: p.length >= 8,                               msg: 'At least 8 characters' },
    { ok: /[A-Z]/.test(p),                             msg: 'One uppercase letter'  },
    { ok: /[a-z]/.test(p),                             msg: 'One lowercase letter'  },
    { ok: /[!@#$%^&*()\-_=+\[\]{}|;:,.<>?]/.test(p),  msg: 'One special character' },
  ]
  const passed = rules.filter(r=>r.ok).length
  return { rules, passed, score: passed }
}

const strengthLabel = (score) => {
  if (score <= 1) return { label:'Weak',   color:'var(--red)' }
  if (score === 2) return { label:'Fair',   color:'var(--amber)' }
  if (score === 3) return { label:'Good',   color:'var(--blue-light)' }
  return               { label:'Strong', color:'var(--green)' }
}

export default function Login() {
  const navigate  = useNavigate()
  const { login } = useAuth()

  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')

  const [view,        setView]        = useState('login')
  const [fpEmail,     setFpEmail]     = useState('')
  const [otp,         setOtp]         = useState(['','','','','',''])
  const [newPass,     setNewPass]     = useState('')
  const [confirmPass, setConfirmPass] = useState('')
  const [showNew,     setShowNew]     = useState(false)
  const [fpLoading,   setFpLoading]   = useState(false)
  const [fpError,     setFpError]     = useState('')

  const handleLogin = async (e) => {
    e.preventDefault(); setLoading(true); setError('')
    try {
      const res = await API.post('/auth/login', { email, password })
      login(res.data.access_token); navigate('/chat')
    } catch (err) {
      setError(err.response?.data?.detail || 'Invalid email or password')
    } finally { setLoading(false) }
  }

  const handleRequestOtp = async (e) => {
    if (e?.preventDefault) e.preventDefault()
    setFpLoading(true); setFpError('')
    try {
      await API.post('/auth/forgot-password', { email: fpEmail })
      setView('otp')
    } catch (err) {
      const detail = err.response?.data?.detail
      if (err.response?.status === 404 || (typeof detail==='string' && detail.toLowerCase().includes('no account'))) {
        setFpError('No account found with this email address.')
      } else {
        setFpError(typeof detail==='string' ? detail : 'Failed to send code. Please try again.')
      }
    } finally { setFpLoading(false) }
  }

  const handleVerifyOtp = async (e) => {
    e.preventDefault()
    const code = otp.join('')
    if (code.length < 6) { setFpError('Please enter the complete 6-digit code.'); return }
    setFpLoading(true); setFpError('')
    try {
      await API.post('/auth/verify-otp', { email: fpEmail, otp: code })
      setView('reset')
    } catch (err) {
      const detail = err.response?.data?.detail
      if (typeof detail==='string' && detail.toLowerCase().includes('expir')) setFpError('This code has expired. Please request a new one.')
      else if (typeof detail==='string' && detail.toLowerCase().includes('incorrect')) setFpError('Incorrect code. Please check your email and try again.')
      else setFpError(typeof detail==='string' ? detail : 'Invalid or expired code.')
    } finally { setFpLoading(false) }
  }

  const handleReset = async (e) => {
    e.preventDefault()
    const { passed } = checkPassword(newPass)
    if (passed < 4) { setFpError('Password does not meet all requirements below.'); return }
    if (newPass !== confirmPass) { setFpError('Passwords do not match.'); return }
    setFpLoading(true); setFpError('')
    try {
      await API.post('/auth/reset-password', { email: fpEmail, otp: otp.join(''), new_password: newPass })
      setView('done')
    } catch (err) {
      setFpError(err.response?.data?.detail || 'Failed to reset password. Please try again.')
    } finally { setFpLoading(false) }
  }

  const handleOtpChange = (idx, val) => {
    if (!/^\d?$/.test(val)) return
    const next = [...otp]; next[idx] = val; setOtp(next)
    if (val && idx < 5) document.getElementById(`otp-${idx+1}`)?.focus()
  }
  const handleOtpKey = (idx, e) => {
    if (e.key==='Backspace' && !otp[idx] && idx>0) document.getElementById(`otp-${idx-1}`)?.focus()
  }
  const handleOtpPaste = (e) => {
    e.preventDefault()
    const p = e.clipboardData.getData('text').replace(/\D/g,'').slice(0,6)
    const next=[...otp]; p.split('').forEach((d,i)=>{next[i]=d}); setOtp(next)
    document.getElementById(`otp-${Math.min(p.length,5)}`)?.focus()
  }
  const resetFp = () => { setView('login'); setFpEmail(''); setOtp(['','','','','','']); setNewPass(''); setConfirmPass(''); setFpError('') }

  const leftPanel = (
    <div style={{ flex:1, display:'flex', flexDirection:'column', justifyContent:'center', padding:'80px 64px', background:'var(--deep)', borderRight:'1px solid var(--border)', position:'relative', overflow:'hidden' }} className="hide-tablet">
      <div style={{ position:'absolute', width:500, height:500, top:-100, left:-100, borderRadius:'50%', background:'radial-gradient(circle, rgba(29,111,255,0.1) 0%, transparent 70%)', filter:'blur(40px)', pointerEvents:'none' }}/>
      <div style={{ position:'relative', zIndex:1, maxWidth:460 }}>
        <div onClick={()=>navigate('/')} style={{ display:'flex', alignItems:'center', gap:10, cursor:'pointer', marginBottom:56 }}>
          <div style={{ width:30, height:30, borderRadius:8, background:'var(--blue)', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff' }}>
            <svg width="14" height="14" viewBox="0 0 32 32" fill="none"><polygon points="16,3 27,9 27,23 16,29 5,23 5,9" stroke="#fff" strokeWidth="1.6" fill="none" strokeLinejoin="round"/><circle cx="16" cy="16" r="3.5" fill="#fff" opacity="0.9"/></svg>
          </div>
          <span style={{ fontFamily:'var(--font-display)', fontSize:15, fontWeight:800, color:'var(--text)' }}>AutoBiz AI</span>
        </div>
        <div className="eyebrow"><div className="eyebrow-line"/>AI Business Platform</div>
        <h1 style={{ fontFamily:'var(--font-display)', fontSize:38, fontWeight:800, color:'var(--text)', letterSpacing:'-1px', lineHeight:1.1, marginBottom:16 }}>
          {view==='login' ? 'Your automation platform awaits' : 'Account recovery'}
        </h1>
        <p style={{ fontSize:15, color:'var(--text-muted)', lineHeight:1.8, marginBottom:40 }}>
          {view==='login' ? 'Your Manager Agent has been working while you were away.' : 'We will send a one-time code to your registered email address.'}
        </p>
        {[
          { icon:<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>, title:'24/7 Automation', desc:'Workflows execute continuously, even when offline.' },
          { icon:<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>, title:'Real-Time Insights', desc:'Every task and outcome surfaced as it happens.' },
          { icon:<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>, title:'Enterprise Security', desc:'JWT auth, role guards, and full audit logging.' },
        ].map(f => (
          <div key={f.title} style={{ display:'flex', alignItems:'flex-start', gap:14, marginBottom:18 }}>
            <div style={{ width:38, height:38, borderRadius:'var(--r-md)', background:'rgba(29,111,255,0.08)', border:'1px solid var(--border-md)', display:'flex', alignItems:'center', justifyContent:'center', color:'var(--blue-light)', flexShrink:0 }}>{f.icon}</div>
            <div><div style={{ fontSize:14, fontWeight:600, color:'var(--text)', marginBottom:3 }}>{f.title}</div><div style={{ fontSize:13, color:'var(--text-muted)', lineHeight:1.6 }}>{f.desc}</div></div>
          </div>
        ))}
      </div>
    </div>
  )

  const rightShell = (children) => (
    <div style={{ minHeight:'100vh', display:'flex', background:'var(--void)', position:'relative', overflow:'hidden' }}>
      <div className="grid-bg"/>
      {leftPanel}
      <div style={{ width:480, display:'flex', flexDirection:'column', justifyContent:'center', padding:'80px 56px', position:'relative', zIndex:1, flexShrink:0, background:'var(--void)' }}>
        {children}
      </div>
    </div>
  )

  /* ── Login ── */
  if (view==='login') return rightShell(
    <div style={{ animation:'fade-up 0.4s var(--ease) both' }}>
      <h2 style={{ fontFamily:'var(--font-display)', fontSize:30, fontWeight:800, color:'var(--text)', letterSpacing:'-0.5px', marginBottom:8 }}>Sign in</h2>
      <p style={{ fontSize:14, color:'var(--text-muted)', marginBottom:32 }}>Access your AutoBiz AI dashboard</p>
      {error && <Err msg={error}/>}
      <form onSubmit={handleLogin}>
        <div className="form-group">
          <label className="form-label">Email Address</label>
          <IInput icon={<MailIcon/>}><input type="email" className="form-input" style={{ paddingLeft:40 }} value={email} onChange={e=>setEmail(e.target.value)} placeholder="admin@example.com" required autoComplete="email"/></IInput>
        </div>
        <div className="form-group">
          <label className="form-label" style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            Password
            <button type="button" onClick={()=>{setFpEmail(email);setView('forgot');setError('')}} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--blue-light)', fontSize:11, fontWeight:500, padding:0 }}>Forgot password?</button>
          </label>
          <IInput icon={<LockIcon/>}>
            <input type={showPass?'text':'password'} className="form-input" style={{ paddingLeft:40, paddingRight:44 }} value={password} onChange={e=>setPassword(e.target.value)} placeholder="••••••••••" required autoComplete="current-password"/>
            <button type="button" onClick={()=>setShowPass(p=>!p)} style={{ position:'absolute', right:12, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', color:'var(--text-muted)', display:'flex', padding:4 }}>{showPass?<EyeClosed/>:<EyeOpen/>}</button>
          </IInput>
        </div>
        <button type="submit" disabled={loading} className="btn btn-primary" style={{ width:'100%', justifyContent:'center', padding:'14px', fontSize:15, marginTop:4, boxShadow:'0 6px 20px rgba(29,111,255,0.3)', gap:8 }}>
          {loading?<><span className="spinner" style={{ width:16, height:16, borderWidth:2 }}/>Signing in...</>:'Sign In'}
        </button>
      </form>
      <div style={{ textAlign:'center', marginTop:28, paddingTop:24, borderTop:'1px solid var(--border)' }}>
        <p style={{ fontSize:12, color:'var(--text-dim)', display:'flex', alignItems:'center', justifyContent:'center', gap:6 }}><LockIcon/> Secured with JWT Authentication</p>
      </div>
    </div>
  )

  /* ── Forgot ── */
  if (view==='forgot') return rightShell(
    <div style={{ animation:'fade-up 0.4s var(--ease) both' }}>
      <button onClick={resetFp} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--text-muted)', display:'flex', alignItems:'center', gap:6, fontSize:13, marginBottom:32, padding:0 }}><BackIcon/> Back to sign in</button>
      <div style={{ width:52, height:52, borderRadius:'var(--r-lg)', background:'rgba(29,111,255,0.08)', border:'1px solid var(--border-md)', display:'flex', alignItems:'center', justifyContent:'center', marginBottom:24, color:'var(--blue-light)' }}><MailIcon/></div>
      <h2 style={{ fontFamily:'var(--font-display)', fontSize:28, fontWeight:800, color:'var(--text)', letterSpacing:'-0.5px', marginBottom:8 }}>Reset your password</h2>
      <p style={{ fontSize:14, color:'var(--text-muted)', marginBottom:32, lineHeight:1.7 }}>Enter your registered email. A 6-digit code will be sent only if the email exists in our system.</p>
      {fpError && <Err msg={fpError}/>}
      <form onSubmit={handleRequestOtp}>
        <div className="form-group">
          <label className="form-label">Registered Email Address</label>
          <IInput icon={<MailIcon/>}><input type="email" className="form-input" style={{ paddingLeft:40 }} value={fpEmail} onChange={e=>{setFpEmail(e.target.value);setFpError('')}} placeholder="your@email.com" required autoComplete="email"/></IInput>
        </div>
        <button type="submit" disabled={fpLoading} className="btn btn-primary" style={{ width:'100%', justifyContent:'center', padding:'14px', fontSize:15, gap:8 }}>
          {fpLoading?<><span className="spinner" style={{ width:16, height:16, borderWidth:2 }}/>Sending...</>:'Send Reset Code'}
        </button>
      </form>
    </div>
  )

  /* ── OTP ── */
  if (view==='otp') return rightShell(
    <div style={{ animation:'fade-up 0.4s var(--ease) both' }}>
      <button onClick={()=>{setView('forgot');setFpError('')}} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--text-muted)', display:'flex', alignItems:'center', gap:6, fontSize:13, marginBottom:32, padding:0 }}><BackIcon/> Back</button>
      <div style={{ width:52, height:52, borderRadius:'var(--r-lg)', background:'rgba(0,224,150,0.08)', border:'1px solid rgba(0,224,150,0.2)', display:'flex', alignItems:'center', justifyContent:'center', marginBottom:24, color:'var(--green)' }}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 8.63a19.79 19.79 0 01-3.07-8.67A2 2 0 012 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/></svg>
      </div>
      <h2 style={{ fontFamily:'var(--font-display)', fontSize:28, fontWeight:800, color:'var(--text)', letterSpacing:'-0.5px', marginBottom:8 }}>Check your email</h2>
      <p style={{ fontSize:14, color:'var(--text-muted)', marginBottom:4, lineHeight:1.7 }}>A 6-digit code was sent to</p>
      <p style={{ fontSize:14, fontWeight:600, color:'var(--blue-light)', fontFamily:'var(--font-mono)', marginBottom:32 }}>{fpEmail}</p>
      {fpError && <Err msg={fpError}/>}
      <form onSubmit={handleVerifyOtp}>
        <label className="form-label" style={{ marginBottom:14 }}>Verification Code</label>
        <div style={{ display:'flex', gap:10, marginBottom:28, justifyContent:'center' }}>
          {otp.map((digit,idx) => (
            <input key={idx} id={`otp-${idx}`} type="text" inputMode="numeric" maxLength={1} value={digit}
              onChange={e=>handleOtpChange(idx,e.target.value)} onKeyDown={e=>handleOtpKey(idx,e)} onPaste={idx===0?handleOtpPaste:undefined}
              style={{ width:48, height:56, textAlign:'center', fontFamily:'var(--font-display)', fontSize:22, fontWeight:800, background:'var(--surface)', border:`1px solid ${digit?'var(--blue)':'var(--border-md)'}`, borderRadius:'var(--r-md)', color:'var(--text)', outline:'none', transition:'var(--t)', boxShadow:digit?'0 0 0 3px rgba(29,111,255,0.12)':'none' }}
              onFocus={e=>e.target.style.borderColor='var(--blue)'} onBlur={e=>e.target.style.borderColor=digit?'var(--blue)':'var(--border-md)'}
            />
          ))}
        </div>
        <button type="submit" disabled={fpLoading||otp.join('').length<6} className="btn btn-primary" style={{ width:'100%', justifyContent:'center', padding:'14px', fontSize:15, gap:8 }}>
          {fpLoading?<><span className="spinner" style={{ width:16, height:16, borderWidth:2 }}/>Verifying...</>:'Verify Code'}
        </button>
      </form>
      <p style={{ fontSize:13, color:'var(--text-muted)', textAlign:'center', marginTop:20 }}>
        Did not receive the code?{' '}
        <button onClick={()=>handleRequestOtp({})} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--blue-light)', fontWeight:500, fontSize:13, padding:0 }}>Resend</button>
      </p>
    </div>
  )

  /* ── Reset ── */
  if (view==='reset') return rightShell(
    <div style={{ animation:'fade-up 0.4s var(--ease) both' }}>
      <div style={{ width:52, height:52, borderRadius:'var(--r-lg)', background:'rgba(29,111,255,0.08)', border:'1px solid var(--border-md)', display:'flex', alignItems:'center', justifyContent:'center', marginBottom:24, color:'var(--blue-light)' }}><LockIcon/></div>
      <h2 style={{ fontFamily:'var(--font-display)', fontSize:28, fontWeight:800, color:'var(--text)', letterSpacing:'-0.5px', marginBottom:8 }}>Set new password</h2>
      <p style={{ fontSize:14, color:'var(--text-muted)', marginBottom:32, lineHeight:1.7 }}>Choose a strong password that meets all requirements below.</p>
      {fpError && <Err msg={fpError}/>}
      <form onSubmit={handleReset}>
        <div className="form-group">
          <label className="form-label">New Password</label>
          <IInput icon={<LockIcon/>}>
            <input type={showNew?'text':'password'} className="form-input" style={{ paddingLeft:40, paddingRight:44 }} value={newPass} onChange={e=>{setNewPass(e.target.value);setFpError('')}} placeholder="Min. 8 characters" required/>
            <button type="button" onClick={()=>setShowNew(p=>!p)} style={{ position:'absolute', right:12, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', color:'var(--text-muted)', display:'flex', padding:4 }}>{showNew?<EyeClosed/>:<EyeOpen/>}</button>
          </IInput>

          {/* Requirement checklist */}
          {newPass.length > 0 && (() => {
            const { rules } = checkPassword(newPass)
            return (
              <div style={{ marginTop:10, display:'flex', flexDirection:'column', gap:5 }}>
                {rules.map(r => (
                  <div key={r.msg} style={{ display:'flex', alignItems:'center', gap:7, fontSize:12, color: r.ok ? 'var(--green)' : 'var(--text-muted)' }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      {r.ok ? <polyline points="20 6 9 17 4 12"/> : <><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>}
                    </svg>
                    {r.msg}
                  </div>
                ))}
              </div>
            )
          })()}
        </div>
        <div className="form-group">
          <label className="form-label">Confirm New Password</label>
          <IInput icon={<LockIcon/>}><input type="password" className={`form-input ${confirmPass&&confirmPass!==newPass?'error':''}`} style={{ paddingLeft:40 }} value={confirmPass} onChange={e=>{setConfirmPass(e.target.value);setFpError('')}} placeholder="Re-enter your password" required/></IInput>
          {confirmPass&&confirmPass!==newPass&&<p className="form-error">Passwords do not match</p>}
        </div>
        <button type="submit" disabled={fpLoading||!newPass||!confirmPass} className="btn btn-primary" style={{ width:'100%', justifyContent:'center', padding:'14px', fontSize:15, gap:8, marginTop:4 }}>
          {fpLoading?<><span className="spinner" style={{ width:16, height:16, borderWidth:2 }}/>Resetting...</>:'Reset Password'}
        </button>
      </form>
    </div>
  )

  /* ── Done ── */
  if (view==='done') return rightShell(
    <div style={{ animation:'fade-up 0.4s var(--ease) both', textAlign:'center' }}>
      <div style={{ width:72, height:72, borderRadius:'var(--r-xl)', background:'rgba(0,224,150,0.1)', border:'1px solid rgba(0,224,150,0.3)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 28px', color:'var(--green)' }}><CheckBig/></div>
      <h2 style={{ fontFamily:'var(--font-display)', fontSize:28, fontWeight:800, color:'var(--text)', letterSpacing:'-0.5px', marginBottom:12 }}>Password reset successfully</h2>
      <p style={{ fontSize:15, color:'var(--text-muted)', marginBottom:36, lineHeight:1.7 }}>Your password has been updated. Sign in with your new credentials.</p>
      <button onClick={resetFp} className="btn btn-primary" style={{ width:'100%', justifyContent:'center', padding:'14px', fontSize:15 }}>Continue to Sign In</button>
    </div>
  )

  return null
}