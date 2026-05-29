import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import gsap from 'gsap'
import { Store, Truck, ArrowLeft, Zap } from 'lucide-react'

export default function PortalSelection() {
  const navigate = useNavigate()
  const pageRef = useRef(null)
  const card1Ref = useRef(null)
  const card2Ref = useRef(null)
  
  const [activePortal, setActivePortal] = useState(null)

  useEffect(() => {
    // Smooth page entrance
    gsap.fromTo(pageRef.current,
      { opacity: 0, y: 50 },
      { opacity: 1, y: 0, duration: 1.2, ease: 'power3.out' }
    )

    // Staggered card entrance
    gsap.fromTo([card1Ref.current, card2Ref.current],
      { opacity: 0, scale: 0.9, y: 60 },
      { opacity: 1, scale: 1, y: 0, duration: 1, stagger: 0.15, ease: 'power2.out', delay: 0.2 }
    )
  }, [])

  // Custom 3D Tilt calculation
  const handleMouseMove = (e, ref) => {
    const card = ref.current
    if (!card) return
    const rect = card.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const xc = rect.width / 2
    const yc = rect.height / 2
    
    // Limits of rotation: Max 12 degrees
    const rotateX = -(y - yc) / 12
    const rotateY = (x - xc) / 12
    
    card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-10px)`
  }

  const handleMouseLeave = (ref) => {
    const card = ref.current
    if (!card) return
    card.style.transform = `perspective(1000px) rotateX(0deg) rotateY(0deg) translateY(0)`
  }

  const handleBack = () => {
    gsap.to(pageRef.current, {
      opacity: 0,
      y: 50,
      duration: 0.8,
      ease: 'power2.inOut',
      onComplete: () => {
        navigate('/')
      }
    })
  }

  const enterPortal = (portalName) => {
    setActivePortal(portalName)
    // Simulate portal warp: screen flash
    const overlay = document.getElementById('warp-overlay')
    gsap.fromTo(overlay,
      { opacity: 0 },
      {
        opacity: 1,
        duration: 0.4,
        yoyo: true,
        repeat: 1,
        ease: 'power2.inOut',
        onComplete: () => {
          alert(`Initializing secure quantum link to ${portalName}...`)
          setActivePortal(null)
        }
      }
    )
  }

  return (
    <div ref={pageRef} className="w-full min-h-screen text-slate-800 flex flex-col items-center justify-center px-6 relative py-16">
      
      {/* Dynamic Screen Flash Warp Overlay */}
      <div id="warp-overlay" className="fixed inset-0 bg-white pointer-events-none opacity-0 z-50"></div>

      {/* Return Back Button */}
      <button 
        onClick={handleBack}
        className="absolute top-8 left-8 flex items-center gap-2 text-slate-500 hover:text-cyan-600 font-display text-xs tracking-widest uppercase transition-colors"
      >
        <ArrowLeft size={16} />
        Back to orbit
      </button>

      {/* Intro Text */}
      <div className="text-center max-w-xl mb-16 relative z-10">
        <h1 className="font-display font-black text-4xl md:text-5xl tracking-tighter mb-4 text-slate-900 leading-tight uppercase text-glow-cyan">
          Select your <span className="text-cyan-600 text-glow-cyan">domain</span>
        </h1>
        <p className="text-slate-600 font-medium">
          Step into the coordinate deck. Configure your nodes and establish secure communication channels.
        </p>
      </div>

      {/* Portals Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-10 w-full max-w-4xl justify-center items-stretch relative z-10">
        
        {/* Portal 1: Vendor Portal */}
        <div 
          ref={card1Ref}
          onMouseMove={(e) => handleMouseMove(e, card1Ref)}
          onMouseLeave={() => handleMouseLeave(card1Ref)}
          className="flex-grow bg-white/70 backdrop-blur-md border border-slate-200/80 p-8 md:p-12 rounded-3xl transition-all-custom flex flex-col items-center justify-between border-glow-cyan text-center group shadow-xl hover:border-cyan-300 relative overflow-hidden"
          style={{ transformStyle: 'preserve-3d' }}
        >
          {/* Card Backglow */}
          <div className="absolute inset-0 bg-gradient-to-br from-neonCyan/5 to-transparent rounded-3xl pointer-events-none -z-10"></div>
          
          <div 
            className="w-20 h-20 bg-cyan-50 border border-cyan-200 rounded-2xl flex items-center justify-center mb-8 text-cyan-600 shadow-glow"
            style={{ transform: 'translateZ(40px)' }}
          >
            <Store size={38} strokeWidth={1.5} />
          </div>

          <div style={{ transform: 'translateZ(30px)' }}>
            <h2 className="font-display font-bold text-3xl mb-4 text-slate-900 uppercase tracking-tight group-hover:text-cyan-600 transition-colors">
              Vendor Portal
            </h2>
            <p className="text-slate-600 text-sm leading-relaxed mb-8 max-w-xs">
              Manage product listings, configure sales metrics, and establish direct digital client billing streams.
            </p>
          </div>

          <button 
            onClick={() => enterPortal('Vendor Portal')}
            className="w-full py-4 bg-gradient-to-r from-cyan-500 to-cyan-600 text-white font-display font-bold text-xs tracking-wider uppercase rounded-xl transition-all hover:shadow-neonCyan hover:scale-[1.02] flex items-center justify-center gap-2"
            style={{ transform: 'translateZ(50px)' }}
          >
            <Zap size={14} fill="currentColor" /> Enter Portal
          </button>
        </div>

        {/* Portal 2: Distributor Portal */}
        <div 
          ref={card2Ref}
          onMouseMove={(e) => handleMouseMove(e, card2Ref)}
          onMouseLeave={() => handleMouseLeave(card2Ref)}
          className="flex-grow bg-white/70 backdrop-blur-md border border-slate-200/80 p-8 md:p-12 rounded-3xl transition-all-custom flex flex-col items-center justify-between border-glow-fuchsia text-center group shadow-xl hover:border-fuchsia-300 relative overflow-hidden"
          style={{ transformStyle: 'preserve-3d' }}
        >
          {/* Card Backglow */}
          <div className="absolute inset-0 bg-gradient-to-br from-neonFuchsia/5 to-transparent rounded-3xl pointer-events-none -z-10"></div>

          <div 
            className="w-20 h-20 bg-fuchsia-50 border border-fuchsia-200 rounded-2xl flex items-center justify-center mb-8 text-fuchsia-600 shadow-glow"
            style={{ transform: 'translateZ(40px)' }}
          >
            <Truck size={38} strokeWidth={1.5} />
          </div>

          <div style={{ transform: 'translateZ(30px)' }}>
            <h2 className="font-display font-bold text-3xl mb-4 text-slate-900 uppercase tracking-tight group-hover:text-fuchsia-600 transition-colors">
              Distributor Portal
            </h2>
            <p className="text-slate-600 text-sm leading-relaxed mb-8 max-w-xs">
              Coordinate logistics fleets, audit inventory channels, and evaluate cross-border shipping agreements.
            </p>
          </div>

          <button 
            onClick={() => enterPortal('Distributor Portal')}
            className="w-full py-4 bg-gradient-to-r from-fuchsia-500 to-fuchsia-600 text-white font-display font-bold text-xs tracking-wider uppercase rounded-xl transition-all hover:shadow-neonFuchsia hover:scale-[1.02] flex items-center justify-center gap-2"
            style={{ transform: 'translateZ(50px)' }}
          >
            <Zap size={14} fill="currentColor" /> Enter Portal
          </button>
        </div>

      </div>

      <div className="mt-16 text-slate-600 font-display text-[10px] tracking-widest uppercase flex items-center gap-2 relative z-10">
        <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-ping"></span>
        <span>Secure connection active</span>
      </div>

    </div>
  )
}
