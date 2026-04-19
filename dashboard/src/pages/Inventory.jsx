import React, { useEffect, useState, useMemo } from 'react'
import API from '../api/axios'
import Navbar from '../components/Navbar.jsx'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'

const FORM_FIELDS = [
  { label:'Product Name',      key:'name',               type:'text',   req:true,  ph:'e.g. Laptop Pro'     },
  { label:'SKU Code',          key:'sku',                type:'text',   req:true,  ph:'e.g. LAP-001'        },
  { label:'Quantity',          key:'quantity',           type:'number', req:true,  ph:'100',  min:0          },
  { label:'Reorder Point',     key:'reorder_point',      type:'number', req:true,  ph:'10',   min:0          },
  { label:'Reorder Qty',       key:'reorder_quantity',   type:'number', req:true,  ph:'50',   min:1          },
  { label:'Unit Cost ($)',     key:'unit_cost',          type:'number', req:true,  ph:'0.00', min:0,step:'0.01' },
  { label:'Holding Cost ($)',  key:'holding_cost',       type:'number', req:false, ph:'1.00', min:0,step:'0.01' },
  { label:'Ordering Cost ($)', key:'ordering_cost',      type:'number', req:false, ph:'50.00',min:0,step:'0.01' },
  { label:'Supplier',          key:'supplier',           type:'text',   req:false, ph:'Supplier Inc'         },
  { label:'Lead Days',         key:'supplier_lead_days', type:'number', req:false, ph:'7',    min:0           },
]
const EMPTY = { name:'',sku:'',quantity:'',reorder_point:'',reorder_quantity:'',
                unit_cost:'',holding_cost:'',ordering_cost:'',supplier:'',supplier_lead_days:'' }
const FILTERS = ['All','Low Stock','In Stock']

function validateForm(f) {
  const e = {}
  if (!f.name?.trim()) e.name='Required'
  if (!f.sku?.trim())  e.sku='Required'
  FORM_FIELDS.filter(x=>x.req&&x.type==='number').forEach(({key})=>{
    if (f[key]===''||f[key]==null) e[key]='Required'
    else if (isNaN(Number(f[key]))) e[key]='Must be a number'
    else if (Number(f[key])<0) e[key]='Must be positive'
  })
  return e
}
function parseForm(f) {
  return {
    name:f.name.trim(), sku:f.sku.trim(),
    quantity:parseInt(f.quantity)||0,
    reorder_point:parseInt(f.reorder_point)||0,
    reorder_quantity:parseInt(f.reorder_quantity)||1,
    unit_cost:parseFloat(f.unit_cost)||0,
    holding_cost:parseFloat(f.holding_cost)||1,
    ordering_cost:parseFloat(f.ordering_cost)||50,
    supplier:f.supplier?.trim()||null,
    supplier_lead_days:parseInt(f.supplier_lead_days)||7,
  }
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

export default function Inventory() {
  const [items,         setItems]         = useState([])
  const [loading,       setLoading]       = useState(true)
  const [showForm,      setShowForm]      = useState(false)
  const [editItem,      setEditItem]      = useState(null)
  const [form,          setForm]          = useState(EMPTY)
  const [fieldErrors,   setFieldErrors]   = useState({})
  const [submitError,   setSubmitError]   = useState('')
  const [submitting,    setSubmitting]    = useState(false)
  const [search,        setSearch]        = useState('')
  const [filter,        setFilter]        = useState('All')
  const [confirmDelete, setConfirmDelete] = useState(null)
  const { user } = useAuth()
  const { addToast } = useToast()
  const canEdit = user?.role==='admin'||user?.role==='manager'

  useEffect(() => {
    fetchItems()
    const t = setInterval(fetchItems, 10000)
    return () => clearInterval(t)
  }, [])

  const fetchItems = async () => {
    try { const r=await API.get('/inventory/'); setItems(r.data||[]) }
    catch(e){ console.error(e) } finally { setLoading(false) }
  }

  const displayItems = useMemo(()=>{
    let list=[...items]
    if (filter==='Low Stock') list=list.filter(i=>i.quantity<=i.reorder_point)
    if (filter==='In Stock')  list=list.filter(i=>i.quantity>i.reorder_point)
    if (search.trim()) {
      const q=search.toLowerCase()
      list=list.filter(i=>i.name?.toLowerCase().includes(q)||i.sku?.toLowerCase().includes(q)||i.supplier?.toLowerCase().includes(q))
    }
    return list
  },[items,search,filter])

  const onChange=(k,v)=>{setForm(p=>({...p,[k]:v}));if(fieldErrors[k])setFieldErrors(p=>({...p,[k]:''}));setSubmitError('')}

  const onSubmit=async()=>{
    const errs=validateForm(form)
    if(Object.keys(errs).length){setFieldErrors(errs);setSubmitError('Please fix the highlighted fields.');return}
    setSubmitting(true);setSubmitError('');setFieldErrors({})
    try {
      if(editItem){
        await API.put(`/inventory/${editItem.id}`,parseForm(form))
        addToast(`"${form.name}" updated successfully.`,'success')
      } else {
        await API.post('/inventory/add',parseForm(form))
        addToast(`"${form.name}" added to inventory.`,'success')
      }
      closeForm();fetchItems()
    } catch(err){
      const d=err.response?.data?.detail
      const msg=Array.isArray(d)?d.map(e=>`${e.loc?.[e.loc.length-1]}: ${e.msg}`).join(', '):typeof d==='string'?d:'An error occurred.'
      setSubmitError(msg);addToast(msg,'error')
    } finally{setSubmitting(false)}
  }

  const onEdit=item=>{
    setEditItem(item)
    setForm({
      name:item.name||'',sku:item.sku||'',
      quantity:String(item.quantity??''),reorder_point:String(item.reorder_point??''),
      reorder_quantity:String(item.reorder_quantity??''),unit_cost:String(item.unit_cost??''),
      holding_cost:String(item.holding_cost??''),ordering_cost:String(item.ordering_cost??''),
      supplier:item.supplier||'',supplier_lead_days:String(item.supplier_lead_days??'')
    })
    setFieldErrors({});setSubmitError('');setShowForm(true)
  }

  const doDelete=async()=>{
    const {id,name}=confirmDelete;setConfirmDelete(null)
    try{await API.delete(`/inventory/${id}`);addToast(`"${name}" removed from inventory.`,'info');fetchItems()}
    catch(e){addToast(e.response?.data?.detail||'Error deleting item.','error')}
  }

  const closeForm=()=>{setShowForm(false);setEditItem(null);setForm(EMPTY);setFieldErrors({});setSubmitError('')}
  const lowCount=items.filter(i=>i.quantity<=i.reorder_point).length

  return (
    <div style={{background:'var(--void)',minHeight:'100vh'}}>
      <div className="grid-bg"/><Navbar/>
      <div style={{padding:'32px 40px',maxWidth:1400,margin:'0 auto',position:'relative',zIndex:1}}>

        <div className="page-header">
          <div>
            <h1 className="page-title">Inventory</h1>
            <p className="page-subtitle">{items.length} products · {lowCount} low stock</p>
          </div>
          {canEdit&&(
            <button className="btn btn-primary" onClick={()=>{setForm(EMPTY);setEditItem(null);setFieldErrors({});setSubmitError('');setShowForm(true)}}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              Add Item
            </button>
          )}
        </div>

        {!canEdit&&<div className="viewer-notice" style={{marginBottom:16}}>View Only</div>}

        <div style={{display:'flex',gap:12,marginBottom:20,alignItems:'center',flexWrap:'wrap'}}>
          <div style={{position:'relative',flex:1,minWidth:200}}>
            <svg style={{position:'absolute',left:12,top:'50%',transform:'translateY(-50%)',color:'var(--text-dim)',pointerEvents:'none'}} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input className="form-input" style={{paddingLeft:36,margin:0}} placeholder="Search by name, SKU, or supplier..." value={search} onChange={e=>setSearch(e.target.value)}/>
            {search&&<button onClick={()=>setSearch('')} style={{position:'absolute',right:10,top:'50%',transform:'translateY(-50%)',background:'none',border:'none',cursor:'pointer',color:'var(--text-dim)',display:'flex',padding:4}}><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>}
          </div>
          <div style={{display:'flex',gap:4,background:'var(--elevated)',border:'1px solid var(--border)',borderRadius:'var(--r-md)',padding:4}}>
            {FILTERS.map(f=>(
              <button key={f} onClick={()=>setFilter(f)}
                style={{padding:'6px 14px',fontSize:12,fontWeight:600,borderRadius:'var(--r-sm)',border:'none',cursor:'pointer',transition:'var(--t)',
                  background:filter===f?(f==='Low Stock'?'var(--red)':f==='In Stock'?'var(--green)':'var(--blue)'):'transparent',
                  color:filter===f?'#fff':'var(--text-muted)'}}>
                {f}{f==='Low Stock'&&lowCount>0&&<span style={{marginLeft:5,background:'rgba(255,255,255,0.25)',borderRadius:100,padding:'1px 6px',fontSize:10}}>{lowCount}</span>}
              </button>
            ))}
          </div>
          <span style={{fontSize:12,color:'var(--text-dim)',whiteSpace:'nowrap'}}>{displayItems.length} of {items.length}</span>
        </div>

        {showForm&&canEdit&&(
          <div className="modal-overlay" onClick={e=>{if(e.target===e.currentTarget)closeForm()}}>
            <div className="modal-box" style={{maxWidth:600}}>
              <div className="modal-header">
                <h3 className="modal-title">{editItem?'Edit Item':'Add New Item'}</h3>
                <button className="modal-close" onClick={closeForm}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
              </div>
              {submitError&&<div className="alert alert-error" style={{marginBottom:16}}>{submitError}</div>}
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16,marginBottom:20}}>
                {FORM_FIELDS.map(({label,key,type,ph,min,step,req})=>(
                  <div className="form-group" key={key} style={{marginBottom:0}}>
                    <label className="form-label">{label}{req?<span style={{color:'var(--red)',marginLeft:3}}>*</span>:<span style={{color:'var(--text-dim)',fontSize:11,marginLeft:4}}>(opt)</span>}</label>
                    <input className={`form-input ${fieldErrors[key]?'error':''}`} type={type} value={form[key]} onChange={e=>onChange(key,e.target.value)} placeholder={ph} min={min} step={step}/>
                    {fieldErrors[key]&&<p className="form-error">{fieldErrors[key]}</p>}
                  </div>
                ))}
              </div>
              <div style={{display:'flex',gap:10,justifyContent:'flex-end'}}>
                <button className="btn btn-ghost" onClick={closeForm}>Cancel</button>
                <button className="btn btn-primary" onClick={onSubmit} disabled={submitting}>
                  {submitting?<><span className="spinner" style={{width:14,height:14,borderWidth:2}}/>Saving...</>:editItem?'Update Item':'Add Item'}
                </button>
              </div>
            </div>
          </div>
        )}

        {confirmDelete&&<ConfirmDialog msg={`Remove "${confirmDelete.name}" from inventory? This cannot be undone.`} onOk={doDelete} onCancel={()=>setConfirmDelete(null)}/>}

        {loading?(
          <div className="loading-screen"><div className="spinner"/><p className="loading-text">Loading inventory...</p></div>
        ):displayItems.length===0?(
          <div className="empty-state">
            <div className="empty-state-icon"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/></svg></div>
            <p className="empty-state-title">{search||filter!=='All'?'No items match your filter':'No inventory items yet'}</p>
            <p className="empty-state-sub">{search||filter!=='All'?'Try a different search or filter':'Click "Add Item" to get started'}</p>
            {(search||filter!=='All')&&<button className="btn btn-ghost" style={{marginTop:12}} onClick={()=>{setSearch('');setFilter('All')}}>Clear Filters</button>}
          </div>
        ):(
          <div className="card" style={{overflow:'hidden'}}>
            <div style={{overflowX:'auto'}}>
              <table className="data-table" style={{minWidth:700}}>
                <thead><tr>{['Name','SKU','Qty','Reorder Pt','Cost','Supplier','Status',...(canEdit?['Actions']:[])].map(h=><th key={h}>{h}</th>)}</tr></thead>
                <tbody>
                  {displayItems.map(item=>(
                    <tr key={item.id}>
                      <td style={{fontWeight:500}}>{item.name}</td>
                      <td><span className="sku-chip">{item.sku}</span></td>
                      <td style={{fontWeight:600}}>{item.quantity}</td>
                      <td style={{color:'var(--text-muted)'}}>{item.reorder_point}</td>
                      <td style={{fontFamily:'var(--font-mono)',fontSize:12}}>${Number(item.unit_cost||0).toFixed(2)}</td>
                      <td style={{color:'var(--text-muted)'}}>{item.supplier||'—'}</td>
                      <td><span className={`badge ${item.quantity<=item.reorder_point?'badge-red':'badge-green'}`}>{item.quantity<=item.reorder_point?'Low Stock':'In Stock'}</span></td>
                      {canEdit&&<td>
                        <div style={{display:'flex',gap:6}}>
                          <button className="btn btn-ghost btn-sm" onClick={()=>onEdit(item)} style={{padding:'6px 8px'}}>
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                          </button>
                          <button className="btn btn-danger btn-sm" onClick={()=>setConfirmDelete({id:item.id,name:item.name})} style={{padding:'6px 8px'}}>
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg>
                          </button>
                        </div>
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