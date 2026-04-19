import React, { useEffect, useState } from 'react'
import API from '../api/axios'
import Navbar from '../components/Navbar.jsx'
import { useAuth } from '../context/AuthContext'

const STATUS_CONFIG = {
  pending:  { badge: 'badge-amber', label: 'Pending'  },
  approved: { badge: 'badge-green', label: 'Approved' },
  rejected: { badge: 'badge-red',   label: 'Rejected' },
}

const EMPTY_FORM = { product:'', quantity:'', total_cost:'', supplier:'', notes:'' }

function validate(form) {
  const e = {}
  if (!form.product.trim())     e.product    = 'Required'
  const qty = Number(form.quantity)
  if (!form.quantity.toString().trim()) e.quantity = 'Required'
  else if (isNaN(qty) || qty < 1)       e.quantity = 'Must be a positive number'
  const cost = Number(form.total_cost)
  if (!form.total_cost.toString().trim()) e.total_cost = 'Required'
  else if (isNaN(cost) || cost < 0)       e.total_cost = 'Must be a positive number'
  return e
}

export default function PurchaseOrders() {
  const [orders,  setOrders]  = useState([])
  const [loading, setLoading] = useState(true)

  // Form state
  const [showForm,    setShowForm]    = useState(false)
  const [editOrder,   setEditOrder]   = useState(null)   // null = create, object = edit
  const [form,        setForm]        = useState(EMPTY_FORM)
  const [fieldErrors, setFieldErrors] = useState({})
  const [submitError, setSubmitError] = useState('')
  const [submitting,  setSubmitting]  = useState(false)

  // Notes modal for approve/reject
  const [actionModal, setActionModal] = useState(null)  // { id, type: 'approve'|'reject' }
  const [actionNotes, setActionNotes] = useState('')

  const { user } = useAuth()
  const isAdmin   = user?.role === 'admin'
  const isManager = user?.role === 'manager'
  const canCreate = isAdmin || isManager
  const canEdit   = isAdmin || isManager

  const fetchOrders = async () => {
    try { const r = await API.get('/purchase-orders/'); setOrders(r.data) }
    catch(e) { console.error(e) } finally { setLoading(false) }
  }
  useEffect(() => { fetchOrders() }, [])

  /* ── Create / Edit submit ── */
  const handleSubmit = async () => {
    const errs = validate(form)
    if (Object.keys(errs).length) { setFieldErrors(errs); return }
    setFieldErrors({}); setSubmitError(''); setSubmitting(true)
    try {
      const payload = {
        product:    form.product.trim(),
        quantity:   parseInt(form.quantity),
        total_cost: parseFloat(form.total_cost),
        supplier:   form.supplier.trim() || null,
        notes:      form.notes.trim()    || null,
      }
      if (editOrder) {
        await API.put(`/purchase-orders/${editOrder.id}`, payload)
      } else {
        await API.post('/purchase-orders/', payload)
      }
      closeForm()
      fetchOrders()
    } catch(err) {
      setSubmitError(err.response?.data?.detail || 'Something went wrong.')
    } finally {
      setSubmitting(false)
    }
  }

  const openCreate = () => {
    setEditOrder(null); setForm(EMPTY_FORM); setFieldErrors({}); setSubmitError(''); setShowForm(true)
  }
  const openEdit = (order) => {
    setEditOrder(order)
    setForm({
      product:    order.product    || '',
      quantity:   order.quantity?.toString()   || '',
      total_cost: order.total_cost?.toString() || '',
      supplier:   order.supplier   || '',
      notes:      order.notes      || '',
    })
    setFieldErrors({}); setSubmitError(''); setShowForm(true)
  }
  const closeForm = () => { setShowForm(false); setEditOrder(null); setForm(EMPTY_FORM); setFieldErrors({}); setSubmitError('') }

  const onChange = (k, v) => { setForm(p=>({...p,[k]:v})); if(fieldErrors[k]) setFieldErrors(p=>({...p,[k]:''})); setSubmitError('') }

  /* ── Approve / Reject (admin only) ── */
  const handleAction = async () => {
    if (!actionModal) return
    const { id, type } = actionModal
    try {
      await API.post(`/purchase-orders/${id}/${type}`, { notes: actionNotes || (type==='approve'?'Approved':'Rejected') })
      setActionModal(null); setActionNotes(''); fetchOrders()
    } catch(e) { alert(e.response?.data?.detail || 'Error') }
  }

  const pending  = orders.filter(o => o.status === 'pending').length
  const approved = orders.filter(o => o.status === 'approved').length
  const rejected = orders.filter(o => o.status === 'rejected').length

  return (
    <div style={{ background:'var(--void)', minHeight:'100vh' }}>
      <div className="grid-bg"/>
      <Navbar/>
      <div style={{ padding:'32px 40px', maxWidth:1400, margin:'0 auto', position:'relative', zIndex:1 }}>

        {/* Header */}
        <div className="page-header">
          <div>
            <h1 className="page-title">Purchase Orders</h1>
            <p className="page-subtitle">{orders.length} total orders</p>
          </div>
          {canCreate && (
            <button className="btn btn-primary" onClick={openCreate} style={{ gap:7 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              New Order
            </button>
          )}
        </div>

        {/* Role notice */}
        {isManager && (
          <div className="viewer-notice" style={{ marginBottom:20 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            Manager access — you can create and edit orders. Approve or reject is restricted to admins.
          </div>
        )}

        {/* Stats */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:16, marginBottom:24 }}>
          {[
            { label:'Pending',  value:pending,       color:'var(--amber)'      },
            { label:'Approved', value:approved,      color:'var(--green)'      },
            { label:'Rejected', value:rejected,      color:'var(--red)'        },
            { label:'Total',    value:orders.length, color:'var(--blue-light)' },
          ].map(s => (
            <div key={s.label} className="stat-card">
              <div className="stat-value" style={{color:s.color}}>{s.value}</div>
              <div className="stat-label">{s.label}</div>
            </div>
          ))}
        </div>

        {/* ── Create / Edit Modal ── */}
        {showForm && canCreate && (
          <div className="modal-overlay" onClick={e=>{if(e.target===e.currentTarget)closeForm()}}>
            <div className="modal-box" style={{maxWidth:520}}>
              <div className="modal-header">
                <h3 className="modal-title">{editOrder ? 'Edit Purchase Order' : 'New Purchase Order'}</h3>
                <button className="modal-close" onClick={closeForm}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              </div>

              {submitError && <div className="alert alert-error">{submitError}</div>}

              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:20 }}>
                {/* Product */}
                <div className="form-group" style={{gridColumn:'1/-1',marginBottom:0}}>
                  <label className="form-label">Product Name <span style={{color:'var(--red)'}}>*</span></label>
                  <input className={`form-input ${fieldErrors.product?'error':''}`} value={form.product} onChange={e=>onChange('product',e.target.value)} placeholder="e.g. Laptop Pro 15"/>
                  {fieldErrors.product && <p className="form-error">{fieldErrors.product}</p>}
                </div>
                {/* Quantity */}
                <div className="form-group" style={{marginBottom:0}}>
                  <label className="form-label">Quantity <span style={{color:'var(--red)'}}>*</span></label>
                  <input className={`form-input ${fieldErrors.quantity?'error':''}`} type="number" min="1" value={form.quantity} onChange={e=>onChange('quantity',e.target.value)} placeholder="e.g. 50"/>
                  {fieldErrors.quantity && <p className="form-error">{fieldErrors.quantity}</p>}
                </div>
                {/* Total Cost */}
                <div className="form-group" style={{marginBottom:0}}>
                  <label className="form-label">Total Cost ($) <span style={{color:'var(--red)'}}>*</span></label>
                  <input className={`form-input ${fieldErrors.total_cost?'error':''}`} type="number" min="0" step="0.01" value={form.total_cost} onChange={e=>onChange('total_cost',e.target.value)} placeholder="e.g. 25000"/>
                  {fieldErrors.total_cost && <p className="form-error">{fieldErrors.total_cost}</p>}
                </div>
                {/* Supplier */}
                <div className="form-group" style={{gridColumn:'1/-1',marginBottom:0}}>
                  <label className="form-label">Supplier Name</label>
                  <input className="form-input" value={form.supplier} onChange={e=>onChange('supplier',e.target.value)} placeholder="e.g. TechSupplier Inc"/>
                </div>
                {/* Notes */}
                <div className="form-group" style={{gridColumn:'1/-1',marginBottom:0}}>
                  <label className="form-label">Notes</label>
                  <textarea className="form-input" value={form.notes} onChange={e=>onChange('notes',e.target.value)} placeholder="Optional notes for this order..." rows={3} style={{resize:'vertical', minHeight:72}}/>
                </div>
              </div>

              <p style={{fontSize:12,color:'var(--text-dim)',marginBottom:20}}><span style={{color:'var(--red)'}}>*</span> Required fields</p>

              <div style={{display:'flex',gap:10,justifyContent:'flex-end'}}>
                <button className="btn btn-ghost" onClick={closeForm}>Cancel</button>
                <button className="btn btn-primary" onClick={handleSubmit} disabled={submitting}>
                  {submitting ? <><span className="spinner" style={{width:14,height:14,borderWidth:2}}/> Saving...</> : editOrder ? 'Update Order' : 'Create Order'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Approve / Reject Notes Modal (admin only) ── */}
        {actionModal && isAdmin && (
          <div className="modal-overlay" onClick={e=>{if(e.target===e.currentTarget){setActionModal(null);setActionNotes('')}}}>
            <div className="modal-box" style={{maxWidth:420}}>
              <div className="modal-header">
                <h3 className="modal-title" style={{color: actionModal.type==='approve'?'var(--green)':'var(--red)'}}>
                  {actionModal.type==='approve' ? 'Approve Order' : 'Reject Order'} #{actionModal.id}
                </h3>
                <button className="modal-close" onClick={()=>{setActionModal(null);setActionNotes('')}}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              </div>
              <div className="form-group">
                <label className="form-label">Notes (optional)</label>
                <textarea className="form-input" value={actionNotes} onChange={e=>setActionNotes(e.target.value)} placeholder={actionModal.type==='approve'?'Approval notes...':'Reason for rejection...'} rows={3} style={{resize:'vertical'}}/>
              </div>
              <div style={{display:'flex',gap:10,justifyContent:'flex-end',marginTop:8}}>
                <button className="btn btn-ghost" onClick={()=>{setActionModal(null);setActionNotes('')}}>Cancel</button>
                <button
                  className={`btn ${actionModal.type==='approve'?'btn-success':'btn-danger'}`}
                  onClick={handleAction}
                >
                  {actionModal.type==='approve' ? 'Confirm Approve' : 'Confirm Reject'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Table ── */}
        {loading ? (
          <div className="loading-screen"><div className="spinner"/><p className="loading-text">Loading orders...</p></div>
        ) : orders.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
            </div>
            <p className="empty-state-title">No purchase orders yet</p>
            <p className="empty-state-sub">{canCreate ? 'Click "New Order" to create the first one.' : 'Purchase orders created by agents will appear here.'}</p>
          </div>
        ) : (
          <div className="card" style={{overflow:'hidden'}}>
            <div style={{overflowX:'auto'}}>
              <table className="data-table" style={{minWidth:780}}>
                <thead>
                  <tr>
                    {['ID','Product','Qty','Total','Supplier','Status','Requested By','Actions'].map(h=><th key={h}>{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {orders.map(o => {
                    const sc = STATUS_CONFIG[o.status] || STATUS_CONFIG.pending
                    return (
                      <tr key={o.id}>
                        <td style={{color:'var(--text-muted)',fontFamily:'var(--font-mono)',fontSize:12}}>#{o.id}</td>
                        <td style={{fontWeight:500}}>{o.product}</td>
                        <td>{o.quantity}</td>
                        <td style={{color:'var(--green)',fontWeight:600,fontFamily:'var(--font-mono)',fontSize:12}}>${o.total_cost?.toLocaleString()}</td>
                        <td style={{color:'var(--text-muted)'}}>{o.supplier || '—'}</td>
                        <td><span className={`badge ${sc.badge}`}>{sc.label}</span></td>
                        <td style={{color:'var(--text-muted)',fontSize:12}}>{o.requested_by}</td>
                        <td>
                          <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>

                            {/* Edit — admin or manager, any status */}
                            {canEdit && (
                              <button className="btn btn-ghost btn-sm" onClick={()=>openEdit(o)} style={{gap:5,padding:'5px 9px'}} title="Edit order">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                                Edit
                              </button>
                            )}

                            {/* Approve / Reject — admin only, pending orders only */}
                            {isAdmin && o.status === 'pending' && (
                              <>
                                <button className="btn btn-success btn-sm" onClick={()=>{setActionModal({id:o.id,type:'approve'});setActionNotes('')}} style={{gap:5}}>
                                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                                  Approve
                                </button>
                                <button className="btn btn-danger btn-sm" onClick={()=>{setActionModal({id:o.id,type:'reject'});setActionNotes('')}} style={{gap:5}}>
                                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                                  Reject
                                </button>
                              </>
                            )}

                          </div>
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