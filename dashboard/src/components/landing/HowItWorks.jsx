import React, { useRef } from 'react'
import { motion as Motion, useInView, useScroll, useTransform } from 'framer-motion'

const STEPS = [
  {
    n:     '01',
    title: 'Connect Database',
    desc:  'Point AutoBiz AI at your PostgreSQL instance. One-click connection with automatic schema discovery and zero downtime.',
    detail: 'Supports PostgreSQL 12+. Schema is read automatically on first connection.',
  },
  {
    n:     '02',
    title: 'Configure Agents',
    desc:  'Define which AI agents cover which business domains. The Manager Agent handles all routing automatically.',
    detail: 'No manual routing rules. The Manager Agent classifies intent in real time.',
  },
  {
    n:     '03',
    title: 'Ask and Automate',
    desc:  'Query your business in plain language. Agents analyze, respond, and trigger actions in real time.',
    detail: 'Natural language queries routed to Sales or Inventory agents with full context.',
  },
  {
    n:     '04',
    title: 'Monitor and Scale',
    desc:  'Full audit logs, performance dashboards, and rate-limited APIs ensure reliability at any volume.',
    detail: 'Every agent action is logged. Role-based access controls who sees what.',
  },
]

const TECH = [
  'LangChain', 'LangGraph', 'FastAPI',
  'PostgreSQL', 'React', 'OpenAI',
  'JWT Auth',
]

/* ─── Animated connector line ─────────────────────────────── */
function ConnectorLine() {
  const ref     = useRef(null)
  const inView  = useInView(ref, { once: true, margin: '-60px' })

  return (
    <div className="lp-steps-connector" ref={ref}>
      <Motion.div
        className="lp-steps-connector-line"
        initial={{ scaleX: 0, originX: 0 }}
        animate={inView ? { scaleX: 1 } : {}}
        transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1], delay: 0.3 }}
        style={{ transformOrigin: 'left center' }}
      />
    </div>
  )
}

/* ─── Step card ───────────────────────────────────────────── */
function StepCard({ step, index }) {
  const ref    = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-60px' })

  return (
    <Motion.div
      ref={ref}
      className="lp-step-card"
      initial={{ opacity: 0, y: 32 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{
        duration: 0.6,
        ease: [0.16, 1, 0.3, 1],
        delay: index * 0.12,
      }}
    >
      <div className="lp-step-num-bg">{step.n}</div>
      <div className="lp-step-circle">{index + 1}</div>
      <div className="lp-step-title">{step.title}</div>
      <div className="lp-step-desc">{step.desc}</div>
      <div style={{
        marginTop:    14,
        paddingTop:   14,
        borderTop:    '1px solid var(--l-border)',
        fontSize:     12,
        color:        'var(--l-text3)',
        lineHeight:   1.65,
        fontStyle:    'italic',
      }}>
        {step.detail}
      </div>
    </Motion.div>
  )
}

/* ─── Tech tag ────────────────────────────────────────────── */
function TechTag({ tech, index }) {
  const ref    = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-40px' })

  return (
    <Motion.div
      ref={ref}
      className="lp-tech-tag"
      initial={{ opacity: 0, y: 12, scale: 0.92 }}
      animate={inView ? { opacity: 1, y: 0, scale: 1 } : {}}
      transition={{
        duration: 0.45,
        ease: [0.16, 1, 0.3, 1],
        delay: index * 0.05,
      }}
    >
      {tech}
    </Motion.div>
  )
}

/* ─── Parallax section divider ────────────────────────────── */
function ParallaxDivider() {
  const ref            = useRef(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] })
  const y              = useTransform(scrollYProgress, [0, 1], [-20, 20])

  return (
    <div
      ref={ref}
      style={{
        overflow:   'hidden',
        height:     1,
        background: 'var(--l-border)',
        position:   'relative',
      }}
    >
      <Motion.div
        style={{
          y,
          position:   'absolute',
          inset:      0,
          background: 'linear-gradient(90deg, transparent, var(--l-blue2), var(--l-indigo), transparent)',
          opacity:    0.5,
        }}
      />
    </div>
  )
}

export default function HowItWorks() {
  const headRef    = useRef(null)
  const headInView = useInView(headRef, { once: true, margin: '-60px' })
  const techRef    = useRef(null)
  const techInView = useInView(techRef, { once: true, margin: '-40px' })

  return (
    <>
      <section id="how-it-works" className="lp-section lp-section-alt">
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
              How It Works
              <div className="lp-eyebrow-line" />
            </div>
            <h2 className="lp-heading">Up and running in four steps</h2>
            <p className="lp-subtext">
              Intelligent routing ensures every query reaches the right
              specialist agent — no manual configuration required after setup.
            </p>
          </Motion.div>

          <div className="lp-steps-grid">
            <ConnectorLine />
            {STEPS.map((step, i) => (
              <StepCard key={step.n} step={step} index={i} />
            ))}
          </div>

        </div>
      </section>

      <ParallaxDivider />

      {/* Tech strip */}
      <div className="lp-tech-strip">
        <div className="lp-container">
          <Motion.div
            ref={techRef}
            initial={{ opacity: 0, y: 16 }}
            animate={techInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="lp-tech-label">Built with industry-leading technologies</div>
            <div className="lp-tech-tags">
              {TECH.map((t, i) => (
                <TechTag key={t} tech={t} index={i} />
              ))}
            </div>
          </Motion.div>
        </div>
      </div>
    </>
  )
}