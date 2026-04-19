import React, { useRef, useCallback } from 'react'
import { motion as Motion, useInView } from 'framer-motion'

const BrainIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96-.46 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 1.44-4.14Z" />
    <path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96-.46 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-1.44-4.14Z" />
  </svg>
)

const ChartIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="20" x2="18" y2="10" />
    <line x1="12" y1="20" x2="12" y2="4" />
    <line x1="6"  y1="20" x2="6"  y2="14" />
    <path d="M2 20h20" />
  </svg>
)

const ZapIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
  </svg>
)

const UsersIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
)

const ShieldIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </svg>
)

const ConnectIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="18" cy="5"  r="3" />
    <circle cx="6"  cy="12" r="3" />
    <circle cx="18" cy="19" r="3" />
    <line x1="8.59"  y1="13.51" x2="15.42" y2="17.49" />
    <line x1="15.41" y1="6.51"  x2="8.59"  y2="10.49" />
  </svg>
)

const FEATURES = [
  {
    Icon:  BrainIcon,
    num:   '01',
    title: 'AI Manager Agent',
    desc:  'Intelligent supervisor routing queries to specialized agents with contextual awareness and multi-step reasoning.',
  },
  {
    Icon:  ChartIcon,
    num:   '02',
    title: 'Sales Intelligence',
    desc:  'Natural language to SQL. Ask questions in plain English and receive instant, accurate revenue breakdowns.',
  },
  {
    Icon:  ZapIcon,
    num:   '03',
    title: 'Inventory Automation',
    desc:  'EOQ calculations, low-stock alerts, and supplier management — fully automated, zero manual intervention.',
  },
  {
    Icon:  UsersIcon,
    num:   '04',
    title: 'Human-in-the-Loop',
    desc:  'Purchase order workflows that keep decision-makers in control of critical, high-value business actions.',
  },
  {
    Icon:  ShieldIcon,
    num:   '05',
    title: 'Enterprise Security',
    desc:  'JWT auth, role-based access, rate limiting, and full audit logging built into every layer of the platform.',
  },
  {
    Icon:  ConnectIcon,
    num:   '06',
    title: 'Seamless Integration',
    desc:  'PostgreSQL-native. Connect your existing database in minutes — no migration, no overhead, no downtime.',
  },
]

function FeatureCard({ feature, index }) {
  const ref      = useRef(null)
  const cardRef  = useRef(null)
  const inView   = useInView(ref, { once: true, margin: '-80px' })

  const handleMouseMove = useCallback((e) => {
    const card = cardRef.current
    if (!card) return
    const rect = card.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width)  * 100
    const y = ((e.clientY - rect.top)  / rect.height) * 100
    card.style.setProperty('--mx', `${x}%`)
    card.style.setProperty('--my', `${y}%`)
  }, [])

  const col   = index % 3
  const delay = col * 0.1

  return (
    <Motion.div
      ref={ref}
      initial={{ opacity: 0, y: 30 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1], delay }}
    >
      <div
        ref={cardRef}
        className="lp-feature-card"
        onMouseMove={handleMouseMove}
      >
        <div className="lp-feature-card-shine" />
        <div className="lp-feature-number">{feature.num}</div>
        <div className="lp-feature-icon">
          <feature.Icon />
        </div>
        <div className="lp-feature-title">{feature.title}</div>
        <div className="lp-feature-desc">{feature.desc}</div>
      </div>
    </Motion.div>
  )
}

export default function Features() {
  const headRef   = useRef(null)
  const headInView = useInView(headRef, { once: true, margin: '-60px' })

  return (
    <section id="features" className="lp-section">
      <div className="lp-container">

        <Motion.div
          ref={headRef}
          className="lp-section-head"
          initial={{ opacity: 0, y: 24 }}
          animate={headInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="lp-eyebrow">
            <div className="lp-eyebrow-line" />
            Platform Capabilities
            <div className="lp-eyebrow-line" />
          </div>
          <h2 className="lp-heading">
            Everything your business needs
          </h2>
          <p className="lp-subtext">
            Three specialized AI agents working in concert to automate
            every corner of your operations — from query to action.
          </p>
        </Motion.div>

        <div className="lp-features-grid">
          {FEATURES.map((feature, i) => (
            <FeatureCard key={feature.title} feature={feature} index={i} />
          ))}
        </div>

      </div>
    </section>
  )
}