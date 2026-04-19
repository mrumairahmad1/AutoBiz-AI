import React, { useEffect, useState, useMemo } from 'react'
import API from '../api/axios'
import Navbar from '../components/Navbar.jsx'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, Legend
} from 'recharts'

const COLORS = ['#1D6FFF','#00D4FF','#00E096','#FFB547','#9B6DFF','#FF4D6A','#6AABFF','#FF8C42']
const TT = {
  contentStyle:{ background:'var(--card)', border:'1px solid var(--border-md)', borderRadius:10, color:'var(--text)', fontSize:12 },
  labelStyle:  { color:'var(--text)', fontWeight:600 },
  cursor:      { fill:'rgba(29,111,255,0.05)' },
}
const TABS = [{ label:'24h',days:1},{ label:'7d',days:7},{ label:'30d',days:30},{ label:'365d',days:365}]
const ICONS = {
  rev:  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>,
  units:<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/></svg>,
  warn: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
  ord:  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>,
  prod: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="3" width="15" height="13" rx="2"/><path d="M16 8h4l3 5v3h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>,
  txn:  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>,
}

function filterByDays(sales, days) {
  if (!days) return sales
  const cutoff = Date.now() - days * 86400000
  return sales.filter(s => s.sale_date && new Date(s.sale_date).getTime() >= cutoff)
}

function buildTimeline(sales, days) {
  if (!sales.length) return []
  const B = {}  // key -> {sortKey, label, revenue}

  if (days === 1) {
    sales.forEach(s => {
      const d   = new Date(s.sale_date)
      // Sort key: zero-padded hour
      const sk  = String(d.getHours()).padStart(2,'0')
      const lbl = `${sk}:00`
      if (!B[sk]) B[sk] = {sortKey:sk, label:lbl, revenue:0}
      B[sk].revenue += s.amount||0
    })
  } else if (days <= 30) {
    // Each calendar day gets its own bucket — key = full ISO date YYYY-MM-DD
    sales.forEach(s => {
      const d  = new Date(s.sale_date)
      // Use full ISO date string as sort key to avoid collisions between months
      const yr = d.getFullYear()
      const mo = String(d.getMonth()+1).padStart(2,'0')
      const dy = String(d.getDate()).padStart(2,'0')
      const sk = `${yr}-${mo}-${dy}`
      const lbl= d.toLocaleDateString('en-US',{month:'short',day:'numeric'})
      if (!B[sk]) B[sk]={sortKey:sk, label:lbl, revenue:0}
      B[sk].revenue += s.amount||0
    })
  } else {
    // Group by month — key = YYYY-MM
    sales.forEach(s => {
      const d  = new Date(s.sale_date)
      const sk = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`
      const lbl= d.toLocaleDateString('en-US',{month:'short',year:'2-digit'})
      if (!B[sk]) B[sk]={sortKey:sk, label:lbl, revenue:0}
      B[sk].revenue += s.amount||0
    })
  }

  return Object.values(B)
    .sort((a,b) => a.sortKey.localeCompare(b.sortKey))
    .map(b => ({label:b.label, revenue:Math.round(b.revenue*100)/100}))
}

export default function Dashboard() {
  const [inventory, setInventory] = useState([])
  const [sales,     setSales]     = useState([])
  const [orders,    setOrders]    = useState([])
  const [loading,   setLoading]   = useState(true)
  const [days,      setDays]      = useState(30)

  useEffect(()=>{
    Promise.all([API.get('/inventory/'),API.get('/sales/'),API.get('/purchase-orders/')])
      .then(([i,s,o])=>{ setInventory(i.data); setSales(s.data); setOrders(o.data) })
      .catch(console.error).finally(()=>setLoading(false))
  },[])

  const fSales = useMemo(()=>filterByDays(sales,days),[sales,days])
  const totalRev  = useMemo(()=>fSales.reduce((a,s)=>a+(s.amount||0),0),[fSales])
  const totalUnits= useMemo(()=>fSales.reduce((a,s)=>a+(s.quantity||0),0),[fSales])
  const lowStock  = inventory.filter(i=>i.quantity<=i.reorder_point)
  const pending   = orders.filter(o=>o.status==='pending')
  const timeline  = useMemo(()=>buildTimeline(fSales,days),[fSales,days])

  const byProduct  = useMemo(()=>Object.values(fSales.reduce((a,s)=>{
    a[s.product]=a[s.product]||{product:s.product,revenue:0,units:0}
    a[s.product].revenue+=s.amount||0; a[s.product].units+=s.quantity||0; return a
  },{})).sort((a,b)=>b.revenue-a.revenue),[fSales])

  const byCategory = useMemo(()=>Object.values(fSales.reduce((a,s)=>{
    const c=s.category||'Other'; a[c]=a[c]||{name:c,value:0}; a[c].value+=s.amount||0; return a
  },{})),[fSales])

  const stockData = inventory.map(i=>({name:i.name.length>10?i.name.slice(0,10)+'…':i.name,stock:i.quantity,reorder:i.reorder_point}))

  const label = days===1?'Last 24h':days===7?'Last 7 Days':days===30?'Last 30 Days':'Last 365 Days'
  const kpis  = [
    {icon:ICONS.rev,  label:'Revenue',       value:`$${totalRev.toLocaleString(undefined,{maximumFractionDigits:0})}`, color:'var(--green)'},
    {icon:ICONS.units,label:'Units Sold',     value:totalUnits.toLocaleString(),                                        color:'var(--blue-light)'},
    {icon:ICONS.warn, label:'Low Stock',      value:lowStock.length,     color:lowStock.length>0?'var(--red)':'var(--green)'},
    {icon:ICONS.ord,  label:'Pending Orders', value:pending.length,      color:pending.length>0?'var(--amber)':'var(--green)'},
    {icon:ICONS.prod, label:'Products',       value:inventory.length,    color:'var(--blue-light)'},
    {icon:ICONS.txn,  label:'Transactions',   value:fSales.length,       color:'var(--purple)'},
  ]

  if (loading) return <div style={{background:'var(--void)',minHeight:'100vh'}}><Navbar/><div className="loading-screen"><div className="spinner"/><p className="loading-text">Loading dashboard...</p></div></div>

  return (
    <div style={{background:'var(--void)',minHeight:'100vh'}}>
      <div className="grid-bg"/><Navbar/>
      <div style={{padding:'32px 40px',maxWidth:1400,margin:'0 auto',position:'relative',zIndex:1}}>

        <div className="page-header" style={{marginBottom:20}}>
          <div><h1 className="page-title">Business Dashboard</h1><p className="page-subtitle">Real-time overview — {label}</p></div>
          <div style={{display:'flex',gap:4,background:'var(--elevated)',border:'1px solid var(--border)',borderRadius:'var(--r-md)',padding:4}}>
            {TABS.map(t=>(
              <button key={t.days} onClick={()=>setDays(t.days)}
                style={{padding:'7px 16px',fontSize:13,fontWeight:600,borderRadius:'var(--r-sm)',border:'none',cursor:'pointer',transition:'var(--t)',background:days===t.days?'var(--blue)':'transparent',color:days===t.days?'#fff':'var(--text-muted)',boxShadow:days===t.days?'0 2px 8px rgba(29,111,255,0.35)':'none'}}>
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div style={{display:'grid',gridTemplateColumns:'repeat(6,1fr)',gap:16,marginBottom:24}}>
          {kpis.map((k,i)=>(
            <div key={i} className="stat-card" style={{padding:'20px 22px'}}>
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:14}}>
                <div className="stat-icon" style={{margin:0,width:36,height:36}}>{k.icon}</div>
              </div>
              <div className="stat-value" style={{fontSize:24,color:k.color}}>{k.value}</div>
              <div className="stat-label">{k.label}</div>
            </div>
          ))}
        </div>

        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:20,marginBottom:20}}>
          <div className="card" style={{padding:24}}>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:20}}>
              <h3 style={{fontFamily:'var(--font-display)',fontSize:15,fontWeight:700,color:'var(--text)'}}>Revenue — {label}</h3>
              <span style={{fontSize:11,color:'var(--text-dim)',fontWeight:600}}>{timeline.length} data points</span>
            </div>
            {timeline.length===0?(
              <div style={{height:210,display:'flex',alignItems:'center',justifyContent:'center',color:'var(--text-dim)',fontSize:13}}>No sales data for this period</div>
            ):(
              <ResponsiveContainer width="100%" height={210}>
                <LineChart data={timeline}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)"/>
                  <XAxis dataKey="label" stroke="var(--text-dim)" fontSize={10} tickLine={false} interval="preserveStartEnd"/>
                  <YAxis stroke="var(--text-dim)" fontSize={10} tickLine={false} axisLine={false} tickFormatter={v=>`$${v>=1000?(v/1000).toFixed(1)+'k':v}`}/>
                  <Tooltip {...TT} formatter={v=>[`$${Number(v).toLocaleString()}`,'Revenue']}/>
                  <Line type="monotone" dataKey="revenue" stroke="var(--blue)" strokeWidth={2.5} dot={{fill:'var(--blue)',r:3,strokeWidth:0}} activeDot={{r:5,fill:'var(--blue-light)'}}/>
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="card" style={{padding:24}}>
            <h3 style={{fontFamily:'var(--font-display)',fontSize:15,fontWeight:700,color:'var(--text)',marginBottom:20}}>Revenue by Category</h3>
            {byCategory.length===0?(
              <div style={{height:210,display:'flex',alignItems:'center',justifyContent:'center',color:'var(--text-dim)',fontSize:13}}>No data for this period</div>
            ):(
              <ResponsiveContainer width="100%" height={210}>
                <PieChart>
                  <Pie data={byCategory} cx="50%" cy="50%" outerRadius={75} innerRadius={35} dataKey="value"
                    label={({name,percent})=>`${name} ${(percent*100).toFixed(0)}%`} labelLine={false} fontSize={10}>
                    {byCategory.map((_,i)=><Cell key={i} fill={COLORS[i%COLORS.length]}/>)}
                  </Pie>
                  <Tooltip {...TT} formatter={v=>[`$${Number(v).toLocaleString()}`,'Revenue']}/>
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:20,marginBottom:20}}>
          <div className="card" style={{padding:24}}>
            <h3 style={{fontFamily:'var(--font-display)',fontSize:15,fontWeight:700,color:'var(--text)',marginBottom:20}}>Revenue by Product</h3>
            {byProduct.length===0?(
              <div style={{height:210,display:'flex',alignItems:'center',justifyContent:'center',color:'var(--text-dim)',fontSize:13}}>No data for this period</div>
            ):(
              <ResponsiveContainer width="100%" height={210}>
                <BarChart data={byProduct}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)"/>
                  <XAxis dataKey="product" stroke="var(--text-dim)" fontSize={9} tickLine={false}/>
                  <YAxis stroke="var(--text-dim)" fontSize={10} tickLine={false} axisLine={false}/>
                  <Tooltip {...TT} formatter={v=>[`$${Number(v).toLocaleString()}`,'Revenue']}/>
                  <Bar dataKey="revenue" radius={[4,4,0,0]}>
                    {byProduct.map((_,i)=><Cell key={i} fill={COLORS[i%COLORS.length]}/>)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="card" style={{padding:24}}>
            <h3 style={{fontFamily:'var(--font-display)',fontSize:15,fontWeight:700,color:'var(--text)',marginBottom:20}}>Stock vs Reorder Point</h3>
            <ResponsiveContainer width="100%" height={210}>
              <BarChart data={stockData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)"/>
                <XAxis dataKey="name" stroke="var(--text-dim)" fontSize={9} tickLine={false}/>
                <YAxis stroke="var(--text-dim)" fontSize={10} tickLine={false} axisLine={false}/>
                <Tooltip {...TT}/>
                <Legend wrapperStyle={{color:'var(--text-muted)',fontSize:11}}/>
                <Bar dataKey="stock"   fill="var(--blue)" name="Stock"   radius={[4,4,0,0]}/>
                <Bar dataKey="reorder" fill="var(--red)"  name="Reorder" radius={[4,4,0,0]}/>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {lowStock.length>0&&(
          <div className="card" style={{padding:24,border:'1px solid rgba(255,77,106,0.3)',marginBottom:20}}>
            <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:18}}>
              <div style={{width:8,height:8,borderRadius:'50%',background:'var(--red)',animation:'pulse-dot 2s ease-in-out infinite'}}/>
              <h3 style={{fontFamily:'var(--font-display)',fontSize:15,fontWeight:700,color:'var(--red)'}}>Low Stock Alerts</h3>
              <span className="badge badge-red">{lowStock.length} items</span>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(160px,1fr))',gap:10}}>
              {lowStock.map(item=>(
                <div key={item.id} style={{background:'var(--surface)',border:'1px solid rgba(255,77,106,0.2)',borderRadius:'var(--r-md)',padding:14}}>
                  <div style={{fontSize:13,fontWeight:600,color:'var(--text)',marginBottom:6}}>{item.name}</div>
                  <div style={{fontSize:11,color:'var(--text-muted)',marginBottom:3}}>
                    Stock: <span style={{color:'var(--red)',fontWeight:600}}>{item.quantity}</span>
                    {' / Min: '}<span style={{color:'var(--amber)',fontWeight:600}}>{item.reorder_point}</span>
                  </div>
                  <div style={{fontSize:11,color:'var(--text-dim)'}}>{item.supplier||'No supplier'}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="card" style={{padding:24,overflow:'hidden'}}>
          <h3 style={{fontFamily:'var(--font-display)',fontSize:15,fontWeight:700,color:'var(--text)',marginBottom:20}}>Top Products — {label}</h3>
          {byProduct.length===0?(
            <div style={{textAlign:'center',padding:'32px 0',color:'var(--text-dim)',fontSize:13}}>No sales data for this period</div>
          ):(
            <div style={{overflowX:'auto'}}>
              <table className="data-table" style={{minWidth:480}}>
                <thead><tr>{['Rank','Product','Revenue','Units','Avg Price'].map(h=><th key={h}>{h}</th>)}</tr></thead>
                <tbody>
                  {byProduct.slice(0,5).map((p,i)=>(
                    <tr key={p.product}>
                      <td>{i<3?<span style={{fontFamily:'var(--font-display)',fontSize:16,fontWeight:800,color:['var(--amber)','var(--text-muted)','#CD7F32'][i]}}>#{i+1}</span>:<span style={{fontSize:13,color:'var(--text-dim)'}}>#{i+1}</span>}</td>
                      <td style={{fontWeight:500}}>{p.product}</td>
                      <td style={{color:'var(--green)',fontWeight:600}}>${p.revenue.toLocaleString()}</td>
                      <td>{p.units}</td>
                      <td style={{fontFamily:'var(--font-mono)',fontSize:12}}>${p.units>0?(p.revenue/p.units).toFixed(2):'0.00'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}