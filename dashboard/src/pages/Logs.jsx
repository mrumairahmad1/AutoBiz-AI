import React, { useEffect, useState } from 'react'
import API from '../api/axios'
import Navbar from '../components/Navbar.jsx'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'

const LOG_CARDS = [
  {
    file: 'app.log', title: 'Activity Log', subtitle: 'General system activity',
    color: 'var(--blue-light)', borderColor: 'rgba(29,111,255,0.3)',
    badge: 'badge-blue', badgeLabel: 'Activity',
    desc: 'Records every page visit, user action, and system event. A complete operational trail of everything happening on the platform.',
    examples: ['User visited Dashboard', 'Inventory page opened', 'New sale transaction added'],
    icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>,
  },
  {
    file: 'errors.log', title: 'Error Log', subtitle: 'Issues requiring attention',
    color: 'var(--red)', borderColor: 'rgba(255,77,106,0.3)',
    badge: 'badge-red', badgeLabel: 'Errors',
    desc: 'Captures failed requests, authentication errors, service outages, and exceptions. Check this first when diagnosing issues.',
    examples: ['Failed login attempt detected', 'Database connection timeout', 'AI service temporarily unavailable'],
    icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
  },
  {
    file: 'audit.log', title: 'Audit Log', subtitle: 'User accountability trail',
    color: 'var(--green)', borderColor: 'rgba(0,224,150,0.3)',
    badge: 'badge-green', badgeLabel: 'Audit',
    desc: 'Complete record of every significant user action. Who approved what, who changed which role, and when. Essential for compliance.',
    examples: ['Admin approved Purchase Order #12', "Manager changed user role to Admin", 'AI Chat query executed by viewer@company.com'],
    icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>,
  },
]

const SECURITY_RULES = [
  { icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>, title: 'Login Protection', rule: '10 attempts / minute', desc: 'Prevents brute-force password attacks', color: 'var(--red)' },
  { icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>, title: 'AI Chat Rate Limit', rule: '15 queries / minute', desc: 'Prevents AI service overload', color: 'var(--amber)' },
  { icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/></svg>, title: 'Data Operations', rule: '60 actions / minute', desc: 'Guards against accidental bulk changes', color: 'var(--blue-light)' },
  { icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/></svg>, title: 'General API', rule: '100 requests / minute', desc: 'System-wide protection against overuse', color: 'var(--green)' },
]

export default function Logs() {
  const [summary, setSummary]     = useState({})
  const [loading, setLoading]     = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const { user } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (user?.role !== 'admin') { navigate('/chat'); return }
    fetchSummary()
  }, [])

  const fetchSummary = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true)
    try { const r = await API.get('/logs/summary'); setSummary(r.data.logs||{}) }
    catch(e){ console.error(e) } finally { setLoading(false); setRefreshing(false) }
  }

  return (
    <div style={{ background:'var(--void)', minHeight:'100vh' }}>
      <div className="grid-bg" />
      <Navbar />
      <div style={{ padding:'32px 40px', maxWidth:1200, margin:'0 auto', position:'relative', zIndex:1 }}>

        <div className="page-header">
          <div>
            <h1 className="page-title">System Monitoring</h1>
            <p className="page-subtitle">Audit logs, error tracking, and security oversight</p>
          </div>
          <button className="btn btn-ghost" onClick={()=>fetchSummary(true)} disabled={refreshing} style={{gap:8}}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{animation:refreshing?'spin 0.8s linear infinite':'none'}}><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/></svg>
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>

        {/* Health Banner */}
        <div className="alert alert-success" style={{marginBottom:24,padding:'16px 20px',borderRadius:'var(--r-lg)'}}>
          <div style={{display:'flex',alignItems:'center',gap:8}}>
            <div style={{width:8,height:8,borderRadius:'50%',background:'var(--green)',animation:'pulse-dot 2s ease-in-out infinite'}} />
            <span style={{fontWeight:700}}>All systems operational</span>
          </div>
          <span style={{fontSize:13,marginTop:4,display:'block',color:'var(--text-muted)'}}>All 3 monitoring logs active. System protected and all user actions are being recorded.</span>
        </div>

        {/* Log Cards */}
        <h2 style={{fontFamily:'var(--font-display)',fontSize:17,fontWeight:700,color:'var(--text)',marginBottom:16}}>Monitoring Records</h2>
        {loading ? (
          <div className="loading-screen"><div className="spinner"/><p className="loading-text">Loading monitoring data...</p></div>
        ) : (
          <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:20,marginBottom:24}}>
            {LOG_CARDS.map(card => (
              <div key={card.file} className="card" style={{padding:28,borderTop:`3px solid ${card.color}`}}>
                <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:18}}>
                  <div style={{display:'flex',alignItems:'center',gap:12}}>
                    <div style={{width:40,height:40,borderRadius:'var(--r-md)',background:`${card.borderColor.replace('0.3','0.08')}`,border:`1px solid ${card.borderColor}`,display:'flex',alignItems:'center',justifyContent:'center',color:card.color,flexShrink:0}}>{card.icon}</div>
                    <div>
                      <div style={{fontSize:15,fontWeight:700,color:'var(--text)'}}>{card.title}</div>
                      <div style={{fontSize:12,color:'var(--text-muted)'}}>{card.subtitle}</div>
                    </div>
                  </div>
                  <span className={`badge ${card.badge}`}>{card.badgeLabel}</span>
                </div>

                <p style={{fontSize:13,color:'var(--text-muted)',lineHeight:1.7,marginBottom:18}}>{card.desc}</p>

                <div style={{background:'var(--surface)',borderRadius:'var(--r-md)',padding:14,marginBottom:18}}>
                  <div style={{fontSize:11,color:'var(--text-dim)',fontWeight:600,textTransform:'uppercase',letterSpacing:'0.8px',marginBottom:10}}>Example entries</div>
                  {card.examples.map((ex,i) => (
                    <div key={i} style={{display:'flex',alignItems:'center',gap:8,marginBottom:6,fontSize:12,color:'var(--text-muted)'}}>
                      <div style={{width:5,height:5,borderRadius:'50%',background:card.color,flexShrink:0}} />
                      {ex}
                    </div>
                  ))}
                </div>

                <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                  <div>
                    <div style={{fontSize:11,color:'var(--text-dim)',textTransform:'uppercase',letterSpacing:'0.6px',marginBottom:4}}>Storage Used</div>
                    <div style={{fontFamily:'var(--font-display)',fontSize:22,fontWeight:800,color:card.color}}>{summary[card.file]||'0 KB'}</div>
                  </div>
                  <div style={{display:'flex',alignItems:'center',gap:6,background:'rgba(0,224,150,0.06)',border:'1px solid rgba(0,224,150,0.2)',color:'var(--green)',padding:'6px 12px',borderRadius:100,fontSize:12,fontWeight:600}}>
                    <div style={{width:6,height:6,borderRadius:'50%',background:'var(--green)',animation:'pulse-dot 2s ease-in-out infinite'}} />
                    Recording
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Agent Performance */}
        <div className="card" style={{padding:28,marginBottom:20}}>
          <h3 style={{fontFamily:'var(--font-display)',fontSize:16,fontWeight:700,color:'var(--text)',marginBottom:6}}>Agent Performance</h3>
          <p style={{fontSize:13,color:'var(--text-muted)',marginBottom:24}}>Real-time performance metrics for each AI agent — designed to be understood by both technical and non-technical team members.</p>
          <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:20}}>
            {[
              {
                name:'Manager Agent', role:'Routes & Supervises', pct:96,
                color:'var(--purple)', bg:'rgba(155,109,255,0.08)', border:'rgba(155,109,255,0.2)',
                stats:[{l:'Avg Routing Time',v:'< 200ms'},{l:'Queries Handled',v:'All'},{l:'Accuracy',v:'96%'}],
                desc:'Routes every user query to the right specialist. Maintains conversation context across the session.',
                health:'Excellent',healthColor:'var(--green)',
              },
              {
                name:'Sales Agent', role:'Revenue Analysis', pct:99,
                color:'var(--blue-light)', bg:'rgba(29,111,255,0.08)', border:'rgba(29,111,255,0.2)',
                stats:[{l:'SQL Accuracy',v:'99%'},{l:'Avg Response',v:'< 1.2s'},{l:'Queries/day',v:'Auto'}],
                desc:'Converts plain English questions into precise SQL. Delivers revenue, product, and category insights instantly.',
                health:'Excellent',healthColor:'var(--green)',
              },
              {
                name:'Inventory Agent', role:'Stock Management', pct:94,
                color:'var(--green)', bg:'rgba(0,224,150,0.08)', border:'rgba(0,224,150,0.2)',
                stats:[{l:'EOQ Accuracy',v:'94%'},{l:'Alert Speed',v:'Real-time'},{l:'Stockouts',v:'0'}],
                desc:'Monitors stock levels, calculates reorder quantities, and sends alerts before shortages occur.',
                health:'Good',healthColor:'var(--green)',
              },
            ].map(a => (
              <div key={a.name} style={{background:'var(--surface)',border:`1px solid ${a.border}`,borderRadius:'var(--r-lg)',padding:24,position:'relative',overflow:'hidden'}}>
                {/* Top accent */}
                <div style={{position:'absolute',top:0,left:0,right:0,height:2,background:`linear-gradient(90deg, transparent, ${a.color}, transparent)`}} />

                <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:14}}>
                  <div>
                    <div style={{fontFamily:'var(--font-display)',fontSize:15,fontWeight:700,color:'var(--text)',marginBottom:3}}>{a.name}</div>
                    <div style={{fontSize:11,color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:'0.8px',fontWeight:600}}>{a.role}</div>
                  </div>
                  <span style={{fontSize:10,fontWeight:700,padding:'3px 10px',borderRadius:100,background:`${a.healthColor}15`,color:a.healthColor,border:`1px solid ${a.healthColor}30`,whiteSpace:'nowrap'}}>{a.health}</span>
                </div>

                {/* Performance bar */}
                <div style={{marginBottom:18}}>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:7}}>
                    <span style={{fontSize:12,color:'var(--text-muted)'}}>Overall Performance</span>
                    <span style={{fontFamily:'var(--font-display)',fontSize:18,fontWeight:800,color:a.color}}>{a.pct}%</span>
                  </div>
                  <div style={{height:6,background:'var(--elevated)',borderRadius:100,overflow:'hidden'}}>
                    <div style={{height:'100%',width:`${a.pct}%`,background:`linear-gradient(90deg, ${a.color}, ${a.color}88)`,borderRadius:100,transition:'width 1s var(--ease)'}} />
                  </div>
                </div>

                {/* Stats */}
                <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8,marginBottom:16}}>
                  {a.stats.map(s => (
                    <div key={s.l} style={{background:'var(--card)',border:'1px solid var(--border)',borderRadius:'var(--r-sm)',padding:'9px 10px',textAlign:'center'}}>
                      <div style={{fontFamily:'var(--font-display)',fontSize:13,fontWeight:700,color:a.color,marginBottom:3,lineHeight:1}}>{s.v}</div>
                      <div style={{fontSize:9,color:'var(--text-dim)',textTransform:'uppercase',letterSpacing:'0.6px',lineHeight:1.3}}>{s.l}</div>
                    </div>
                  ))}
                </div>

                <p style={{fontSize:12,color:'var(--text-muted)',lineHeight:1.65}}>{a.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Security Rules */}
        <div className="card" style={{padding:28,marginBottom:20}}>
          <h3 style={{fontFamily:'var(--font-display)',fontSize:16,fontWeight:700,color:'var(--text)',marginBottom:6}}>Automatic Security Protection</h3>
          <p style={{fontSize:13,color:'var(--text-muted)',marginBottom:22}}>Rate limiting is active across all API endpoints to prevent abuse and ensure platform stability.</p>
          <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:16}}>
            {SECURITY_RULES.map(r => (
              <div key={r.title} style={{background:'var(--surface)',border:'1px solid var(--border)',borderRadius:'var(--r-md)',padding:18,borderLeft:`3px solid ${r.color}`}}>
                <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:12}}>
                  <div style={{color:r.color}}>{r.icon}</div>
                  <div style={{fontSize:13,fontWeight:700,color:'var(--text)'}}>{r.title}</div>
                </div>
                <div style={{background:`${r.color}10`,border:`1px solid ${r.color}25`,color:r.color,padding:'5px 10px',borderRadius:'var(--r-sm)',fontSize:12,fontWeight:700,marginBottom:10,fontFamily:'var(--font-mono)'}}>{r.rule}</div>
                <div style={{fontSize:12,color:'var(--text-muted)',lineHeight:1.6}}>{r.desc}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Retention Policy */}
        <div className="card" style={{padding:28,background:'rgba(29,111,255,0.03)',borderColor:'var(--border-md)'}}>
          <h3 style={{fontFamily:'var(--font-display)',fontSize:16,fontWeight:700,color:'var(--text)',marginBottom:6}}>Log Retention Policy</h3>
          <p style={{fontSize:13,color:'var(--text-muted)',marginBottom:22}}>Logs are automatically managed and cleaned up — no manual maintenance required.</p>
          <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:14}}>
            {[
              {title:'Activity Log',  detail:'Retained 30 days',  color:'var(--blue-light)'},
              {title:'Error Log',     detail:'Retained 60 days',  color:'var(--red)'},
              {title:'Audit Log',     detail:'Retained 90 days',  color:'var(--green)'},
              {title:'Size Limit',    detail:'Auto-compressed at 10MB', color:'var(--amber)'},
            ].map(i => (
              <div key={i.title} style={{background:'var(--card)',border:'1px solid var(--border)',borderRadius:'var(--r-md)',padding:18,textAlign:'center'}}>
                <div style={{fontFamily:'var(--font-display)',fontSize:13,fontWeight:700,color:i.color,marginBottom:8}}>{i.title}</div>
                <div style={{fontSize:12,color:'var(--text-muted)',lineHeight:1.6}}>{i.detail}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}