import React, { useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion as Motion, useInView } from 'framer-motion'

const CheckIcon = () => (
  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
)
const ArrowIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
  </svg>
)
const SparkleIcon = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 3l1.88 5.76a2 2 0 0 0 1.26 1.26L21 12l-5.76 1.88a2 2 0 0 0-1.26 1.26L12 21l-1.88-5.76a2 2 0 0 0-1.26-1.26L3 12l5.76-1.88a2 2 0 0 0 1.26-1.26L12 3z"/>
  </svg>
)

const PLANS = [
  {
    tier:'Starter', price:'$49', period:'/month',
    desc:'Perfect for small teams exploring AI-powered automation.',
    features:['1 PostgreSQL database','3 team members','Sales and Inventory AI','Basic dashboard','Email support'],
    cta:'Get started', featured:false, highlight:null,
  },
  {
    tier:'Business', price:'$149', period:'/month',
    desc:'Everything you need to automate operations at scale.',
    features:['5 PostgreSQL databases','Unlimited team members','All AI agents','Advanced analytics','Human-in-the-loop workflows','Priority support'],
    cta:'Get started', featured:true, highlight:'Most popular',
  },
  {
    tier:'Enterprise', price:'Custom', period:'',
    desc:'Tailored deployment for large-scale enterprise operations.',
    features:['Unlimited databases','Unlimited team members','Custom AI models','White label option','Dedicated support engineer','SLA guarantee'],
    cta:'Contact sales', featured:false, highlight:null,
  },
]

/* ─── Shared CTA button style ─────────────────────────────
   All three pricing cards use the same button appearance:
   dark charcoal background, light text — consistent row.
───────────────────────────────────────────────────────────── */
const ctaStyle = {
  width:'100%', padding:'13px 0', borderRadius:10,
  display:'inline-flex', alignItems:'center', justifyContent:'center', gap:7,
  fontFamily:'var(--l-font-body)', fontWeight:600, fontSize:14,
  cursor:'pointer', transition:'var(--l-t)',
  background:'#1c1c1c', color:'#e0e0e0',
  border:'1px solid #333',
}
const ctaHoverIn  = e => { e.currentTarget.style.background='#252525'; e.currentTarget.style.borderColor='#444'; e.currentTarget.style.color='#fff' }
const ctaHoverOut = e => { e.currentTarget.style.background='#1c1c1c'; e.currentTarget.style.borderColor='#333'; e.currentTarget.style.color='#e0e0e0' }

function PricingCard({ plan, index, inView }) {
  const navigate  = useNavigate()
  const cardRef   = useRef(null)

  const handleMouseMove = useCallback(e => {
    if (plan.featured) return
    const card = cardRef.current; if (!card) return
    const r = card.getBoundingClientRect()
    card.style.setProperty('--mx', `${((e.clientX-r.left)/r.width)*100}%`)
    card.style.setProperty('--my', `${((e.clientY-r.top)/r.height)*100}%`)
  }, [plan.featured])

  const delay = plan.featured ? 0.1 : index===0 ? 0 : 0.2

  const handleCta = useCallback(() => {
    if (plan.tier==='Enterprise') {
      const el = document.getElementById('footer')
      if (el) el.scrollIntoView({behavior:'smooth'})
    } else { navigate('/login') }
  }, [plan.tier, navigate])

  return (
    <Motion.div
      initial={{opacity:0,y:36}}
      animate={inView?{opacity:1,y:0}:{}}
      transition={{duration:0.65,ease:[0.16,1,0.3,1],delay}}
      style={{paddingTop: plan.highlight ? 20 : 0}}
    >
      <div
        ref={cardRef}
        className={`lp-pricing-card ${plan.featured?'lp-pricing-card-featured':''}`}
        onMouseMove={handleMouseMove}
        style={{position:'relative', overflow:'visible', height:'100%'}}
      >
        {/* Shine effect on non-featured */}
        {!plan.featured && (
          <div style={{position:'absolute',inset:0,background:'radial-gradient(circle at var(--mx,50%) var(--my,50%), rgba(255,255,255,0.03) 0%, transparent 60%)',pointerEvents:'none',borderRadius:20}}/>
        )}

        {/* Popular badge — above card, never clipped */}
        {plan.highlight && (
          <div style={{
            position:'absolute', top:-16, left:'50%', transform:'translateX(-50%)',
            background:'#0070f3', color:'#fff', fontSize:10, fontWeight:700,
            letterSpacing:'1.2px', textTransform:'uppercase',
            padding:'5px 18px', borderRadius:100, whiteSpace:'nowrap',
            display:'flex', alignItems:'center', gap:5, zIndex:10,
            boxShadow:'0 4px 14px rgba(0,112,243,0.45)',
          }}>
            <SparkleIcon/>{plan.highlight}
          </div>
        )}

        <div className="lp-pricing-tier">{plan.tier}</div>
        <div className="lp-pricing-price">
          <div className="lp-pricing-amount">{plan.price}</div>
          {plan.period && <div className="lp-pricing-period">{plan.period}</div>}
        </div>
        <p style={{fontSize:13,lineHeight:1.65,marginBottom:4,color:plan.featured?undefined:'var(--l-text2)'}}>
          {plan.desc}
        </p>
        <div className="lp-pricing-divider"/>
        <div className="lp-pricing-features">
          {plan.features.map(f=>(
            <div key={f} className="lp-pricing-feature">
              <div className="lp-pricing-check"><CheckIcon/></div>{f}
            </div>
          ))}
        </div>

        {/* CTA — same dark style for ALL three cards */}
        <button style={ctaStyle} onClick={handleCta} onMouseEnter={ctaHoverIn} onMouseLeave={ctaHoverOut}>
          {plan.cta}<ArrowIcon/>
        </button>
      </div>
    </Motion.div>
  )
}

/* ─── CTA / Book a Demo section ──────────────────────────── */
function CtaSection() {
  const navigate = useNavigate()
  const ref    = useRef(null)
  const inView = useInView(ref, {once:true, margin:'-60px'})

  return (
    <section className="lp-cta-section lp-section-alt">
      <div className="lp-cta-glow"/>
      <Motion.div
        ref={ref}
        className="lp-cta-inner"
        initial={{opacity:0,y:32}}
        animate={inView?{opacity:1,y:0}:{}}
        transition={{duration:0.7,ease:[0.16,1,0.3,1]}}
      >
        <div className="lp-eyebrow" style={{justifyContent:'center',marginBottom:20}}>
          <div className="lp-eyebrow-line"/>Get started today<div className="lp-eyebrow-line"/>
        </div>

        <h2 className="lp-cta-heading">
          Ready to automate{' '}
          <span className="lp-heading-grad">your operations?</span>
        </h2>

        <p className="lp-cta-sub">
          Join hundreds of businesses using AI to save time, reduce costs,
          and make smarter decisions every day.
        </p>

        <div className="lp-cta-btns">
          {/* Primary — blue */}
          <button
            className="lp-btn lp-btn-lg"
            onClick={()=>navigate('/login')}
            style={{background:'#0070f3',color:'#fff',border:'none',fontWeight:600,gap:8,display:'inline-flex',alignItems:'center',boxShadow:'0 6px 28px rgba(0,112,243,0.40)'}}
            onMouseEnter={e=>{e.currentTarget.style.background='#005cc5';e.currentTarget.style.transform='translateY(-2px)'}}
            onMouseLeave={e=>{e.currentTarget.style.background='#0070f3';e.currentTarget.style.transform='none'}}
          >
            Start for free <ArrowIcon/>
          </button>

          {/* Book a Demo — dark grey, visible text */}
          <button
            className="lp-btn lp-btn-lg"
            onClick={()=>{ const el=document.getElementById('footer'); if(el)el.scrollIntoView({behavior:'smooth'}) }}
            style={{background:'#1a1a1a',color:'#d4d4d4',border:'1px solid #333',fontWeight:500,gap:8,display:'inline-flex',alignItems:'center'}}
            onMouseEnter={e=>{e.currentTarget.style.background='#252525';e.currentTarget.style.borderColor='#444';e.currentTarget.style.color='#fff'}}
            onMouseLeave={e=>{e.currentTarget.style.background='#1a1a1a';e.currentTarget.style.borderColor='#333';e.currentTarget.style.color='#d4d4d4'}}
          >
            Book a demo
          </button>
        </div>


      </Motion.div>
    </section>
  )
}

export default function Pricing() {
  const headRef    = useRef(null)
  const gridRef    = useRef(null)
  const headInView = useInView(headRef, {once:true,margin:'-60px'})
  const gridInView = useInView(gridRef, {once:true,margin:'-60px'})

  return (
    <>
      <section id="pricing" className="lp-section">
        <div className="lp-container">
          <Motion.div
            ref={headRef}
            className="lp-section-head"
            initial={{opacity:0,y:24}}
            animate={headInView?{opacity:1,y:0}:{}}
            transition={{duration:0.65,ease:[0.16,1,0.3,1]}}
          >
            <div className="lp-eyebrow">
              <div className="lp-eyebrow-line"/>Pricing<div className="lp-eyebrow-line"/>
            </div>
            <h2 className="lp-heading">Transparent, simple pricing</h2>
            <p className="lp-subtext">Start free. Scale as you grow. No hidden fees, no surprise bills.</p>
          </Motion.div>

          {/* Extra paddingTop so badge is never clipped */}
          <div ref={gridRef} className="lp-pricing-grid" style={{paddingTop:24}}>
            {PLANS.map((plan,i)=>(
              <PricingCard key={plan.tier} plan={plan} index={i} inView={gridInView}/>
            ))}
          </div>


        </div>
      </section>
      <CtaSection/>
    </>
  )
}