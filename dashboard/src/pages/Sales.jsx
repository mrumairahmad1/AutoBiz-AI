import React, { useEffect, useState, useMemo } from 'react'
import API from '../api/axios'
import Navbar from '../components/Navbar.jsx'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'

const EMPTY = { product:'', sku:'', quantity:'', amount:'', category:'' }
const FILTERS = ['All','This Week','This Month']

function validate(f) {
  const e = {}
  if (!f.product.trim()) e.product = 'Product name is required'
  const qty = Number(f.quantity)
  if (!f.quantity.toString().trim()) e.quantity = 'Quantity is required'
  else if (!Number.isInteger(qty)||qty<=0) e.quantity = 'Must be a positive whole number'
  const amt = Number(f.amount)
  if (!f.amount.toString().trim()) e.amount = 'Amount is required'
  else if (isNaN(amt)||amt<=0) e.amount = 'Must be a positive number'
  return e
}

function ConfirmDialog({ msg, onOk, onCancel }) {
  return (
    <div className="modal-overlay" onClick={e=>{if(e.target===e.currentTarget)onCancel()}}>
      <div className="modal-box" style={{maxWidth:400}}>
        <h3 className="modal-title" style={{marginBottom:12}}>Confirm Action</h3>
        <p style={{fontSize:14,color:'var(--text-muted)',marginBottom:24,lineHeight:1.6}}>{msg}</p>
        <div style={{display:'flex',gap:10,justifyContent:'flex-end'}}>
          <button className="btn btn-ghost" onClick={onCancel}>Cancel</button>
          <button className="btn btn-danger" onClick={onOk}>Delete</button>
        </div>
      </div>
    </div>
  )
}

export default function Sales() {
  const [sales,          setSales]          = useState([])
  const [loading,        setLoading]        = useState(true)
  const [showForm,       setShowForm]       = useState(false)
  const [form,           setForm]           = useState(EMPTY)
  const [fieldErrors,    setFieldErrors]    = useState({})
  const [submitError,    setSubmitError]    = useState('')
  const [submitting,     setSubmitting]     = useState(false)
  const [search,         setSearch]         = useState('')
  const [filter,         setFilter]         = useState('All')
  const [confirmDelete,  setConfirmDelete]  = useState(null)
  const { user } = useAuth()
  const { addToast } = useToast()
  const canEdit = user?.role==='admin'||user?.role==='manager'

  useEffect(()=>{
    fetchSales()
    const t=setInterval(fetchSales, 10000)
    return ()=>clearInterval(t)
  },[])

  const fetchSales=async()=>{
    try{const r=await API.get('/sales/');setSales(r.data||[])}
    catch(e){console.error(e)} finally{setLoading(false)}
  }

  const displaySales=useMemo(()=>{
    let list=[...sales]
    if(filter==='This Week'){const c=Date.now()-7*86400000;list=list.filter(s=>s.sale_date&&new Date(s.sale_date).getTime()>=c)}
    if(filter==='This Month'){const c=Date.now()-30*86400000;list=list.filter(s=>s.sale_date&&new Date(s.sale_date).getTime()>=c)}
    if(search.trim()){const q=search.toLowerCase();list=list.filter(s=>s.product?.toLowerCase().includes(q)||s.sku?.toLowerCase().includes(q)||s.category?.toLowerCase().includes(q))}
    return list
  },[sales,search,filter])

  const totalRevenue=useMemo(()=>displaySales.reduce((a,s)=>a+(s.amount||0),0),[displaySales])
  const totalUnits  =useMemo(()=>displaySales.reduce((a,s)=>a+(s.quantity||0),0),[displaySales])

  const onChange=(k,v)=>{setForm(p=>({...p,[k]:v}));if(fieldErrors[k])setFieldErrors(p=>({...p,[k]:''}));setSubmitError('')}

  const onSubmit=async()=>{
    setSubmitError('')
    const errs=validate(form)
    if(Object.keys(errs).length){setFieldErrors(errs);return}
    setFieldErrors({});setSubmitting(true)
    try{
      const payload={product:form.product.trim(),quantity:parseInt(form.quantity,10),amount:parseFloat(form.amount),sku:form.sku.trim()||null,category:form.category.trim()||null}
      const r=await API.post('/sales/add',payload)
      addToast(`Sale recorded: "${payload.product}" — ${payload.quantity} units for $${payload.amount.toFixed(2)}`,'success')
      if(r.data?.warning) addToast(r.data.warning,'warning')
      closeForm();fetchSales()
    } catch(err){
      const d=err.response?.data?.detail
      const msg=typeof d==='string'?d:'Failed to add sale.'
      setSubmitError(msg);addToast(msg,'error')
    } finally{setSubmitting(false)}
  }

  const doDelete=async()=>{
    const {id,product}=confirmDelete;setConfirmDelete(null)
    try{await API.delete(`/sales/${id}`);addToast(`Sale record for "${product}" deleted.`,'info');fetchSales()}
    catch(e){addToast(e.response?.data?.detail||'Error deleting sale.','error')}
  }

  const closeForm=()=>{setShowForm(false);setForm(EMPTY);setFieldErrors({});setSubmitError('')}

  return (
    <div style={{background:'var(--void)',minHeight:'100vh'}}>
      <div className="grid-bg"/><Navbar/>
      <div style={{padding:'32px 40px',maxWidth:1400,margin:'0 auto',position:'relative',zIndex:1}}>

        <div className="page-header">
          <div>
            <h1 className="page-title">Sales</h1>
            <p className="page-subtitle">{sales.length} total records{filter!=='All'?` · ${displaySales.length} shown`:''}</p>
          </div>
          {canEdit&&(
            <button className="btn btn-primary" onClick={()=>{setForm(EMPTY);setFieldErrors({});setSubmitError('');setShowForm(true)}}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              Add Sale
            </button>
          )}
        </div>

        {!canEdit&&<div className="viewer-notice" style={{marginBottom:16}}>View Only</div>}

        <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:16,marginBottom:20}}>
          {[
            {label:'Revenue',     value:`$${totalRevenue.toLocaleString(undefined,{maximumFractionDigits:0})}`,color:'var(--green)'},
            {label:'Units Sold',  value:totalUnits.toLocaleString(),                                            color:'var(--blue-light)'},
            {label:'Transactions',value:displaySales.length,                                                     color:'var(--purple)'},
          ].map(s=>(
            <div key={s.label} className="stat-card">
              <div className="stat-value" style={{color:s.color}}>{s.value}</div>
              <div className="stat-label">{s.label}</div>
            </div>
          ))}
        </div>

        <div style={{display:'flex',gap:12,marginBottom:20,alignItems:'center',flexWrap:'wrap'}}>
          <div style={{position:'relative',flex:1,minWidth:200}}>
            <svg style={{position:'absolute',left:12,top:'50%',transform:'translateY(-50%)',color:'var(--text-dim)',pointerEvents:'none'}} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input className="form-input" style={{paddingLeft:36,margin:0}} placeholder="Search by product, SKU, or category..." value={search} onChange={e=>setSearch(e.target.value)}/>
            {search&&<button onClick={()=>setSearch('')} style={{position:'absolute',right:10,top:'50%',transform:'translateY(-50%)',background:'none',border:'none',cursor:'pointer',color:'var(--text-dim)',display:'flex',padding:4}}><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>}
          </div>
          <div style={{display:'flex',gap:4,background:'var(--elevated)',border:'1px solid var(--border)',borderRadius:'var(--r-md)',padding:4}}>
            {FILTERS.map(f=>(
              <button key={f} onClick={()=>setFilter(f)}
                style={{padding:'6px 14px',fontSize:12,fontWeight:600,borderRadius:'var(--r-sm)',border:'none',cursor:'pointer',transition:'var(--t)',background:filter===f?'var(--blue)':'transparent',color:filter===f?'#fff':'var(--text-muted)'}}>
                {f}
              </button>
            ))}
          </div>
        </div>

        {showForm&&canEdit&&(
          <div className="modal-overlay" onClick={e=>{if(e.target===e.currentTarget)closeForm()}}>
            <div className="modal-box" style={{maxWidth:500}}>
              <div className="modal-header">
                <h3 className="modal-title">Add New Sale</h3>
                <button className="modal-close" onClick={closeForm}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
              </div>
              {submitError&&<div className="alert alert-error" style={{marginBottom:16}}>{submitError}</div>}
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16,marginBottom:16}}>
                <div className="form-group" style={{gridColumn:'1/-1',marginBottom:0}}>
                  <label className="form-label">Product Name <span style={{color:'var(--red)'}}>*</span></label>
                  <input className={`form-input ${fieldErrors.product?'error':''}`} value={form.product} onChange={e=>onChange('product',e.target.value)} placeholder="e.g. Wireless Mouse"/>
                  {fieldErrors.product&&<p className="form-error">{fieldErrors.product}</p>}
                </div>
                <div className="form-group" style={{marginBottom:0}}>
                  <label className="form-label">Quantity <span style={{color:'var(--red)'}}>*</span></label>
                  <input className={`form-input ${fieldErrors.quantity?'error':''}`} type="number" min="1" step="1" value={form.quantity} onChange={e=>onChange('quantity',e.target.value)} placeholder="e.g. 10"/>
                  {fieldErrors.quantity&&<p className="form-error">{fieldErrors.quantity}</p>}
                </div>
                <div className="form-group" style={{marginBottom:0}}>
                  <label className="form-label">Total Amount ($) <span style={{color:'var(--red)'}}>*</span></label>
                  <input className={`form-input ${fieldErrors.amount?'error':''}`} type="number" min="0" step="0.01" value={form.amount} onChange={e=>onChange('amount',e.target.value)} placeholder="e.g. 250.00"/>
                  {fieldErrors.amount&&<p className="form-error">{fieldErrors.amount}</p>}
                </div>
                <div className="form-group" style={{marginBottom:0}}>
                  <label className="form-label">SKU <span style={{color:'var(--text-dim)',fontSize:11}}>(optional)</span></label>
                  <input className="form-input" value={form.sku} onChange={e=>onChange('sku',e.target.value)} placeholder="e.g. MOU-001"/>
                </div>
                <div className="form-group" style={{marginBottom:0}}>
                  <label className="form-label">Category <span style={{color:'var(--text-dim)',fontSize:11}}>(optional)</span></label>
                  <input className="form-input" value={form.category} onChange={e=>onChange('category',e.target.value)} placeholder="e.g. Electronics"/>
                </div>
              </div>
              <p style={{fontSize:12,color:'var(--text-dim)',marginBottom:16}}><span style={{color:'var(--red)'}}>*</span> Required. SKU and Category are optional.</p>
              <div style={{display:'flex',gap:10,justifyContent:'flex-end'}}>
                <button className="btn btn-ghost" onClick={closeForm}>Cancel</button>
                <button className="btn btn-primary" onClick={onSubmit} disabled={submitting}>
                  {submitting?<><span className="spinner" style={{width:14,height:14,borderWidth:2}}/>Saving...</>:'Save Sale'}
                </button>
              </div>
            </div>
          </div>
        )}

        {confirmDelete&&<ConfirmDialog msg={`Delete this sale record for "${confirmDelete.product}"? This cannot be undone.`} onOk={doDelete} onCancel={()=>setConfirmDelete(null)}/>}

        {loading?(
          <div className="loading-screen"><div className="spinner"/><p className="loading-text">Loading sales...</p></div>
        ):displaySales.length===0?(
          <div className="empty-state">
            <div className="empty-state-icon"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg></div>
            <p className="empty-state-title">{search||filter!=='All'?'No matching records':'No sales recorded yet'}</p>
            <p className="empty-state-sub">{search||filter!=='All'?'Try a different search or filter':'Add your first sale or import from CSV'}</p>
            {(search||filter!=='All')&&<button className="btn btn-ghost" style={{marginTop:12}} onClick={()=>{setSearch('');setFilter('All')}}>Clear Filters</button>}
          </div>
        ):(
          <div className="card" style={{overflow:'hidden'}}>
            <div style={{overflowX:'auto'}}>
              <table className="data-table" style={{minWidth:600}}>
                <thead><tr>{['Product','SKU','Qty','Amount','Category','Date',...(canEdit?['Action']:[])].map(h=><th key={h}>{h}</th>)}</tr></thead>
                <tbody>
                  {displaySales.map(s=>(
                    <tr key={s.id}>
                      <td style={{fontWeight:500}}>{s.product}</td>
                      <td>{s.sku?<span className="sku-chip">{s.sku}</span>:<span style={{color:'var(--text-dim)'}}>—</span>}</td>
                      <td>{s.quantity}</td>
                      <td style={{color:'var(--green)',fontWeight:600,fontFamily:'var(--font-mono)',fontSize:12}}>${Number(s.amount||0).toLocaleString()}</td>
                      <td>{s.category?<span className="badge badge-blue">{s.category}</span>:<span style={{color:'var(--text-dim)'}}>—</span>}</td>
                      <td style={{color:'var(--text-muted)',fontFamily:'var(--font-mono)',fontSize:12}}>{s.sale_date?new Date(s.sale_date).toLocaleDateString():'—'}</td>
                      {canEdit&&<td>
                        <button className="btn btn-danger btn-sm" onClick={()=>setConfirmDelete({id:s.id,product:s.product})} style={{padding:'5px 10px',fontSize:12}}>Delete</button>
                      </td>}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}