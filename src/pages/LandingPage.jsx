import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { BarChart3, Boxes, CreditCard, ChevronDown } from 'lucide-react'

gsap.registerPlugin(ScrollTrigger)

export default function LandingPage() {
  const navigate = useNavigate()
  const pageRef = useRef(null)

  useEffect(() => {
    const el = pageRef.current
    
    // Hero elements subtle entrance
    gsap.fromTo(el.querySelectorAll('.hero-anim'),
      { opacity: 0, y: 40 },
      { opacity: 1, y: 0, duration: 1.2, stagger: 0.2, ease: 'power3.out' }
    )

    // Select all feature sections and apply scroll-triggered reveals
    const sections = el.querySelectorAll('.feature-section')
    sections.forEach((section) => {
      const card = section.querySelector('.feature-card')
      const graphic = section.querySelector('.feature-graphic')

      gsap.fromTo(card,
        { opacity: 0, x: -80 },
        {
          opacity: 1,
          x: 0,
          duration: 1,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: section,
            start: 'top 75%',
            toggleActions: 'play none none reverse',
          }
        }
      )

      gsap.fromTo(graphic,
        { opacity: 0, x: 80, rotate: 10, scale: 0.8 },
        {
          opacity: 1,
          x: 0,
          rotate: 0,
          scale: 1,
          duration: 1.2,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: section,
            start: 'top 75%',
            toggleActions: 'play none none reverse',
          }
        }
      )
    })

    // Clean up ScrollTriggers on unmount
    return () => {
      ScrollTrigger.getAll().forEach(t => t.kill())
    }
  }, [])

  const handleGetStarted = () => {
    // Elegant fade out transition of the landing text content before navigating
    gsap.to(pageRef.current, {
      opacity: 0,
      y: -50,
      duration: 0.8,
      ease: 'power2.inOut',
      onComplete: () => {
        navigate('/portals')
      }
    })
  }

  const scrollNext = () => {
    const target = pageRef.current.querySelector('#features-start')
    target.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <div ref={pageRef} className="w-full min-h-screen text-slate-800 flex flex-col items-center">
      
      {/* HEADER NAVBAR */}
      <header className="w-full max-w-7xl px-8 py-6 flex items-center justify-between z-10">
        <div className="font-display font-extrabold text-2xl tracking-widest text-slate-900">
          VENDOR<span className="text-cyan-600 text-glow-cyan">VERSE</span>
        </div>
        <button 
          onClick={handleGetStarted}
          className="border border-cyan-300 text-cyan-600 hover:bg-cyan-50 px-5 py-2 rounded-full font-display font-semibold text-xs tracking-wider uppercase transition-all duration-300 shadow-sm hover:shadow-neonCyan"
        >
          Portal Entry
        </button>
      </header>

      {/* HERO SECTION */}
      <section className="min-h-[90vh] flex flex-col justify-center items-center text-center px-4 relative z-10">
        <h1 className="hero-anim font-display font-black text-6xl md:text-8xl tracking-tighter text-slate-900 select-none leading-none mb-6">
          VENDOR<span className="text-cyan-600 text-glow-cyan">VERSE</span>
        </h1>
        <p className="hero-anim text-lg md:text-2xl text-slate-600 font-medium max-w-2xl mb-12">
          Empowering Small Vendors, Scaling Big Dreams
        </p>
        
        <div className="hero-anim">
          <button 
            onClick={handleGetStarted}
            className="group relative px-8 py-4 bg-gradient-to-r from-cyan-500 to-cyan-600 text-white font-display font-bold text-sm tracking-widest uppercase rounded-full overflow-hidden transition-all duration-300 hover:shadow-neonCyan hover:scale-105"
          >
            <span className="relative z-10 flex items-center gap-2">
              Get Started <span className="group-hover:translate-x-1 transition-transform">→</span>
            </span>
            <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-20 transition-opacity"></div>
          </button>
        </div>

        {/* Scroll Indicator */}
        <div 
          onClick={scrollNext}
          className="hero-anim absolute bottom-8 cursor-pointer hover:text-cyan-600 transition-colors animate-bounce flex flex-col items-center gap-2 text-slate-500 font-display text-[10px] tracking-widest uppercase"
        >
          <span>Scroll to explore</span>
          <ChevronDown size={18} />
        </div>
      </section>

      {/* ANCHOR TO START FEATURES */}
      <div id="features-start" className="h-10"></div>

      {/* FEATURES SECTIONS */}
      <main className="w-full max-w-5xl px-6 py-20 flex flex-col gap-32 relative z-10">
        
        {/* Feature 1: Sales Management */}
        <section className="feature-section flex flex-col md:flex-row items-center justify-between gap-12 min-h-[40vh]">
          <div className="feature-card flex-1 max-w-md bg-white/70 border border-slate-200/80 backdrop-blur-md p-8 md:p-10 rounded-2xl border-glow-cyan transition-all duration-500 hover:border-cyan-300 shadow-xl">
            <div className="w-12 h-12 bg-cyan-50 border border-cyan-200 rounded-lg flex items-center justify-center mb-6 text-cyan-600">
              <BarChart3 size={24} />
            </div>
            <h2 className="font-display font-bold text-3xl mb-4 text-slate-900">Sales Management</h2>
            <p className="text-slate-600 leading-relaxed">
              Track transaction histories, examine conversion rates, and map customer journeys with our hyper-visual live statistics cockpit. Transform numbers into active opportunities.
            </p>
          </div>
          
          <div className="feature-graphic flex-1 flex justify-center items-center">
            <div className="relative w-64 h-64 md:w-80 md:h-80 bg-gradient-to-tr from-cyan-50 to-cyan-100/50 border border-cyan-200 rounded-3xl flex items-center justify-center shadow-glow overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-t from-white/80 to-transparent z-10"></div>
              {/* Graphic Wireframes */}
              <div className="w-48 h-32 flex items-end gap-3 z-20">
                <div className="flex-1 bg-cyan-100 border-t-2 border-cyan-500 h-12 rounded-t transition-all duration-700 group-hover:h-24"></div>
                <div className="flex-1 bg-cyan-100 border-t-2 border-cyan-500 h-24 rounded-t transition-all duration-700 group-hover:h-36"></div>
                <div className="flex-1 bg-cyan-100 border-t-2 border-cyan-500 h-16 rounded-t transition-all duration-700 group-hover:h-28"></div>
                <div className="flex-1 bg-cyan-100 border-t-2 border-cyan-500 h-32 rounded-t transition-all duration-700 group-hover:h-44"></div>
              </div>
            </div>
          </div>
        </section>

        {/* Feature 2: Inventory Control */}
        <section className="feature-section flex flex-col md:flex-row-reverse items-center justify-between gap-12 min-h-[40vh]">
          <div className="feature-card flex-1 max-w-md bg-white/70 border border-slate-200/80 backdrop-blur-md p-8 md:p-10 rounded-2xl border-glow-fuchsia transition-all duration-500 hover:border-fuchsia-300 shadow-xl">
            <div className="w-12 h-12 bg-fuchsia-50 border border-fuchsia-200 rounded-lg flex items-center justify-center mb-6 text-fuchsia-600">
              <Boxes size={24} />
            </div>
            <h2 className="font-display font-bold text-3xl mb-4 text-slate-900">Inventory Control</h2>
            <p className="text-slate-600 leading-relaxed">
              Automated stock indicators, shelf depletion warnings, and predictive logistics supply loops. Never fail to satisfy client requests, and keep operations fully streamlined.
            </p>
          </div>
          
          <div className="feature-graphic flex-1 flex justify-center items-center">
            <div className="relative w-64 h-64 md:w-80 md:h-80 bg-gradient-to-tr from-fuchsia-50 to-fuchsia-100/50 border border-fuchsia-200 rounded-3xl flex items-center justify-center shadow-glow overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-t from-white/80 to-transparent z-10"></div>
              {/* Graphic Wireframes */}
              <div className="grid grid-cols-3 gap-3 z-20 w-44">
                <div className="w-10 h-10 border border-fuchsia-300 rounded bg-fuchsia-100 animate-pulse"></div>
                <div className="w-10 h-10 border border-fuchsia-300 rounded bg-fuchsia-100"></div>
                <div className="w-10 h-10 border border-fuchsia-300 rounded bg-fuchsia-100"></div>
                <div className="w-10 h-10 border border-fuchsia-300 rounded bg-fuchsia-100"></div>
                <div className="w-10 h-10 border border-fuchsia-300 rounded bg-fuchsia-100 animate-pulse"></div>
                <div className="w-10 h-10 border border-fuchsia-300 rounded bg-fuchsia-100"></div>
              </div>
            </div>
          </div>
        </section>

        {/* Feature 3: Digital Payments */}
        <section className="feature-section flex flex-col md:flex-row items-center justify-between gap-12 min-h-[40vh]">
          <div className="feature-card flex-1 max-w-md bg-white/70 border border-slate-200/80 backdrop-blur-md p-8 md:p-10 rounded-2xl border-glow-cyan transition-all duration-500 hover:border-cyan-300 shadow-xl">
            <div className="w-12 h-12 bg-cyan-50 border border-cyan-200 rounded-lg flex items-center justify-center mb-6 text-cyan-600">
              <CreditCard size={24} />
            </div>
            <h2 className="font-display font-bold text-3xl mb-4 text-slate-900">Digital Payments</h2>
            <p className="text-slate-600 leading-relaxed">
              Unified digital clearing registers with multi-currency smart contracts and sub-second validation. Scale business operations with secure global transactions.
            </p>
          </div>
          
          <div className="feature-graphic flex-1 flex justify-center items-center">
            <div className="relative w-64 h-64 md:w-80 md:h-80 bg-gradient-to-tr from-cyan-50 to-cyan-100/50 border border-cyan-200 rounded-3xl flex items-center justify-center shadow-glow overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-t from-white/80 to-transparent z-10"></div>
              {/* Graphic Wireframes */}
              <div className="relative w-48 h-32 border border-cyan-300 rounded-xl bg-gradient-to-br from-white to-cyan-50 p-4 z-20 transition-all duration-500 group-hover:rotate-6 shadow-md">
                <div className="w-8 h-6 bg-cyan-100 rounded mb-6 border border-cyan-200"></div>
                <div className="w-24 h-3 bg-cyan-100 rounded mb-2"></div>
                <div className="w-16 h-2 bg-cyan-50 rounded"></div>
              </div>
            </div>
          </div>
        </section>

      </main>

      {/* FOOTER */}
      <footer className="w-full max-w-7xl px-8 py-10 border-t border-slate-200 flex flex-col md:flex-row items-center justify-between gap-4 mt-20 z-10 text-xs text-slate-600 font-display">
        <p>© 2026 VendorVerse. Empowering commerce.</p>
        <p>Built with React Three Fiber, GSAP & Tailwind</p>
      </footer>

    </div>
  )
}
