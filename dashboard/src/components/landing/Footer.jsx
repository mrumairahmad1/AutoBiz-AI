import React, { useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion as Motion, useInView } from 'framer-motion'
import { AutoBizLogo } from './LandingNavbar'

/* ─── Icons ──────────────────────────────────────────────── */
const GithubIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"/>
  </svg>
)
const TwitterIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z"/>
  </svg>
)
const LinkedInIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/>
    <rect x="2" y="9" width="4" height="12"/><circle cx="4" cy="4" r="2"/>
  </svg>
)
const MailIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
    <polyline points="22,6 12,13 2,6"/>
  </svg>
)

/* ─── Nav data ───────────────────────────────────────────── */
const PRODUCT_LINKS = [
  { label:'Features',     action:'scroll',   target:'features'     },
  { label:'How It Works', action:'scroll',   target:'how-it-works' },
  { label:'Agents',       action:'scroll',   target:'agents'       },
  { label:'Pricing',      action:'scroll',   target:'pricing'      },
]
const PLATFORM_LINKS = [
  { label:'Dashboard',      action:'navigate', target:'/dashboard' },
  { label:'Manager Agent',  action:'navigate', target:'/chat'      },
  { label:'Inventory',      action:'navigate', target:'/inventory' },
  { label:'Sales',          action:'navigate', target:'/sales'     },
  { label:'Purchase Orders',action:'navigate', target:'/orders'    },
]
const LEGAL_LINKS = [
  { label:'Privacy Policy',  action:'navigate', target:'/login' },
  { label:'Terms of Service',action:'navigate', target:'/login' },
  { label:'Security',        action:'navigate', target:'/login' },
  { label:'GDPR',            action:'navigate', target:'/login' },
]
const SOCIALS = [
  { label:'GitHub',   Icon:GithubIcon,   href:'https://github.com'   },
  { label:'Twitter',  Icon:TwitterIcon,  href:'https://twitter.com'  },
  { label:'LinkedIn', Icon:LinkedInIcon, href:'https://linkedin.com' },
]

const BUILDERS = [
  { name:'Umair Ahmad',    email:'fa22-bscs-198@lgu.edu.pk' },
  { name:'Muhammad Bilal', email:'fa22-bscs-214@lgu.edu.pk' },
]

/* ─── Footer link ────────────────────────────────────────── */
function FooterLink({ link, navigate }) {
  const handleClick = useCallback(() => {
    if (link.action==='scroll') {
      const el = document.getElementById(link.target)
      if (el) el.scrollIntoView({behavior:'smooth',block:'start'})
    } else if (link.action==='navigate') {
      navigate(link.target)
    } else if (link.action==='email') {
      window.open(`mailto:${link.target}`, '_self')
    }
  }, [link, navigate])
  return <button className="lp-footer-link" onClick={handleClick}>{link.label}</button>
}

function FooterCol({ title, links, navigate }) {
  return (
    <div>
      <div className="lp-footer-col-title">{title}</div>
      {links.map(link => <FooterLink key={link.label} link={link} navigate={navigate}/>)}
    </div>
  )
}

/* ─── Main footer ────────────────────────────────────────── */
export default function Footer() {
  const navigate = useNavigate()
  const ref      = useRef(null)
  const inView   = useInView(ref, {once:true, margin:'-40px'})

  return (
    <footer id="footer" className="lp-footer">
      <Motion.div
        ref={ref}
        className="lp-footer-inner"
        initial={{opacity:0,y:24}}
        animate={inView?{opacity:1,y:0}:{}}
        transition={{duration:0.65,ease:[0.16,1,0.3,1]}}
      >
        {/* ── Top grid: Brand | Product | Platform | Legal | Built By ── */}
        <div style={{display:'grid', gridTemplateColumns:'1.6fr 1fr 1fr 1fr 1.4fr', gap:40, marginBottom:48}}>

          {/* Brand column */}
          <div>
            <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:6}}>
              <AutoBizLogo size={28}/>
              <span style={{fontFamily:'var(--l-font-display)',fontSize:16,fontWeight:800,color:'var(--l-text)',letterSpacing:'-0.4px'}}>
                AutoBiz AI
              </span>
            </div>

            <p className="lp-footer-brand-desc">
              AI-powered business automation for modern enterprises. Automate sales,
              inventory, and purchase orders at any scale.
            </p>

            {/* Socials */}
            <div style={{display:'flex',gap:10,marginTop:22}}>
              {SOCIALS.map(s=>(
                <a key={s.label} href={s.href} target="_blank" rel="noopener noreferrer" aria-label={s.label}
                  style={{width:34,height:34,borderRadius:8,border:'1px solid var(--l-border2)',background:'var(--l-surface)',display:'flex',alignItems:'center',justifyContent:'center',color:'var(--l-text3)',transition:'var(--l-t)'}}
                  onMouseEnter={e=>{e.currentTarget.style.color='var(--l-text)';e.currentTarget.style.borderColor='var(--l-border3)';e.currentTarget.style.background='var(--l-surface2)'}}
                  onMouseLeave={e=>{e.currentTarget.style.color='var(--l-text3)';e.currentTarget.style.borderColor='var(--l-border2)';e.currentTarget.style.background='var(--l-surface)'}}
                >
                  <s.Icon/>
                </a>
              ))}
            </div>
          </div>

          <FooterCol title="Product"  links={PRODUCT_LINKS}  navigate={navigate}/>
          <FooterCol title="Handles" links={PLATFORM_LINKS} navigate={navigate}/>
          <FooterCol title="Legal"    links={LEGAL_LINKS}    navigate={navigate}/>

          {/* Built By column */}
          <div>
            <div className="lp-footer-col-title">Built By</div>
            <p style={{fontSize:12,color:'var(--l-text3)',lineHeight:1.7,marginBottom:18}}>
              This platform was designed and developed as a Final Year Project at Lahore Garrison University.
            </p>

            {BUILDERS.map((b,i)=>(
              <div key={b.email} style={{marginBottom: i<BUILDERS.length-1?14:0}}>
                {/* Name row */}
                <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:4}}>
                  <div style={{width:26,height:26,borderRadius:6,background:'var(--l-blue-dim)',border:'1px solid rgba(0,112,243,0.2)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                    <span style={{fontFamily:'var(--l-font-display)',fontSize:10,fontWeight:800,color:'var(--l-blue2)'}}>
                      {b.name.split(' ').map(n=>n[0]).join('')}
                    </span>
                  </div>
                  <span style={{fontSize:13,fontWeight:600,color:'var(--l-text)',letterSpacing:'-0.1px'}}>{b.name}</span>
                </div>
                {/* Email row — single line */}
                <div style={{display:'flex',alignItems:'center',gap:6,paddingLeft:2}}>
                  <div style={{color:'var(--l-text3)',flexShrink:0}}><MailIcon/></div>
                  <a
                    href={`mailto:${b.email}`}
                    style={{fontSize:11,color:'var(--l-blue2)',fontFamily:'var(--l-font-mono)',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis',transition:'color 0.18s ease'}}
                    onMouseEnter={e=>e.currentTarget.style.color='var(--l-text)'}
                    onMouseLeave={e=>e.currentTarget.style.color='var(--l-blue2)'}
                  >
                    {b.email}
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Bottom bar — fully centered ── */}
        <div style={{borderTop:'1px solid var(--l-border)', paddingTop:24, textAlign:'center'}}>
          <span style={{fontSize:12,color:'var(--l-text3)'}}>
            &copy; 2026 AutoBiz AI. All rights reserved. Built with LangChain + LangGraph.
          </span>
        </div>

      </Motion.div>
    </footer>
  )
}