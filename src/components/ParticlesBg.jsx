import { useRef, useMemo, useEffect } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import gsap from 'gsap'

export default function ParticlesBg({ isPortals }) {
  const count = 1800
  const orbitCount = 350
  
  const pointsRef = useRef()
  const orbitPointsRef = useRef()
  const { size } = useThree()

  // 1. Generate main particle dataset
  const [positions, targetPositions, colors, originalColors] = useMemo(() => {
    const pos = new Float32Array(count * 3)
    const targets = new Float32Array(count * 3)
    const cols = new Float32Array(count * 3)
    const origCols = new Float32Array(count * 3)

    const colorCyan = new THREE.Color('#0077b6')
    const colorFuchsia = new THREE.Color('#b5179e')
    const colorSlate = new THREE.Color('#64748b')

    for (let i = 0; i < count; i++) {
      // Landing Page default coordinates (random cloud/sphere)
      const u = Math.random()
      const v = Math.random()
      const theta = u * 2.0 * Math.PI
      const phi = Math.acos(2.0 * v - 1.0)
      const r = 5 + Math.random() * 8
      
      const x = r * Math.sin(phi) * Math.cos(theta)
      const y = r * Math.sin(phi) * Math.sin(theta)
      const z = (Math.random() - 0.5) * 10

      pos[i * 3] = x
      pos[i * 3 + 1] = y
      pos[i * 3 + 2] = z

      // Default Colors
      const mixRatio = Math.random()
      const color = colorCyan.clone().lerp(colorSlate, mixRatio * 0.7)
      cols[i * 3] = color.r
      cols[i * 3 + 1] = color.g
      cols[i * 3 + 2] = color.b

      origCols[i * 3] = color.r
      origCols[i * 3 + 1] = color.g
      origCols[i * 3 + 2] = color.b

      // Targets: Portal layout (2 separate rings)
      const isLeft = Math.random() > 0.5
      const angle = Math.random() * Math.PI * 2
      const radius = 0.5 + Math.random() * 1.5
      
      const cx = isLeft ? -3.5 : 3.5
      const cy = 0
      const cz = 0

      targets[i * 3] = cx + Math.cos(angle) * radius
      targets[i * 3 + 1] = cy + Math.sin(angle) * radius
      targets[i * 3 + 2] = cz + (Math.random() - 0.5) * 2

      // Card Colors
      const portalCol = isLeft ? colorCyan : colorFuchsia
      cols[i * 3] = portalCol.r
      cols[i * 3 + 1] = portalCol.g
      cols[i * 3 + 2] = portalCol.b
    }

    return [pos, targets, cols, origCols]
  }, [])

  // 2. Generate Orbiting Satellite particles (larger glowing dots)
  const [orbitPositions, orbitTargets, orbitColors, orbitMetadata] = useMemo(() => {
    const pos = new Float32Array(orbitCount * 3)
    const targets = new Float32Array(orbitCount * 3)
    const cols = new Float32Array(orbitCount * 3)
    const meta = [] // Store speed and angle offsets

    const colorCyan = new THREE.Color('#0077b6')
    const colorFuchsia = new THREE.Color('#b5179e')

    for (let i = 0; i < orbitCount; i++) {
      // Landing page: big double ring around logo
      const isOuter = i > orbitCount / 2
      const angle = (i / (orbitCount / 2)) * Math.PI * 2
      const r = isOuter ? 9 : 6
      const x = Math.cos(angle) * r
      const y = Math.sin(angle) * r
      const z = (Math.random() - 0.5) * 2

      pos[i * 3] = x
      pos[i * 3 + 1] = y
      pos[i * 3 + 2] = z

      // Portal Selection: Double helix loops swirling around both portals
      const isLeft = i > orbitCount / 2
      const cx = isLeft ? -3.5 : 3.5
      
      // Ring helix
      const tAngle = Math.random() * Math.PI * 2
      const tRadius = 1.6 + Math.random() * 0.4
      targets[i * 3] = cx + Math.cos(tAngle) * tRadius
      targets[i * 3 + 1] = Math.sin(tAngle) * tRadius
      targets[i * 3 + 2] = (Math.random() - 0.5) * 3

      // Colors
      const color = isLeft ? colorCyan : colorFuchsia
      cols[i * 3] = color.r
      cols[i * 3 + 1] = color.g
      cols[i * 3 + 2] = color.b

      meta.push({
        speed: 1 + Math.random() * 2,
        phase: Math.random() * Math.PI * 2,
        radiusOffset: 0.1 + Math.random() * 0.3,
        isLeft
      })
    }

    return [pos, targets, cols, meta]
  }, [])

  // Ref to hold morph progress (0 = Landing page cloud, 1 = Portals rings)
  const morphProgress = useRef({ val: 0 })

  useEffect(() => {
    gsap.to(morphProgress.current, {
      val: isPortals ? 1 : 0,
      duration: 1.8,
      ease: 'power3.inOut',
    })
  }, [isPortals])

  // Custom Circle Texture for points
  const pTexture = useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 16
    canvas.height = 16
    const ctx = canvas.getContext('2d')
    const gradient = ctx.createRadialGradient(8, 8, 0, 8, 8, 8)
    gradient.addColorStop(0, 'rgba(255, 255, 255, 1)')
    gradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.4)')
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0)')
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, 16, 16)
    return new THREE.CanvasTexture(canvas)
  }, [])

  // Animation Loop
  useFrame((state) => {
    if (!pointsRef.current || !orbitPointsRef.current) return
    const p = morphProgress.current.val
    const time = state.clock.getElapsedTime()
    const { viewport } = state

    // 1. Calculate projected 3D mouse coordinate at z = 0
    const mx = state.pointer.x * (viewport.width / 2)
    const my = state.pointer.y * (viewport.height / 2)

    // Retrieve scroll factor for landing page
    const scrollY = typeof window !== 'undefined' ? window.scrollY : 0
    const scrollFactor = scrollY * 0.005

    // A. ANIMATING MAIN PARTICLES (WITH MOUSE FLUID STIRRING)
    const posAttr = pointsRef.current.geometry.attributes.position
    const colAttr = pointsRef.current.geometry.attributes.color

    for (let i = 0; i < count; i++) {
      const idx = i * 3

      // Base Landing coordinates
      let bx = positions[idx] + Math.sin(time * 0.1 + i) * 0.05
      let by = positions[idx + 1] + Math.cos(time * 0.12 + i) * 0.05 + scrollFactor
      let bz = positions[idx + 2] + Math.sin(time * 0.08 + i) * 0.05

      // Target Portal coordinates
      const isLeft = targetPositions[idx] < 0
      const spiralDirection = isLeft ? -0.6 : 0.6
      const cx = isLeft ? -3.5 : 3.5
      
      const dx_t = targetPositions[idx] - cx
      const dy_t = targetPositions[idx + 1]
      const rotAngle = time * spiralDirection * 0.6
      
      const tx = cx + (dx_t * Math.cos(rotAngle) - dy_t * Math.sin(rotAngle))
      const ty = (dx_t * Math.sin(rotAngle) + dy_t * Math.cos(rotAngle))
      const tz = targetPositions[idx + 2] + Math.sin(time * 2 + i) * 0.1

      // Interpolate current base coordinate
      let cx_curr = THREE.MathUtils.lerp(bx, tx, p)
      let cy_curr = THREE.MathUtils.lerp(by, ty, p)
      let cz_curr = THREE.MathUtils.lerp(bz, tz, p)

      // Apply interactive mouse force (attract/stir/repel)
      const dx_mouse = cx_curr - mx
      const dy_mouse = cy_curr - my
      const dist_mouse = Math.sqrt(dx_mouse * dx_mouse + dy_mouse * dy_mouse)
      
      const forceRadius = 3.0
      if (dist_mouse < forceRadius && dist_mouse > 0.1) {
        const forceRatio = 1.0 - dist_mouse / forceRadius
        
        // Fluid Swirl force
        const swirlSpeed = forceRatio * 0.5
        const rx = dx_mouse * Math.cos(swirlSpeed) - dy_mouse * Math.sin(swirlSpeed)
        const ry = dx_mouse * Math.sin(swirlSpeed) + dy_mouse * Math.cos(swirlSpeed)

        // Repel force
        const pushStrength = forceRatio * 0.25
        const px = (dx_mouse / dist_mouse) * pushStrength
        const py = (dy_mouse / dist_mouse) * pushStrength

        cx_curr = mx + rx + px
        cy_curr = my + ry + py
      }

      posAttr.array[idx] = cx_curr
      posAttr.array[idx + 1] = cy_curr
      posAttr.array[idx + 2] = cz_curr

      // Morph colors
      const r_orig = originalColors[idx]
      const g_orig = originalColors[idx + 1]
      const b_orig = originalColors[idx + 2]
      const r_t = colors[idx]
      const g_t = colors[idx + 1]
      const b_t = colors[idx + 2]

      colAttr.array[idx] = THREE.MathUtils.lerp(r_orig, r_t, p)
      colAttr.array[idx + 1] = THREE.MathUtils.lerp(g_orig, g_t, p)
      colAttr.array[idx + 2] = THREE.MathUtils.lerp(b_orig, b_t, p)
    }

    posAttr.needsUpdate = true
    colAttr.needsUpdate = true

    // B. ANIMATING ORBIT SATELLITES (DOUBLE-HELIX ORBITALS)
    const orbPosAttr = orbitPointsRef.current.geometry.attributes.position
    
    for (let i = 0; i < orbitCount; i++) {
      const idx = i * 3
      const meta = orbitMetadata[i]

      // Base Landing Ring rotation
      const lAngle = (i / (orbitCount / 2)) * Math.PI * 2 + time * 0.15
      const lRadius = (i > orbitCount / 2 ? 9.5 : 6.5) + Math.sin(time * 1 + i) * 0.1
      const bx = Math.cos(lAngle) * lRadius
      const by = Math.sin(lAngle) * lRadius
      const bz = Math.cos(time * 0.5 + i) * 1.5

      // Target Portal Helix rotation
      const cx = meta.isLeft ? -3.5 : 3.5
      const direction = meta.isLeft ? 1 : -1
      
      const helicalAngle = time * meta.speed * direction + meta.phase
      const hr = 1.3 + Math.sin(time * 2 + i) * meta.radiusOffset
      
      const tx = cx + Math.cos(helicalAngle) * hr
      const ty = Math.sin(helicalAngle) * hr
      const tz = Math.sin(helicalAngle * 2) * 1.2

      // Interpolate orbit coordinates
      let cx_orb = THREE.MathUtils.lerp(bx, tx, p)
      let cy_orb = THREE.MathUtils.lerp(by, ty, p)
      let cz_orb = THREE.MathUtils.lerp(bz, tz, p)

      // Add a small mouse vortex attraction to the orbit satellites
      const dx_m = cx_orb - mx
      const dy_m = cy_orb - my
      const dist_m = Math.sqrt(dx_m * dx_m + dy_m * dy_m)
      if (dist_m < 2.0) {
        const pull = (1.0 - dist_m / 2.0) * 0.08
        cx_orb -= (dx_m / dist_m) * pull
        cy_orb -= (dy_m / dist_m) * pull
      }

      orbPosAttr.array[idx] = cx_orb
      orbPosAttr.array[idx + 1] = cy_orb
      orbPosAttr.array[idx + 2] = cz_orb
    }

    orbPosAttr.needsUpdate = true

    // Rotate points group subtly
    pointsRef.current.rotation.y = time * 0.015
    orbitPointsRef.current.rotation.y = time * -0.01
  })

  return (
    <group>
      {/* Main interactive particle system */}
      <points ref={pointsRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[positions, 3]}
          />
          <bufferAttribute
            attach="attributes-color"
            args={[colors, 3]}
          />
        </bufferGeometry>
        <pointsMaterial
          size={0.11}
          map={pTexture}
          vertexColors
          transparent
          depthWrite={false}
        />
      </points>

      {/* Orbiting double helix satellite points */}
      <points ref={orbitPointsRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[orbitPositions, 3]}
          />
          <bufferAttribute
            attach="attributes-color"
            args={[orbitColors, 3]}
          />
        </bufferGeometry>
        <pointsMaterial
          size={0.24}
          map={pTexture}
          vertexColors
          transparent
          depthWrite={false}
          opacity={0.85}
        />
      </points>
    </group>
  )
}
