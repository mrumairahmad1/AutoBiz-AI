import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion as Motion } from 'framer-motion'

/* ─────────────────────────────────────────────────────────────
   AutoBizLogo — exported so every page/component can import it
   and show the same live SVG logo consistently.
───────────────────────────────────────────────────────────── */
export const AutoBizLogo = ({ size = 32 }) => (
  <svg width={size} height={size} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Outer hexagon frame */}
    <polygon
      points="20,3 35,11.5 35,28.5 20,37 5,28.5 5,11.5"
      stroke="#0070f3" strokeWidth="1.8"
      fill="rgba(0,112,243,0.10)" strokeLinejoin="round"
    />
    {/* Mid ring */}
    <circle cx="20" cy="20" r="7.5" stroke="#3291ff" strokeWidth="1.2" fill="none" opacity="0.55" />
    {/* Pulse ring — animated via CSS */}
    <circle cx="20" cy="20" r="11" stroke="#0070f3" strokeWidth="0.8" fill="none" opacity="0.2"
      style={{ transformOrigin: '20px 20px', animation: 'lp-logo-pulse 3s ease-in-out infinite' }} />
    {/* Center core */}
    <circle cx="20" cy="20" r="3.2" fill="#0070f3" />
    <circle cx="20" cy="20" r="1.4" fill="#fff" opacity="0.9" />
    {/* Six spokes from center to hex vertices */}
    <line x1="20" y1="16.8" x2="20" y2="3"    stroke="#0070f3" strokeWidth="1" opacity="0.4" />
    <line x1="20" y1="23.2" x2="20" y2="37"   stroke="#0070f3" strokeWidth="1" opacity="0.4" />
    <line x1="23" y1="18.3" x2="35" y2="11.5" stroke="#0070f3" strokeWidth="1" opacity="0.4" />
    <line x1="17" y1="18.3" x2="5"  y2="11.5" stroke="#0070f3" strokeWidth="1" opacity="0.4" />
    <line x1="23" y1="21.7" x2="35" y2="28.5" stroke="#0070f3" strokeWidth="1" opacity="0.4" />
    <line x1="17" y1="21.7" x2="5"  y2="28.5" stroke="#0070f3" strokeWidth="1" opacity="0.4" />
  </svg>
)

const ArrowIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="5" y1="12" x2="19" y2="12" />
    <polyline points="12 5 19 12 12 19" />
  </svg>
)

const NAV_LINKS = [
  { label: 'Features',     href: '#features'    },
  { label: 'How It Works', href: '#how-it-works' },
  { label: 'Agents',       href: '#agents'       },
  { label: 'Pricing',      href: '#pricing'      },
]

export default function LandingNavbar() {
  const navigate = useNavigate()
  const [scrolled,    setScrolled]    = useState(false)
  const [activeLink,  setActiveLink]  = useState('')

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const handleNavClick = (e, href) => {
    e.preventDefault()
    setActiveLink(href)
    const el = document.getElementById(href.replace('#', ''))
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <Motion.nav
      className={`lp-nav ${scrolled ? 'lp-nav-scrolled' : ''}`}
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0,  opacity: 1 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
    >
      {/* ── Logo ── */}
      <a
        href="#"
        className="lp-nav-logo"
        onClick={e => { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
      >
        <AutoBizLogo size={32} />
        <div>
          <div className="lp-nav-logo-name">AutoBiz AI</div>
          <div className="lp-nav-logo-sub">Business Platform</div>
        </div>
      </a>

      {/* ── Nav links ── */}
      <nav className="lp-nav-links">
        {NAV_LINKS.map(link => (
          <a
            key={link.href}
            href={link.href}
            className="lp-nav-link"
            style={{ color: activeLink === link.href ? 'var(--l-text)' : 'var(--l-text2)' }}
            onClick={e => handleNavClick(e, link.href)}
          >
            {link.label}
          </a>
        ))}
      </nav>

      {/* ── Actions ── */}
      <div className="lp-nav-actions">
        <button className="lp-btn lp-btn-ghost lp-btn-sm" onClick={() => navigate('/login')}>
          Sign In
        </button>
        <button
          className="lp-btn lp-btn-sm"
          onClick={() => navigate('/login')}
          style={{
            background: '#0070f3', color: '#fff', border: 'none',
            fontWeight: 600, gap: 7, display: 'inline-flex', alignItems: 'center',
            boxShadow: '0 4px 18px rgba(0,112,243,0.35)',
          }}
          onMouseEnter={e => { e.currentTarget.style.background='#005cc5'; e.currentTarget.style.transform='translateY(-1px)' }}
          onMouseLeave={e => { e.currentTarget.style.background='#0070f3'; e.currentTarget.style.transform='none' }}
        >
          Get Started <ArrowIcon />
        </button>
      </div>
    </Motion.nav>
  )
}