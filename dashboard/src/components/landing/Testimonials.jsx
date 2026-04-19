import React, { useRef, useState, useEffect, useCallback } from 'react'
import { motion as Motion, useInView, AnimatePresence } from 'framer-motion'

/* ─── Icons ──────────────────────────────────────────────── */
const StarIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="var(--l-amber)" stroke="none">
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
  </svg>
)

const QuoteIcon = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor" style={{ opacity: 0.08 }}>
    <path d="M11.192 15.757c0-.88-.23-1.618-.69-2.217-.326-.412-.768-.683-1.327-.812-.55-.128-1.07-.137-1.54-.028-.16-.95.1-1.95.78-3 .53-.81 1.24-1.48 2.13-2.01L9.24 6c-1.39.75-2.56 1.76-3.51 3.03-.96 1.27-1.44 2.58-1.44 3.93 0 1.45.47 2.6 1.42 3.44.95.84 2.1 1.26 3.44 1.26.98 0 1.81-.33 2.5-1 .68-.67 1.02-1.52 1.02-2.56l-.01-.33zm9.908 0c0-.88-.23-1.618-.69-2.217-.326-.42-.77-.695-1.327-.825-.56-.128-1.07-.138-1.54-.028-.16-.95.1-1.95.78-3 .53-.81 1.24-1.48 2.13-2.01L19.148 6c-1.39.75-2.56 1.76-3.51 3.03-.96 1.27-1.44 2.58-1.44 3.93 0 1.45.47 2.6 1.42 3.44.95.84 2.1 1.26 3.44 1.26.98 0 1.81-.33 2.5-1 .68-.67 1.02-1.52 1.02-2.56l-.01-.33z" />
  </svg>
)

const ChevronLeft = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="15 18 9 12 15 6" />
  </svg>
)

const ChevronRight = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="9 18 15 12 9 6" />
  </svg>
)

/* ─── Data ───────────────────────────────────────────────── */
const TESTIMONIALS = [
  {
    init:   'SM',
    name:   'Sarah Mitchell',
    role:   'COO, Vertex Commerce',
    text:   'AutoBiz AI reduced our order processing time from 3 days to under 4 hours. The AI handles verification, approval routing, and notifications autonomously. It has fundamentally changed how our operations team works.',
    metric: { val: '18x', label: 'Faster processing' },
    color:  '#3291ff',
  },
  {
    init:   'AH',
    name:   'Ahmed Hassan',
    role:   'Operations Manager, NovaTech',
    text:   'The inventory agent caught critical stock issues before they impacted production. We have not had an unplanned stockout since deploying this platform. The EOQ recommendations alone saved us thousands in carrying costs.',
    metric: { val: '0',   label: 'Stockouts since launch' },
    color:  '#17c964',
  },
  {
    init:   'EC',
    name:   'Emily Chen',
    role:   'CFO, RetailPlus',
    text:   'Revenue analysis that previously required a full BI team now takes seconds. The natural language interface means every stakeholder gets instant answers without waiting on reports.',
    metric: { val: '80%', label: 'Reporting time saved' },
    color:  '#a855f7',
  },
  {
    init:   'MR',
    name:   'Marcus Rivera',
    role:   'VP Operations, ScaleForge',
    text:   'We integrated AutoBiz AI in under a day. The PostgreSQL connection was seamless and the agents were accurate from day one. Our managers now make purchase decisions with full AI-backed context in real time.',
    metric: { val: '1 day', label: 'Time to production' },
    color:  '#f59e0b',
  },
  {
    init:   'PK',
    name:   'Priya Kapoor',
    role:   'Director of Supply Chain, Lumio',
    text:   'The human-in-the-loop purchase order workflow is exactly what enterprise operations need. Full AI speed with human oversight at the approval step. Compliance and efficiency in the same product.',
    metric: { val: '100%', label: 'Compliance maintained' },
    color:  '#50e3c2',
  },
  {
    init:   'JL',
    name:   'James Liu',
    role:   'CTO, Meridian Retail',
    text:   'As a technical leader I was impressed by the architecture. LangGraph multi-agent orchestration with FastAPI, JWT auth, and role-based access — production-grade from day one.',
    metric: { val: '99.9%', label: 'Platform uptime' },
    color:  '#3291ff',
  },
]

/* ─── Single card ────────────────────────────────────────── */
function TestimonialCard({ t, index, inView }) {
  return (
    <Motion.div
      className="lp-testimonial-card"
      initial={{ opacity: 0, y: 24 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{
        duration: 0.55,
        ease: [0.16, 1, 0.3, 1],
        delay: index * 0.1,
      }}
      style={{ position: 'relative', overflow: 'hidden' }}
    >
      {/* Top accent */}
      <div style={{
        position:   'absolute',
        top: 0, left: 0, right: 0,
        height:     1,
        background: `linear-gradient(90deg, transparent, ${t.color}, transparent)`,
        opacity:    0.5,
      }} />

      {/* Quote icon */}
      <div style={{ color: t.color, marginBottom: 14 }}>
        <QuoteIcon />
      </div>

      {/* Stars */}
      <div className="lp-testimonial-stars">
        {Array.from({ length: 5 }).map((_, i) => <StarIcon key={i} />)}
      </div>

      {/* Text */}
      <p className="lp-testimonial-text">{t.text}</p>

      {/* Metric */}
      <div style={{
        display:      'flex',
        alignItems:   'center',
        gap:          10,
        marginBottom: 20,
        padding:      '10px 14px',
        background:   `${t.color}10`,
        border:       `1px solid ${t.color}22`,
        borderRadius: 10,
      }}>
        <div style={{
          fontFamily:    'var(--l-font-display)',
          fontSize:      20,
          fontWeight:    800,
          color:         t.color,
          letterSpacing: '-0.5px',
          lineHeight:    1,
        }}>
          {t.metric.val}
        </div>
        <div style={{ fontSize: 12, color: 'var(--l-text3)', lineHeight: 1.4 }}>
          {t.metric.label}
        </div>
      </div>

      {/* Author */}
      <div className="lp-testimonial-author">
        <div
          className="lp-testimonial-avatar"
          style={{
            background:  `${t.color}18`,
            border:      `1px solid ${t.color}30`,
            color:       t.color,
          }}
        >
          {t.init}
        </div>
        <div>
          <div className="lp-testimonial-name">{t.name}</div>
          <div className="lp-testimonial-role">{t.role}</div>
        </div>
      </div>
    </Motion.div>
  )
}

/* ─── Main section ───────────────────────────────────────── */
export default function Testimonials() {
  const headRef    = useRef(null)
  const gridRef    = useRef(null)
  const headInView = useInView(headRef, { once: true, margin: '-60px' })
  const gridInView = useInView(gridRef, { once: true, margin: '-60px' })

  const [page, setPage]       = useState(0)
  const [dir,  setDir]        = useState(1)
  const [auto, setAuto]       = useState(true)
  const cardsPerPage          = 3
  const totalPages            = Math.ceil(TESTIMONIALS.length / cardsPerPage)

  useEffect(() => {
    if (!auto) return
    const t = setInterval(() => {
      setDir(1)
      setPage(p => (p + 1) % totalPages)
    }, 5500)
    return () => clearInterval(t)
  }, [auto, totalPages])

  const paginate = useCallback((d) => {
    setAuto(false)
    setDir(d)
    setPage(p => (p + d + totalPages) % totalPages)
  }, [totalPages])

  const goTo = useCallback((i) => {
    setAuto(false)
    setDir(i > page ? 1 : -1)
    setPage(i)
  }, [page])

  const visible = TESTIMONIALS.slice(
    page * cardsPerPage,
    page * cardsPerPage + cardsPerPage,
  )

  const variants = {
    enter:  (d) => ({ x: d > 0 ?  48 : -48, opacity: 0 }),
    center: {       x: 0,                    opacity: 1  },
    exit:   (d) => ({ x: d > 0 ? -48 :  48, opacity: 0 }),
  }

  return (
    <section className="lp-section lp-section-alt">
      <div className="lp-container">

        {/* Heading */}
        <Motion.div
          ref={headRef}
          className="lp-section-head"
          initial={{ opacity: 0, y: 24 }}
          animate={headInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="lp-eyebrow">
            <div className="lp-eyebrow-line" />
            Client Results
            <div className="lp-eyebrow-line" />
          </div>
          <h2 className="lp-heading">Trusted by operations leaders</h2>
          <p className="lp-subtext">
            Businesses across industries use AutoBiz AI to automate
            operations, cut costs, and make faster decisions every day.
          </p>
        </Motion.div>

        {/* Slider */}
        <div ref={gridRef} style={{ position: 'relative', overflow: 'hidden' }}>
          <AnimatePresence mode="wait" custom={dir}>
            <Motion.div
              key={page}
              className="lp-testimonials-grid"
              custom={dir}
              variants={variants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.42, ease: [0.16, 1, 0.3, 1] }}
            >
              {visible.map((t, i) => (
                <TestimonialCard
                  key={t.name}
                  t={t}
                  index={i}
                  inView={gridInView}
                />
              ))}
            </Motion.div>
          </AnimatePresence>
        </div>

        {/* Controls */}
        <div style={{
          display:        'flex',
          alignItems:     'center',
          justifyContent: 'center',
          gap:            16,
          marginTop:      40,
        }}>
          <button
            className="lp-btn lp-btn-ghost"
            onClick={() => paginate(-1)}
            style={{ width: 38, height: 38, padding: 0, borderRadius: '50%' }}
            aria-label="Previous"
          >
            <ChevronLeft />
          </button>

          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            {Array.from({ length: totalPages }).map((_, i) => (
              <button
                key={i}
                onClick={() => goTo(i)}
                aria-label={`Page ${i + 1}`}
                style={{
                  width:        i === page ? 22 : 7,
                  height:       7,
                  borderRadius: 4,
                  border:       'none',
                  cursor:       'pointer',
                  background:   i === page ? 'var(--l-text)' : 'var(--l-border3)',
                  transition:   'all 0.3s var(--l-ease)',
                  padding:      0,
                }}
              />
            ))}
          </div>

          <button
            className="lp-btn lp-btn-ghost"
            onClick={() => paginate(1)}
            style={{ width: 38, height: 38, padding: 0, borderRadius: '50%' }}
            aria-label="Next"
          >
            <ChevronRight />
          </button>
        </div>

        {/* Auto-play progress bar */}
        {auto && (
          <div style={{
            maxWidth:     160,
            margin:       '16px auto 0',
            height:       1,
            background:   'var(--l-border)',
            borderRadius: 1,
            overflow:     'hidden',
          }}>
            <Motion.div
              key={`bar-${page}`}
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ duration: 5.5, ease: 'linear' }}
              style={{
                height:          '100%',
                background:      'var(--l-text2)',
                transformOrigin: 'left center',
              }}
            />
          </div>
        )}

      </div>
    </section>
  )
}