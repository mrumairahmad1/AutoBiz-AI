import React, { useRef, useCallback } from 'react'
import { motion as Motion, useInView } from 'framer-motion'

/* ─── Icons ──────────────────────────────────────────────── */
const ManagerIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96-.46 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 1.44-4.14Z" />
    <path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96-.46 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-1.44-4.14Z" />
  </svg>
)

const SalesIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="20" x2="18" y2="10" />
    <line x1="12" y1="20" x2="12" y2="4" />
    <line x1="6"  y1="20" x2="6"  y2="14" />
    <path d="M2 20h20" />
  </svg>
)

const InventoryIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
    <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
    <line x1="12" y1="22.08" x2="12" y2="12" />
  </svg>
)

const CheckIcon = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
)

const ArrowIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="5" y1="12" x2="19" y2="12" />
    <polyline points="12 5 19 12 12 19" />
  </svg>
)

/* ─── Agent data ─────────────────────────────────────────── */
const AGENTS = [
  {
    Icon:       ManagerIcon,
    tag:        'Orchestrator',
    tagColor:   'rgba(121,40,202,0.15)',
    tagText:    '#a855f7',
    iconBg:     'rgba(121,40,202,0.10)',
    iconBorder: 'rgba(121,40,202,0.25)',
    iconColor:  '#a855f7',
    capColor:   '#a855f7',
    accentTop:  'linear-gradient(90deg, transparent, #7928ca, transparent)',
    title:      'Manager Agent',
    desc:       'The central intelligence layer. Receives every user query, determines intent, and routes it to the correct specialist agent with full context preservation across multi-turn conversations.',
    caps: [
      'Intent classification and query routing',
      'Multi-turn conversation context',
      'Guardrails for non-business queries',
      'Fallback handling and error recovery',
      'Real-time LLM routing via OpenRouter',
    ],
    featured: true,
    stat:     { val: '< 200ms', label: 'Avg routing time' },
  },
  {
    Icon:       SalesIcon,
    tag:        'Sales',
    tagColor:   'rgba(0,112,243,0.12)',
    tagText:    '#3291ff',
    iconBg:     'rgba(0,112,243,0.10)',
    iconBorder: 'rgba(0,112,243,0.25)',
    iconColor:  '#3291ff',
    capColor:   '#3291ff',
    accentTop:  'linear-gradient(90deg, transparent, #0070f3, transparent)',
    title:      'Sales Agent',
    desc:       'Transforms natural language into precise SQL. Delivers revenue breakdowns, trend analysis, and product performance in seconds.',
    caps: [
      'Natural language to SQL translation',
      'Revenue and category analysis',
      'Product performance reporting',
    ],
    featured: false,
    stat:     { val: '99%', label: 'Query accuracy' },
  },
  {
    Icon:       InventoryIcon,
    tag:        'Inventory',
    tagColor:   'rgba(23,201,100,0.12)',
    tagText:    '#17c964',
    iconBg:     'rgba(23,201,100,0.10)',
    iconBorder: 'rgba(23,201,100,0.25)',
    iconColor:  '#17c964',
    capColor:   '#17c964',
    accentTop:  'linear-gradient(90deg, transparent, #17c964, transparent)',
    title:      'Inventory Agent',
    desc:       'Monitors stock levels, calculates EOQ, triggers reorder alerts, and manages supplier lead times — fully automated.',
    caps: [
      'EOQ calculation and reorder alerts',
      'Supplier and lead time management',
      'Low-stock threshold monitoring',
    ],
    featured: false,
    stat:     { val: '0', label: 'Unplanned stockouts' },
  },
]

/* ─── Featured agent card ─────────────────────────────────── */
function FeaturedCard({ agent, inView }) {
  const cardRef = useRef(null)

  const handleMouseMove = useCallback((e) => {
    const card = cardRef.current
    if (!card) return
    const rect = card.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width)  * 100
    const y = ((e.clientY - rect.top)  / rect.height) * 100
    card.style.setProperty('--mx', `${x}%`)
    card.style.setProperty('--my', `${y}%`)
  }, [])

  return (
    <Motion.div
      initial={{ opacity: 0, x: -32 }}
      animate={inView ? { opacity: 1, x: 0 } : {}}
      transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1], delay: 0 }}
      style={{ gridRow: 'span 2' }}
    >
      <div
        ref={cardRef}
        className="lp-agent-card lp-agent-card-featured"
        onMouseMove={handleMouseMove}
        style={{ height: '100%' }}
      >
        {/* Top accent line */}
        <div style={{
          position:   'absolute',
          top: 0, left: 0, right: 0,
          height:     1,
          background: agent.accentTop,
          opacity:    0.7,
        }} />

        {/* Radial shine on hover */}
        <div style={{
          position:   'absolute',
          inset:      0,
          background: 'radial-gradient(circle at var(--mx,50%) var(--my,50%), rgba(121,40,202,0.06) 0%, transparent 60%)',
          pointerEvents: 'none',
          borderRadius: 20,
        }} />

        {/* Icon */}
        <div
          className="lp-agent-icon-wrap"
          style={{
            background:  agent.iconBg,
            borderColor: agent.iconBorder,
            color:       agent.iconColor,
          }}
        >
          <agent.Icon />
        </div>

        {/* Tag */}
        <div
          className="lp-agent-tag"
          style={{ background: agent.tagColor, color: agent.tagText, borderColor: agent.tagText }}
        >
          {agent.tag}
        </div>

        {/* Title */}
        <div className="lp-agent-title">{agent.title}</div>

        {/* Desc */}
        <div className="lp-agent-desc">{agent.desc}</div>

        {/* Capabilities */}
        <div className="lp-agent-capabilities">
          {agent.caps.map(cap => (
            <div key={cap} className="lp-agent-cap">
              <div style={{
                width:          18,
                height:         18,
                borderRadius:   '50%',
                background:     agent.iconBg,
                border:         `1px solid ${agent.iconBorder}`,
                display:        'flex',
                alignItems:     'center',
                justifyContent: 'center',
                flexShrink:     0,
                color:          agent.iconColor,
              }}>
                <CheckIcon />
              </div>
              {cap}
            </div>
          ))}
        </div>

        {/* Stat badge */}
        <div style={{
          marginTop:    28,
          padding:      '14px 18px',
          background:   agent.tagColor,
          border:       `1px solid ${agent.iconBorder}`,
          borderRadius: 12,
          display:      'flex',
          alignItems:   'center',
          justifyContent: 'space-between',
        }}>
          <div>
            <div style={{
              fontFamily:    'var(--l-font-display)',
              fontSize:      22,
              fontWeight:    800,
              color:         agent.tagText,
              letterSpacing: '-0.5px',
            }}>
              {agent.stat.val}
            </div>
            <div style={{ fontSize: 12, color: 'var(--l-text3)', marginTop: 2 }}>
              {agent.stat.label}
            </div>
          </div>
          <div style={{ color: agent.tagText, opacity: 0.6 }}>
            <ArrowIcon />
          </div>
        </div>

      </div>
    </Motion.div>
  )
}

/* ─── Side agent card ─────────────────────────────────────── */
function SideCard({ agent, index, inView }) {
  const cardRef = useRef(null)

  const handleMouseMove = useCallback((e) => {
    const card = cardRef.current
    if (!card) return
    const rect = card.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width)  * 100
    const y = ((e.clientY - rect.top)  / rect.height) * 100
    card.style.setProperty('--mx', `${x}%`)
    card.style.setProperty('--my', `${y}%`)
  }, [])

  return (
    <Motion.div
      initial={{ opacity: 0, x: 32 }}
      animate={inView ? { opacity: 1, x: 0 } : {}}
      transition={{
        duration: 0.7,
        ease: [0.16, 1, 0.3, 1],
        delay: index * 0.15,
      }}
    >
      <div
        ref={cardRef}
        className="lp-agent-card"
        onMouseMove={handleMouseMove}
        style={{ position: 'relative', overflow: 'hidden' }}
      >
        {/* Top accent */}
        <div style={{
          position:   'absolute',
          top: 0, left: 0, right: 0,
          height:     1,
          background: agent.accentTop,
          opacity:    0.5,
        }} />

        {/* Shine */}
        <div style={{
          position:      'absolute',
          inset:         0,
          background:    `radial-gradient(circle at var(--mx,50%) var(--my,50%), ${agent.tagColor} 0%, transparent 55%)`,
          pointerEvents: 'none',
          opacity:       0,
          transition:    'opacity 0.3s ease',
          borderRadius:  20,
        }}
          className="lp-feature-card-shine"
        />

        {/* Header row */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
          <div
            className="lp-agent-icon-wrap"
            style={{
              background:   agent.iconBg,
              borderColor:  agent.iconBorder,
              color:        agent.iconColor,
              marginBottom: 0,
            }}
          >
            <agent.Icon />
          </div>
          <div
            className="lp-agent-tag"
            style={{
              background:   agent.tagColor,
              color:        agent.tagText,
              borderColor:  agent.tagText,
              marginBottom: 0,
            }}
          >
            {agent.tag}
          </div>
        </div>

        <div className="lp-agent-title" style={{ fontSize: 18 }}>{agent.title}</div>
        <div className="lp-agent-desc" style={{ fontSize: 13 }}>{agent.desc}</div>

        <div className="lp-agent-capabilities">
          {agent.caps.map(cap => (
            <div key={cap} className="lp-agent-cap">
              <div
                className="lp-agent-cap-dot"
                style={{ background: agent.capColor }}
              />
              {cap}
            </div>
          ))}
        </div>

        {/* Stat */}
        <div style={{
          marginTop:    20,
          paddingTop:   16,
          borderTop:    '1px solid var(--l-border)',
          display:      'flex',
          alignItems:   'center',
          gap:          10,
        }}>
          <div style={{
            fontFamily:    'var(--l-font-display)',
            fontSize:      20,
            fontWeight:    800,
            color:         agent.tagText,
            letterSpacing: '-0.5px',
          }}>
            {agent.stat.val}
          </div>
          <div style={{ fontSize: 12, color: 'var(--l-text3)' }}>
            {agent.stat.label}
          </div>
        </div>

      </div>
    </Motion.div>
  )
}

/* ─── Main section ───────────────────────────────────────── */
export default function Agents() {
  const headRef    = useRef(null)
  const gridRef    = useRef(null)
  const headInView = useInView(headRef, { once: true, margin: '-60px' })
  const gridInView = useInView(gridRef, { once: true, margin: '-80px' })

  const [featured, ...sides] = AGENTS

  return (
    <section id="agents" className="lp-section">
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
            Agent Architecture
            <div className="lp-eyebrow-line" />
          </div>
          <h2 className="lp-heading">
            Three agents.{' '}
            <span className="lp-heading-grad">One platform.</span>
          </h2>
          <p className="lp-subtext">
            Each agent is a specialist. The Manager Agent coordinates them
            so every query gets the most accurate, context-aware response.
          </p>
        </Motion.div>

        <div ref={gridRef} className="lp-agents-grid">
          <FeaturedCard agent={featured} inView={gridInView} />
          {sides.map((agent, i) => (
            <SideCard key={agent.title} agent={agent} index={i + 1} inView={gridInView} />
          ))}
        </div>

      </div>
    </section>
  )
}