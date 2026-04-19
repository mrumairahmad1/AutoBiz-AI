import React, { useRef, useState, useEffect, Suspense, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion as Motion } from 'framer-motion'
import { Canvas, useFrame } from '@react-three/fiber'
import { Float, MeshDistortMaterial, Sphere, Stars } from '@react-three/drei'
import { AutoBizLogo } from './LandingNavbar'

/* ─── Icons ─────────────────────────────────────────────── */
const ArrowIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
  </svg>
)
const PlayIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="5 3 19 12 5 21 5 3" />
  </svg>
)

/* ─── Constants ─────────────────────────────────────────── */
const STATS = [
  { target: 98,  suffix: '%', label: 'Query Accuracy'   },
  { target: 80,  suffix: '%', label: 'Time Saved'       },
  { target: 500, suffix: '+', label: 'Businesses Ready' },
  { target: 99,  suffix: '%', label: 'Uptime SLA'       },
]
const MOCKUP_NAV  = [
  { label: 'Manager',   active: false },
  { label: 'Dashboard', active: true  },
  { label: 'Inventory', active: false },
  { label: 'Sales',     active: false },
  { label: 'Orders',    active: false },
]
const MOCKUP_CARDS = [
  { label: 'Total Revenue', value: '$142,580', delta: '+18%' },
  { label: 'Units Sold',    value: '4,820',    delta: '+12%' },
  { label: 'Active Orders', value: '34',       delta: '+3'   },
]
const BAR_HEIGHTS  = [35,52,44,68,58,74,62,80,70,85,78,92]
const OCTA_OFFSETS = [0.42,1.87,3.14,4.71,2.28,5.55]
const OCTA_CONFIGS = [
  { pos:[-4.2, 1.8,-2], scale:0.22, speed:0.9,  color:'#3291ff', offset:OCTA_OFFSETS[0] },
  { pos:[ 4.0, 2.2,-1], scale:0.18, speed:1.1,  color:'#7928ca', offset:OCTA_OFFSETS[1] },
  { pos:[-3.6,-2.0,-1], scale:0.14, speed:0.75, color:'#50e3c2', offset:OCTA_OFFSETS[2] },
  { pos:[ 3.8,-1.8,-2], scale:0.20, speed:1.3,  color:'#0070f3', offset:OCTA_OFFSETS[3] },
  { pos:[ 0.8, 3.0,-3], scale:0.12, speed:0.85, color:'#7928ca', offset:OCTA_OFFSETS[4] },
  { pos:[-1.2,-3.2,-2], scale:0.16, speed:1.0,  color:'#3291ff', offset:OCTA_OFFSETS[5] },
]
const PARTICLE_COUNT = 120
const PARTICLE_POSITIONS = (() => {
  const arr  = new Float32Array(PARTICLE_COUNT * 3)
  const seed = [0.12,0.37,0.61,0.84,0.23,0.55,0.78,0.09,0.46,0.93]
  for (let i = 0; i < PARTICLE_COUNT; i++) {
    arr[i*3]   = (((seed[i%seed.length]*(i+1)*7.3)%1)-0.5)*28
    arr[i*3+1] = (((seed[(i+3)%seed.length]*(i+1)*5.1)%1)-0.5)*16
    arr[i*3+2] = (((seed[(i+7)%seed.length]*(i+1)*3.7)%1)-0.5)*10
  }
  return arr
})()

/* ─── 3D Components ─────────────────────────────────────── */
function ParticleField() {
  const mesh = useRef()
  useFrame(s => { if (!mesh.current) return; mesh.current.rotation.y=s.clock.elapsedTime*0.018; mesh.current.rotation.x=Math.sin(s.clock.elapsedTime*0.012)*0.08 })
  return (
    <points ref={mesh}>
      <bufferGeometry><bufferAttribute attach="attributes-position" count={PARTICLE_COUNT} array={PARTICLE_POSITIONS} itemSize={3}/></bufferGeometry>
      <pointsMaterial size={0.06} color="#3291ff" transparent opacity={0.6} sizeAttenuation/>
    </points>
  )
}
function CoreSphere() {
  const mesh = useRef()
  useFrame(s => { if (!mesh.current) return; mesh.current.rotation.z=s.clock.elapsedTime*0.08; mesh.current.rotation.y=s.clock.elapsedTime*0.12 })
  return (
    <Float speed={1.4} rotationIntensity={0.4} floatIntensity={0.8}>
      <Sphere ref={mesh} args={[1.6,80,80]} position={[0,0,0]}>
        <MeshDistortMaterial color="#0070f3" distort={0.38} speed={1.8} roughness={0.1} metalness={0.9} transparent opacity={0.18}/>
      </Sphere>
    </Float>
  )
}
function WireRing() {
  const mesh = useRef()
  useFrame(s => { if (!mesh.current) return; mesh.current.rotation.x=s.clock.elapsedTime*0.14; mesh.current.rotation.z=s.clock.elapsedTime*0.07 })
  return <mesh ref={mesh}><torusGeometry args={[2.6,0.012,4,180]}/><meshBasicMaterial color="#7928ca" transparent opacity={0.35}/></mesh>
}
function OuterRing() {
  const mesh = useRef()
  useFrame(s => { if (!mesh.current) return; mesh.current.rotation.x=-s.clock.elapsedTime*0.06; mesh.current.rotation.y=s.clock.elapsedTime*0.04 })
  return <mesh ref={mesh}><torusGeometry args={[3.6,0.008,4,200]}/><meshBasicMaterial color="#50e3c2" transparent opacity={0.20}/></mesh>
}
function FloatingOcta({ config: c }) {
  const mesh = useRef()
  useFrame(s => { if (!mesh.current) return; const t=s.clock.elapsedTime*c.speed+c.offset; mesh.current.position.set(c.pos[0], c.pos[1]+Math.sin(t)*0.3, c.pos[2]); mesh.current.rotation.x=t*0.5; mesh.current.rotation.z=t*0.3 })
  return <mesh ref={mesh} scale={c.scale}><octahedronGeometry args={[1,0]}/><meshStandardMaterial color={c.color} emissive={c.color} emissiveIntensity={0.6} transparent opacity={0.7} wireframe/></mesh>
}
function CameraRig() {
  const cx=useRef(0), cy=useRef(0), mx=useRef(0), my=useRef(0)
  useEffect(() => { const f=e=>{mx.current=(e.clientX/window.innerWidth-0.5)*2; my.current=(e.clientY/window.innerHeight-0.5)*2}; window.addEventListener('mousemove',f,{passive:true}); return()=>window.removeEventListener('mousemove',f) },[])
  useFrame(({camera})=>{ cx.current+=(mx.current*0.8-cx.current)*0.04; cy.current+=(-my.current*0.5-cy.current)*0.04; camera.position.x=cx.current; camera.position.y=cy.current; camera.lookAt(0,0,0) })
  return null
}
function Scene() {
  return (
    <>
      <ambientLight intensity={0.3}/>
      <pointLight position={[6,6,4]}   intensity={2}   color="#3291ff"/>
      <pointLight position={[-6,-4,2]} intensity={1.5} color="#7928ca"/>
      <pointLight position={[0,8,-4]}  intensity={1}   color="#50e3c2"/>
      <Stars radius={60} depth={40} count={600} factor={2} saturation={0.4} fade speed={0.4}/>
      <ParticleField/><CoreSphere/><WireRing/><OuterRing/>
      {OCTA_CONFIGS.map((c,i)=><FloatingOcta key={i} config={c}/>)}
      <CameraRig/>
    </>
  )
}

const fadeUp = (delay=0) => ({ initial:{opacity:0,y:30}, animate:{opacity:1,y:0}, transition:{duration:0.7,ease:[0.16,1,0.3,1],delay} })

/* ─────────────────────────────────────────────────────────────
   HERO
───────────────────────────────────────────────────────────── */
export default function Hero() {
  const navigate = useNavigate()
  const [counts, setCounts] = useState(STATS.map(()=>0))

  useEffect(()=>{
    const steps=60; let step=0
    const t=setInterval(()=>{ step++; const e=1-Math.pow(1-step/steps,3); setCounts(STATS.map(s=>Math.round(s.target*e))); if(step>=steps)clearInterval(t) },32)
    return ()=>clearInterval(t)
  },[])

  const scrollTo = useCallback(id=>{ const el=document.getElementById(id); if(el)el.scrollIntoView({behavior:'smooth',block:'start'}) },[])

  return (
    <section className="lp-hero">
      {/* 3-D canvas */}
      <div className="lp-hero-canvas">
        <Suspense fallback={null}>
          <Canvas camera={{position:[0,0,7],fov:55}} gl={{antialias:true,alpha:true}} style={{background:'transparent'}} dpr={[1,1.5]}>
            <Scene/>
          </Canvas>
        </Suspense>
      </div>

      <div className="lp-hero-content">

        {/* Badge */}
        <Motion.div {...fadeUp(0)} style={{marginBottom:32}}>
          <div className="lp-badge">
            <span className="lp-badge-dot"/>
            Powered by LangChain + LangGraph
          </div>
        </Motion.div>

        {/* Headline */}
        <Motion.h1 className="lp-hero-headline" {...fadeUp(0.12)}>
          <span>The AI platform for</span><br/>
          <span className="lp-heading-grad">modern operations</span>
        </Motion.h1>

        {/* Sub */}
        <Motion.p className="lp-hero-sub" {...fadeUp(0.22)}>
          Automate sales analysis, inventory management, and purchase order workflows
          with a multi-agent AI system built for real business data.
        </Motion.p>

        {/* CTAs */}
        <Motion.div className="lp-hero-ctas" {...fadeUp(0.32)}>
          {/* Primary — blue */}
          <button
            className="lp-btn lp-btn-lg"
            onClick={()=>navigate('/login')}
            style={{ background:'#0070f3', color:'#fff', border:'none', fontWeight:600, gap:8, display:'inline-flex', alignItems:'center', boxShadow:'0 6px 28px rgba(0,112,243,0.40)' }}
            onMouseEnter={e=>{e.currentTarget.style.background='#005cc5';e.currentTarget.style.transform='translateY(-2px)'}}
            onMouseLeave={e=>{e.currentTarget.style.background='#0070f3';e.currentTarget.style.transform='none'}}
          >
            Start for free <ArrowIcon/>
          </button>

          {/* Secondary — dark grey, always readable */}
          <button
            className="lp-btn lp-btn-lg"
            onClick={()=>scrollTo('how-it-works')}
            style={{ background:'#1a1a1a', color:'#d4d4d4', border:'1px solid #333', fontWeight:500, gap:8, display:'inline-flex', alignItems:'center' }}
            onMouseEnter={e=>{e.currentTarget.style.background='#252525';e.currentTarget.style.borderColor='#444';e.currentTarget.style.color='#fff'}}
            onMouseLeave={e=>{e.currentTarget.style.background='#1a1a1a';e.currentTarget.style.borderColor='#333';e.currentTarget.style.color='#d4d4d4'}}
          >
            <PlayIcon/> See how it works
          </button>
        </Motion.div>

        {/* Stats */}
        <Motion.div className="lp-hero-stats" {...fadeUp(0.42)}>
          {STATS.map((s,i)=>(
            <div key={s.label} style={{textAlign:'center'}}>
              <div className="lp-hero-stat-val">{counts[i]}{s.suffix}</div>
              <div className="lp-hero-stat-label">{s.label}</div>
            </div>
          ))}
        </Motion.div>

        {/* Dashboard mockup */}
        <Motion.div
          className="lp-mockup-wrap"
          initial={{opacity:0,y:56,scale:0.96}}
          animate={{opacity:1,y:0,scale:1}}
          transition={{duration:1.0,ease:[0.16,1,0.3,1],delay:0.55}}
        >
          <div className="lp-mockup-glow"/>
          <div className="lp-mockup">
            <div className="lp-mockup-bar">
              <div className="lp-mockup-dot" style={{background:'#FF5F57'}}/>
              <div className="lp-mockup-dot" style={{background:'#FFBD2E'}}/>
              <div className="lp-mockup-dot" style={{background:'#28CA41'}}/>
              <div className="lp-mockup-url">autobiz.ai/dashboard</div>
            </div>
            <div className="lp-mockup-body">
              <div className="lp-mockup-sidebar">
                {MOCKUP_NAV.map(item=>(
                  <div key={item.label} className="lp-mockup-nav-item" style={{color:item.active?'var(--l-blue2)':'var(--l-text2)',background:item.active?'var(--l-blue-dim)':'transparent'}}>
                    <div className="lp-mockup-nav-dot" style={{background:item.active?'var(--l-blue)':'var(--l-text3)'}}/>
                    {item.label}
                  </div>
                ))}
              </div>
              <div className="lp-mockup-content">
                <div className="lp-mockup-cards">
                  {MOCKUP_CARDS.map(c=>(
                    <div key={c.label} className="lp-mockup-card">
                      <div className="lp-mockup-card-bar"/>
                      <div className="lp-mockup-card-label">{c.label}</div>
                      <div className="lp-mockup-card-val">{c.value}</div>
                      <div className="lp-mockup-card-delta">{c.delta}</div>
                    </div>
                  ))}
                </div>
                <div className="lp-mockup-chart">
                  <div className="lp-mockup-chart-label">Revenue — Last 12 Months</div>
                  <div className="lp-mockup-chart-bars">
                    {BAR_HEIGHTS.map((h,i)=>(
                      <div key={i} className="lp-mockup-bar-item" style={{height:`${h}%`,animationDelay:`${0.6+i*0.04}s`}}/>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Motion.div>

      </div>
    </section>
  )
}