import React, { useEffect } from 'react'
import '../components/landing/landing.css'
import LandingNavbar from '../components/landing/LandingNavbar'
import Hero          from '../components/landing/Hero'
import Features      from '../components/landing/Features'
import HowItWorks    from '../components/landing/HowItWorks'
import Agents        from '../components/landing/Agents'
import Testimonials  from '../components/landing/Testimonials'
import Pricing       from '../components/landing/Pricing'
import Footer        from '../components/landing/Footer'

export default function Landing() {
  useEffect(() => { window.scrollTo(0, 0) }, [])

  // Always dark — lp-light class never applied
  return (
    <div className="lp-wrap">
      <div className="lp-grid-bg" />
      <LandingNavbar />
      <Hero />
      <Features />
      <HowItWorks />
      <Agents />
      <Testimonials />
      <Pricing />
      <Footer />
    </div>
  )
}