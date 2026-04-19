import React, { useEffect, useRef, useState } from 'react'
import API from '../api/axios'
import Navbar from '../components/Navbar.jsx'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import { useToast } from '../context/ToastContext'

const DbIcon = () => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg>
const UpIcon  = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>

function CsvUpload({ type, label, color, onDone }) {
  const [file,      setFile]      = useState(null)
  const [preview,   setPreview]   = useState(null)
  const [uploading, setUploading] = useState(false)
  const [result,    setResult]    = useState(null)
  const [error,     setError]     = useState('')
  const inputRef = useRef()
  const { addToast } = useToast()

  const handleFile = e => {
    const f = e.target.files?.[0]
    if (!f) return
    if (!f.name.toLowerCase().endsWith('.csv')) { setError('Only .csv files are allowed.'); return }
    setFile(f); setError(''); setResult(null)
    const reader = new FileReader()
    reader.onload = ev => {
      const lines = ev.target.result.split('\n').filter(l => l.trim())
      const cols  = lines[0].split(',').map(c => c.trim().replace(/"/g, ''))
      setPreview({ columns: cols, rowCount: lines.length - 1 })
    }
    reader.readAsText(f)
  }

  const handleUpload = async () => {
    if (!file) return
    setUploading(true); setError(''); setResult(null)
    const fd = new FormData()
    fd.append('file', file)
    try {
      const r = await API.post(`/db-setup/upload-csv/${type}`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      setResult(r.data)
      addToast(`${r.data.rows_imported} ${label.toLowerCase()} records imported from CSV. Now showing CSV data.`, 'success')
      setFile(null); setPreview(null)
      if (inputRef.current) inputRef.current.value = ''
      onDone?.()
    } catch(e) {
      const msg = e.response?.data?.detail || 'Upload failed.'
      setError(msg); addToast(msg, 'error')
    } finally { setUploading(false) }
  }

  return (
    <div style={{ background:'var(--surface)', border:`1px solid ${color}30`, borderRadius:'var(--r-lg)', padding:24 }}>
      <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:16 }}>
        <div style={{ width:36, height:36, borderRadius:'var(--r-md)', background:`${color}15`, border:`1px solid ${color}30`, display:'flex', alignItems:'center', justifyContent:'center', color }}>
          <UpIcon/>
        </div>
        <div>
          <div style={{ fontSize:14, fontWeight:700, color:'var(--text)' }}>{label} CSV Import</div>
          <div style={{ fontSize:12, color:'var(--text-muted)' }}>Stored separately from database — switch between them at any time</div>
        </div>
      </div>

      {error  && <div className="alert alert-error"   style={{ marginBottom:12, fontSize:13 }}>{error}</div>}
      {result && (
        <div className="alert alert-success" style={{ marginBottom:12, fontSize:13 }}>
          {result.message}
          {result.columns && <div style={{ marginTop:6, fontSize:11, color:'var(--text-muted)' }}>
            Detected columns: {result.columns.slice(0,8).join(', ')}{result.columns.length > 8 ? '...' : ''}
          </div>}
        </div>
      )}

      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={e => e.preventDefault()}
        onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files?.[0]; if (f) handleFile({ target: { files: [f] } }) }}
        style={{ border:`2px dashed ${file ? color : 'var(--border-md)'}`, borderRadius:'var(--r-md)', padding:'20px 16px', textAlign:'center', cursor:'pointer', background:file ? `${color}06` : 'transparent', marginBottom:14, transition:'var(--t)' }}>
        <input ref={inputRef} type="file" accept=".csv" onChange={handleFile} style={{ display:'none' }}/>
        {file ? (
          <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:8, color }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
            <span style={{ fontSize:13, fontWeight:600 }}>{file.name}</span>
            <span style={{ fontSize:12, color:'var(--text-dim)' }}>({(file.size/1024).toFixed(1)} KB)</span>
          </div>
        ) : (
          <>
            <div style={{ color:'var(--text-dim)', marginBottom:6 }}><UpIcon/></div>
            <div style={{ fontSize:13, color:'var(--text-muted)', marginBottom:4 }}>Drop CSV here or click to browse</div>
            <div style={{ fontSize:11, color:'var(--text-dim)' }}>Any column names supported — system maps them automatically</div>
          </>
        )}
      </div>

      {preview && (
        <div style={{ marginBottom:14, background:'var(--card)', border:'1px solid var(--border)', borderRadius:'var(--r-md)', padding:14 }}>
          <div style={{ fontSize:11, color:'var(--text-dim)', fontWeight:600, textTransform:'uppercase', letterSpacing:'0.6px', marginBottom:8 }}>
            {preview.columns.length} columns detected — {preview.rowCount} rows
          </div>
          <div style={{ display:'flex', gap:4, flexWrap:'wrap' }}>
            {preview.columns.map(c => (
              <span key={c} style={{ background:`${color}15`, border:`1px solid ${color}30`, color, fontSize:11, fontWeight:600, padding:'2px 8px', borderRadius:4, fontFamily:'var(--font-mono)' }}>{c}</span>
            ))}
          </div>
        </div>
      )}

      <button onClick={handleUpload} disabled={!file || uploading}
        style={{ width:'100%', display:'flex', alignItems:'center', justifyContent:'center', gap:8, padding:'10px 0', borderRadius:'var(--r-md)', border:'none', cursor:file&&!uploading?'pointer':'not-allowed', fontWeight:600, fontSize:13, background:file&&!uploading?color:'var(--elevated)', color:file&&!uploading?'#fff':'var(--text-dim)', boxShadow:file&&!uploading?`0 4px 16px ${color}40`:'none', transition:'var(--t)' }}>
        {uploading ? <><span className="spinner" style={{ width:14, height:14, borderWidth:2 }}/>Importing...</> : <><UpIcon/>Upload {label} CSV</>}
      </button>
      <p style={{ fontSize:11, color:'var(--text-dim)', marginTop:8, textAlign:'center' }}>
        This does not delete database data. You can switch back to DB at any time.
      </p>
    </div>
  )
}


export default function DBSetup() {
  const [form,       setForm]       = useState({ host:'', port:5432, database:'', username:'', password:'', ssl:false })
  const [current,    setCurrent]    = useState(null)
  const [sourceInfo, setSourceInfo] = useState({ source:'db', csv_available:false })
  const [testing,    setTesting]    = useState(false)
  const [saving,     setSaving]     = useState(false)
  const [testResult, setTestResult] = useState(null)
  const [error,      setError]      = useState('')
  const [tab,        setTab]        = useState('db')
  const { user } = useAuth()
  const navigate = useNavigate()
  const { addToast } = useToast()

  useEffect(() => {
    if (user?.role !== 'admin') { navigate('/chat'); return }
    fetchAll()
  }, [])

  const fetchAll = async () => {
    try {
      const [cRes, sRes] = await Promise.all([
        API.get('/db-setup/current'),
        API.get('/db-setup/source'),
      ])
      setCurrent(cRes.data)
      setSourceInfo(sRes.data)
      if (cRes.data.configured) {
        setForm(p => ({ ...p, host:cRes.data.host||'', port:cRes.data.port||5432,
          database:cRes.data.database||'', username:cRes.data.username||'', ssl:cRes.data.ssl||false }))
      }
    } catch(e) { console.error(e) }
  }

  const handleTest = async () => {
    setTesting(true); setTestResult(null); setError('')
    try {
      const r = await API.post('/db-setup/test', form)
      setTestResult(r.data)
      addToast('PostgreSQL connection test successful.', 'success')
    } catch(e) {
      const msg = e.response?.data?.detail || 'Connection test failed'
      setError(msg); addToast(msg, 'error')
    } finally { setTesting(false) }
  }

  const handleSave = async () => {
    setSaving(true); setError('')
    try {
      const r = await API.post('/db-setup/save', form)
      addToast('Database connected. All tables created automatically. Now showing database data.', 'success')
      setTestResult(null); fetchAll()
    } catch(e) {
      const msg = e.response?.data?.detail || 'Failed to save'
      setError(msg); addToast(msg, 'error')
    } finally { setSaving(false) }
  }

  const handleSwitchToDb = async () => {
    try {
      await API.post('/db-setup/switch-to-db')
      addToast('Switched to database. Now showing database records.', 'info')
      fetchAll()
    } catch(e) { addToast(e.response?.data?.detail || 'Switch failed', 'error') }
  }

  const handleSwitchToCsv = async () => {
    try {
      await API.post('/db-setup/switch-to-csv')
      addToast('Switched to CSV data. Now showing CSV records.', 'info')
      fetchAll()
    } catch(e) { addToast(e.response?.data?.detail || 'No CSV data available. Upload a CSV file first.', 'error') }
  }

  const handleReset = async () => {
    try {
      await API.delete('/db-setup/reset')
      setCurrent({ configured:false }); setForm({ host:'', port:5432, database:'', username:'', password:'', ssl:false })
      setTestResult(null); fetchAll()
      addToast('Reset to default .env configuration. Now showing database data.', 'info')
    } catch(e) { addToast(e.response?.data?.detail || 'Reset failed', 'error') }
  }

  const isDbSource  = sourceInfo.source === 'db'
  const isCsvSource = sourceInfo.source === 'csv'

  return (
    <div style={{ background:'var(--void)', minHeight:'100vh' }}>
      <div className="grid-bg"/><Navbar/>
      <div style={{ padding:'32px 40px', maxWidth:960, margin:'0 auto', position:'relative', zIndex:1 }}>

        <div className="page-header">
          <div>
            <h1 className="page-title">Database Configuration</h1>
            <p className="page-subtitle">Connect PostgreSQL or import CSV data — switch between them at any time</p>
          </div>
        </div>

        {/* Active Source Banner */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:20 }}>
          {/* DB source card */}
          <div style={{ background:isDbSource?'rgba(29,111,255,0.06)':'var(--surface)', border:`1px solid ${isDbSource?'var(--blue)':'var(--border)'}`, borderRadius:'var(--r-lg)', padding:20, cursor:'pointer', transition:'var(--t)', position:'relative', overflow:'hidden' }}
            onClick={isDbSource ? undefined : handleSwitchToDb}>
            {isDbSource && <div style={{ position:'absolute', top:0, left:0, right:0, height:2, background:'var(--blue)' }}/>}
            <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:8 }}>
              <div style={{ width:36, height:36, borderRadius:'var(--r-md)', background:'rgba(29,111,255,0.1)', display:'flex', alignItems:'center', justifyContent:'center', color:'var(--blue-light)' }}><DbIcon/></div>
              <div>
                <div style={{ fontSize:13, fontWeight:700, color:'var(--text)' }}>PostgreSQL Database</div>
                <div style={{ fontSize:11, color:'var(--text-muted)' }}>{current?.configured ? `${current.host}/${current.database}` : 'Default .env config'}</div>
              </div>
            </div>
            {isDbSource ? (
              <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                <div style={{ width:6, height:6, borderRadius:'50%', background:'var(--blue)', animation:'pulse-dot 2s ease-in-out infinite' }}/>
                <span style={{ fontSize:12, color:'var(--blue-light)', fontWeight:600 }}>Active Source</span>
              </div>
            ) : (
              <button style={{ fontSize:12, color:'var(--blue-light)', fontWeight:600, background:'rgba(29,111,255,0.08)', border:'1px solid rgba(29,111,255,0.2)', borderRadius:'var(--r-sm)', padding:'4px 10px', cursor:'pointer' }}>
                Switch to DB
              </button>
            )}
          </div>

          {/* CSV source card */}
          <div style={{ background:isCsvSource?'rgba(0,224,150,0.06)':'var(--surface)', border:`1px solid ${isCsvSource?'var(--green)':'var(--border)'}`, borderRadius:'var(--r-lg)', padding:20, cursor:sourceInfo.csv_available&&!isCsvSource?'pointer':'default', transition:'var(--t)', position:'relative', overflow:'hidden' }}
            onClick={sourceInfo.csv_available && !isCsvSource ? handleSwitchToCsv : undefined}>
            {isCsvSource && <div style={{ position:'absolute', top:0, left:0, right:0, height:2, background:'var(--green)' }}/>}
            <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:8 }}>
              <div style={{ width:36, height:36, borderRadius:'var(--r-md)', background:'rgba(0,224,150,0.1)', display:'flex', alignItems:'center', justifyContent:'center', color:'var(--green)' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
              </div>
              <div>
                <div style={{ fontSize:13, fontWeight:700, color:'var(--text)' }}>CSV Data</div>
                <div style={{ fontSize:11, color:'var(--text-muted)' }}>{sourceInfo.csv_available ? 'CSV file available — click to switch' : 'No CSV uploaded yet'}</div>
              </div>
            </div>
            {isCsvSource ? (
              <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                <div style={{ width:6, height:6, borderRadius:'50%', background:'var(--green)', animation:'pulse-dot 2s ease-in-out infinite' }}/>
                <span style={{ fontSize:12, color:'var(--green)', fontWeight:600 }}>Active Source</span>
              </div>
            ) : sourceInfo.csv_available ? (
              <button style={{ fontSize:12, color:'var(--green)', fontWeight:600, background:'rgba(0,224,150,0.08)', border:'1px solid rgba(0,224,150,0.2)', borderRadius:'var(--r-sm)', padding:'4px 10px', cursor:'pointer' }}>
                Switch to CSV
              </button>
            ) : (
              <span style={{ fontSize:12, color:'var(--text-dim)' }}>Upload a CSV below to enable</span>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display:'flex', gap:4, background:'var(--elevated)', border:'1px solid var(--border)', borderRadius:'var(--r-md)', padding:4, marginBottom:20, width:'fit-content' }}>
          {[{key:'db',label:'Database Connection'},{key:'csv',label:'CSV Import'}].map(t=>(
            <button key={t.key} onClick={()=>setTab(t.key)}
              style={{ padding:'8px 20px', fontSize:13, fontWeight:600, borderRadius:'var(--r-sm)', border:'none', cursor:'pointer', transition:'var(--t)', background:tab===t.key?'var(--blue)':'transparent', color:tab===t.key?'#fff':'var(--text-muted)' }}>
              {t.label}
            </button>
          ))}
        </div>

        {tab === 'db' && (
          <div className="card" style={{ padding:28 }}>
            <h3 style={{ fontFamily:'var(--font-display)', fontSize:16, fontWeight:700, color:'var(--text)', marginBottom:24 }}>PostgreSQL Connection</h3>
            <div className="alert alert-info" style={{ marginBottom:20 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ flexShrink:0 }}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              <div>Enter credentials, test connection, then save. All required tables are created automatically in the new database when you save.</div>
            </div>
            {error      && <div className="alert alert-error"   style={{ marginBottom:16 }}>{error}</div>}
            {testResult && <div className="alert alert-success" style={{ marginBottom:16 }}>{testResult.message}</div>}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:16 }}>
              <div className="form-group" style={{ gridColumn:'1/-1', marginBottom:0 }}>
                <label className="form-label">Host</label>
                <input className="form-input" value={form.host} onChange={e=>setForm({...form,host:e.target.value})} placeholder="localhost or db.company.com"/>
              </div>
              <div className="form-group" style={{ marginBottom:0 }}>
                <label className="form-label">Port</label>
                <input className="form-input" type="number" value={form.port} onChange={e=>setForm({...form,port:parseInt(e.target.value)||5432})} placeholder="5432"/>
              </div>
              <div className="form-group" style={{ marginBottom:0 }}>
                <label className="form-label">Database Name</label>
                <input className="form-input" value={form.database} onChange={e=>setForm({...form,database:e.target.value})} placeholder="company_db"/>
              </div>
              <div className="form-group" style={{ marginBottom:0 }}>
                <label className="form-label">Username</label>
                <input className="form-input" value={form.username} onChange={e=>setForm({...form,username:e.target.value})} placeholder="postgres"/>
              </div>
              <div className="form-group" style={{ marginBottom:0 }}>
                <label className="form-label">Password</label>
                <input className="form-input" type="password" value={form.password} onChange={e=>setForm({...form,password:e.target.value})} placeholder="Password"/>
              </div>
              <div style={{ gridColumn:'1/-1', display:'flex', alignItems:'center', gap:10 }}>
                <input type="checkbox" id="ssl" checked={form.ssl} onChange={e=>setForm({...form,ssl:e.target.checked})} style={{ width:16, height:16, cursor:'pointer', accentColor:'var(--blue)' }}/>
                <label htmlFor="ssl" style={{ fontSize:14, color:'var(--text)', cursor:'pointer' }}>Enable SSL <span style={{ color:'var(--text-muted)', fontSize:13 }}>(recommended for production)</span></label>
              </div>
            </div>
            <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
              <button className="btn btn-ghost" onClick={handleTest} disabled={testing||!form.host||!form.database||!form.username}>
                {testing ? <><span className="spinner" style={{ width:14, height:14, borderWidth:2 }}/>Testing...</> : 'Test Connection'}
              </button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving||!testResult||!form.host}>
                {saving ? <><span className="spinner" style={{ width:14, height:14, borderWidth:2 }}/>Saving...</> : 'Save and Connect'}
              </button>
              {current?.configured && (
                <button className="btn btn-danger btn-sm" onClick={handleReset} style={{ marginLeft:'auto' }}>Reset to Default</button>
              )}
            </div>
            {!testResult && <p style={{ fontSize:12, color:'var(--text-dim)', marginTop:10 }}>Test connection first — Save activates after successful test.</p>}
          </div>
        )}

        {tab === 'csv' && (
          <>
            <div className="alert alert-info" style={{ marginBottom:20 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ flexShrink:0 }}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              <div>CSV data is stored separately from your database. Any column names are supported — the system automatically detects and maps them. Switch between CSV and database at any time from the cards above.</div>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20 }}>
              <CsvUpload type="inventory" label="Inventory" color="var(--blue)"  onDone={fetchAll}/>
              <CsvUpload type="sales"     label="Sales"     color="var(--green)" onDone={fetchAll}/>
            </div>
          </>
        )}

      </div>
    </div>
  )
}