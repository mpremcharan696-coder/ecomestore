import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import './LiquidEther.css'

export default function LiquidEther({
  mouseForce = 20,
  cursorSize = 100,
  isViscous = false,
  viscous = 30,
  iterationsViscous = 32,
  iterationsPoisson = 32,
  dt = 0.014,
  BFECC = true,
  resolution = 0.5,
  isBounce = false,
  colors = ['#5227FF', '#FF9FFC', '#B497CF'],
  style = {},
  className = '',
  autoDemo = true,
  autoSpeed = 0.5,
  autoIntensity = 2.2,
  takeoverDuration = 0.25,
  autoResumeDelay = 3000,
  autoRampDuration = 0.6
}) {
  const mountRef = useRef(null)
  const webglRef = useRef(null)
  const resizeObserverRef = useRef(null)
  const rafRef = useRef(null)
  const intersectionObserverRef = useRef(null)
  const isVisibleRef = useRef(true)
  const resizeRafRef = useRef(null)

  useEffect(() => {
    if (!mountRef.current) return

    function makePaletteTexture(stops) {
      let arr
      if (Array.isArray(stops) && stops.length > 0) {
        if (stops.length === 1) {
          arr = [stops[0], stops[0]]
        } else {
          arr = stops
        }
      } else {
        arr = ['#ffffff', '#ffffff']
      }
      const w = arr.length
      const data = new Uint8Array(w * 4)
      for (let i = 0; i < w; i++) {
        const c = new THREE.Color(arr[i])
        data[i * 4 + 0] = Math.round(c.r * 255)
        data[i * 4 + 1] = Math.round(c.g * 255)
        data[i * 4 + 2] = Math.round(c.b * 255)
        data[i * 4 + 3] = 255
      }
      const tex = new THREE.DataTexture(data, w, 1, THREE.RGBAFormat)
      tex.magFilter = THREE.LinearFilter;
      tex.minFilter = THREE.LinearFilter;
      tex.wrapS = THREE.ClampToEdgeWrapping;
      tex.wrapT = THREE.ClampToEdgeWrapping;
      tex.generateMipmaps = false;
      tex.needsUpdate = true;
      return tex;
    }

    const paletteTex = makePaletteTexture(colors)
    const bgVec4 = new THREE.Vector4(0, 0, 0, 0) // always transparent

    class CommonClass {
      constructor() {
        this.width = 0
        this.height = 0
        this.aspect = 1
        this.pixelRatio = 1
        this.isMobile = false
        this.breakpoint = 768
        this.fboWidth = null
        this.fboHeight = null
        this.time = 0
        this.delta = 0
        this.container = null
        this.renderer = null
        this.clock = null
      }
      init(container) {
        this.container = container
        this.pixelRatio = Math.min(window.devicePixelRatio || 1, 2)
        this.resize()
        this.renderer = new THREE.WebGLRenderer({ antialias: false, alpha: true })
        this.renderer.autoClear = false
        this.renderer.setClearColor(new THREE.Color(0x000000), 0)
        this.renderer.setPixelRatio(this.pixelRatio)
        this.renderer.setSize(this.width, this.height)
        this.renderer.domElement.style.width = '100%'
        this.renderer.domElement.style.height = '100%'
        this.renderer.domElement.style.display = 'block'
        this.clock = new THREE.Clock()
        this.clock.start()
      }
      resize() {
        if (!this.container) return
        const rect = this.container.getBoundingClientRect()
        this.width = Math.max(1, Math.floor(rect.width))
        this.height = Math.max(1, Math.floor(rect.height))
        this.aspect = this.width / this.height
        if (this.renderer) this.renderer.setSize(this.width, this.height, false)
      }
      update() {
        this.delta = this.clock.getDelta()
        this.time += this.delta
      }
    }
    const Common = new CommonClass()

    class MouseClass {
      constructor() {
        this.mouseMoved = false
        this.coords = new THREE.Vector2()
        this.coords_old = new THREE.Vector2()
        this.diff = new THREE.Vector2()
        this.timer = null
        this.container = null
        this.docTarget = null
        this.listenerTarget = null
        this.isHoverInside = false
        this.hasUserControl = false
        this.isAutoActive = false
        this.autoIntensity = 2.0
        this.takeoverActive = false
        this.takeoverStartTime = 0
        this.takeoverDuration = 0.25
        this.takeoverFrom = new THREE.Vector2()
        this.takeoverTo = new THREE.Vector2()
        this.onInteract = null
        this._onMouseMove = this.onDocumentMouseMove.bind(this)
        this._onTouchStart = this.onDocumentTouchStart.bind(this)
        this._onTouchMove = this.onDocumentTouchMove.bind(this)
        this._onTouchEnd = this.onTouchEnd.bind(this)
        this._onDocumentLeave = this.onDocumentLeave.bind(this)
      }
      init(container) {
        this.container = container
        this.docTarget = container.ownerDocument || null
        const defaultView =
          (this.docTarget && this.docTarget.defaultView) || (typeof window !== 'undefined' ? window : null)
        if (!defaultView) return
        this.listenerTarget = defaultView
        this.listenerTarget.addEventListener('mousemove', this._onMouseMove)
        this.listenerTarget.addEventListener('touchstart', this._onTouchStart, { passive: true })
        this.listenerTarget.addEventListener('touchmove', this._onTouchMove, { passive: true })
        this.listenerTarget.addEventListener('touchend', this._onTouchEnd)
        if (this.docTarget) {
          this.docTarget.addEventListener('mouseleave', this._onDocumentLeave)
        }
      }
      dispose() {
        if (this.listenerTarget) {
          this.listenerTarget.removeEventListener('mousemove', this._onMouseMove)
          this.listenerTarget.removeEventListener('touchstart', this._onTouchStart)
          this.listenerTarget.removeEventListener('touchmove', this._onTouchMove)
          this.listenerTarget.removeEventListener('touchend', this._onTouchEnd)
        }
        if (this.docTarget) {
          this.docTarget.removeEventListener('mouseleave', this._onDocumentLeave)
        }
        this.listenerTarget = null
        this.docTarget = null
        this.container = null
      }
      isPointInside(clientX, clientY) {
        if (!this.container) return false
        const rect = this.container.getBoundingClientRect()
        if (rect.width === 0 || rect.height === 0) return false
        return clientX >= rect.left && clientX <= rect.right && clientY >= rect.top && clientY <= rect.bottom
      }
      updateHoverState(clientX, clientY) {
        this.isHoverInside = this.isPointInside(clientX, clientY)
        return this.isHoverInside
      }
      setCoords(x, y) {
        if (!this.container) return
        if (this.timer) window.clearTimeout(this.timer)
        const rect = this.container.getBoundingClientRect()
        if (rect.width === 0 || rect.height === 0) return
        const nx = (x - rect.left) / rect.width
        const ny = (y - rect.top) / rect.height
        this.coords.set(nx * 2 - 1, -(ny * 2 - 1))
        this.mouseMoved = true
        this.timer = window.setTimeout(() => {
          this.mouseMoved = false
        }, 100)
      }
      setNormalized(nx, ny) {
        this.coords.set(nx, ny)
        this.mouseMoved = true
      }
      onDocumentMouseMove(event) {
        if (!this.updateHoverState(event.clientX, event.clientY)) return
        if (this.onInteract) this.onInteract()
        if (this.isAutoActive && !this.hasUserControl && !this.takeoverActive) {
          if (!this.container) return
          const rect = this.container.getBoundingClientRect()
          if (rect.width === 0 || rect.height === 0) return
          const nx = (event.clientX - rect.left) / rect.width
          const ny = (event.clientY - rect.top) / rect.height
          this.takeoverFrom.copy(this.coords)
          this.takeoverTo.set(nx * 2 - 1, -(ny * 2 - 1))
          this.takeoverStartTime = performance.now()
          this.takeoverActive = true
          this.hasUserControl = true
          this.isAutoActive = false
          return
        }
        this.setCoords(event.clientX, event.clientY)
        this.hasUserControl = true
      }
      onDocumentTouchStart(event) {
        if (event.touches.length !== 1) return
        const t = event.touches[0]
        if (!this.updateHoverState(t.clientX, t.clientY)) return
        if (this.onInteract) this.onInteract()
        this.setCoords(t.clientX, t.clientY)
        this.hasUserControl = true
      }
      onDocumentTouchMove(event) {
        if (event.touches.length !== 1) return
        const t = event.touches[0]
        if (!this.updateHoverState(t.clientX, t.clientY)) return
        if (this.onInteract) this.onInteract()
        this.setCoords(t.clientX, t.clientY)
        this.hasUserControl = true
      }
      onTouchEnd() {
        this.isHoverInside = false
      }
      onDocumentLeave() {
        this.isHoverInside = false
      }
      update() {
        if (this.takeoverActive) {
          const t = (performance.now() - this.takeoverStartTime) / (this.takeoverDuration * 1000)
          if (t >= 1) {
            this.takeoverActive = false
            this.coords.copy(this.takeoverTo)
            this.coords_old.copy(this.coords)
            this.diff.set(0, 0)
          } else {
            const k = t * t * (3 - 2 * t)
            this.coords.copy(this.takeoverFrom).lerp(this.takeoverTo, k)
          }
        }
        this.diff.subVectors(this.coords, this.coords_old)
        this.coords_old.copy(this.coords)
        if (this.coords_old.x === 0 && this.coords_old.y === 0) this.diff.set(0, 0)
        if (this.isAutoActive && !this.takeoverActive) this.diff.multiplyScalar(this.autoIntensity)
      }
    }
    const Mouse = new MouseClass()

    class AutoDriverClass {
      constructor(mouse, manager, opts) {
        this.mouse = mouse
        this.manager = manager
        this.enabled = opts.enabled
        this.speed = opts.speed
        this.resumeDelay = opts.resumeDelay || 3000
        this.rampDurationMs = (opts.rampDuration || 0) * 1000
        this.active = false
        this.current = new THREE.Vector2(0, 0)
        this.target = new THREE.Vector2()
        this.lastTime = performance.now()
        this.activationTime = 0
        this.margin = 0.2
        this._tmpDir = new THREE.Vector2()
        this.pickNewTarget()
      }
      pickNewTarget() {
        const r = Math.random
        this.target.set((r() * 2 - 1) * (1 - this.margin), (r() * 2 - 1) * (1 - this.margin))
      }
      forceStop() {
        this.active = false
        this.mouse.isAutoActive = false
      }
      update() {
        if (!this.enabled) return
        const now = performance.now()
        const idle = now - this.manager.lastUserInteraction
        if (idle < this.resumeDelay) {
          if (this.active) this.forceStop()
          return
        }
        if (this.mouse.isHoverInside) {
          if (this.active) this.forceStop()
          return
        }
        if (!this.active) {
          this.active = true
          this.current.copy(this.mouse.coords)
          this.lastTime = now
          this.activationTime = now
        }
        if (!this.active) return
        this.mouse.isAutoActive = true
        let dtSec = (now - this.lastTime) / 1000
        this.lastTime = now
        if (dtSec > 0.2) dtSec = 0.016
        const dir = this._tmpDir.subVectors(this.target, this.current)
        const dist = dir.length()
        if (dist < 0.01) {
          this.pickNewTarget()
          return
        }
        dir.normalize()
        let ramp = 1
        if (this.rampDurationMs > 0) {
          const t = Math.min(1, (now - this.activationTime) / this.rampDurationMs)
          ramp = t * t * (3 - 2 * t)
        }
        const step = this.speed * dtSec * ramp
        const move = Math.min(step, dist)
        this.current.addScaledVector(dir, move)
        this.mouse.setNormalized(this.current.x, this.current.y)
      }
    }

    // Interaction Tracker
    const interactionManager = {
      lastUserInteraction: 0,
      trigger() {
        this.lastUserInteraction = performance.now()
      }
    }
    Mouse.onInteract = () => interactionManager.trigger()

    const driver = new AutoDriverClass(Mouse, interactionManager, {
      enabled: autoDemo,
      speed: autoSpeed,
      resumeDelay: autoResumeDelay,
      rampDuration: autoRampDuration
    })

    // SHADERS GLSL CODE DEFINITIONS
    const face_vert = `
      attribute vec3 position;
      uniform vec2 px;
      uniform vec2 boundarySpace;
      varying vec2 uv;
      precision highp float;
      void main(){
        vec3 pos = position;
        vec2 scale = 1.0 - boundarySpace * 2.0;
        pos.xy = pos.xy * scale;
        uv = vec2(0.5)+(pos.xy)*0.5;
        gl_Position = vec4(pos, 1.0);
      }
    `
    const line_vert = `
      attribute vec3 position;
      uniform vec2 px;
      precision highp float;
      varying vec2 uv;
      void main(){
        vec3 pos = position;
        uv = 0.5 + pos.xy * 0.5;
        vec2 n = sign(pos.xy);
        pos.xy = abs(pos.xy) - px * 1.0;
        pos.xy *= n;
        gl_Position = vec4(pos, 1.0);
      }
    `
    const mouse_vert = `
      precision highp float;
      attribute vec3 position;
      attribute vec2 uv;
      uniform vec2 center;
      uniform vec2 scale;
      uniform vec2 px;
      varying vec2 vUv;
      void main(){
        vec2 pos = position.xy * scale * 2.0 * px + center;
        vUv = uv;
        gl_Position = vec4(pos, 0.0, 1.0);
      }
    `
    const advection_frag = `
      precision highp float;
      uniform sampler2D velocity;
      uniform float dt;
      uniform bool isBFECC;
      uniform vec2 fboSize;
      uniform vec2 px;
      varying vec2 uv;
      void main(){
        vec2 ratio = max(fboSize.x, fboSize.y) / fboSize;
        if(isBFECC == false){
            vec2 vel = texture2D(velocity, uv).xy;
            vec2 uv2 = uv - vel * dt * ratio;
            vec2 newVel = texture2D(velocity, uv2).xy;
            gl_FragColor = vec4(newVel, 0.0, 0.0);
        } else {
            vec2 spot_new = uv;
            vec2 vel_old = texture2D(velocity, uv).xy;
            vec2 spot_old = spot_new - vel_old * dt * ratio;
            vec2 vel_new1 = texture2D(velocity, spot_old).xy;
            vec2 spot_new2 = spot_old + vel_new1 * dt * ratio;
            vec2 error = spot_new2 - spot_new;
            vec2 spot_new3 = spot_new - error / 2.0;
            vec2 vel_2 = texture2D(velocity, spot_new3).xy;
            vec2 spot_old2 = spot_new3 - vel_2 * dt * ratio;
            vec2 newVel2 = texture2D(velocity, spot_old2).xy; 
            gl_FragColor = vec4(newVel2, 0.0, 0.0);
        }
      }
    `
    const color_frag = `
      precision highp float;
      uniform sampler2D velocity;
      uniform sampler2D palette;
      uniform vec4 bgColor;
      varying vec2 uv;
      void main(){
        vec2 vel = texture2D(velocity, uv).xy;
        float lenv = clamp(length(vel), 0.0, 1.0);
        vec3 c = texture2D(palette, vec2(lenv, 0.5)).rgb;
        vec3 outRGB = mix(bgColor.rgb, c, lenv);
        float outA = mix(bgColor.a, 1.0, lenv);
        gl_FragColor = vec4(outRGB, outA);
      }
    `
    const divergence_frag = `
      precision highp float;
      uniform sampler2D velocity;
      uniform float dt;
      uniform vec2 px;
      varying vec2 uv;
      void main(){
        float x0 = texture2D(velocity, uv-vec2(px.x, 0.0)).x;
        float x1 = texture2D(velocity, uv+vec2(px.x, 0.0)).x;
        float y0 = texture2D(velocity, uv-vec2(0.0, px.y)).y;
        float y1 = texture2D(velocity, uv+vec2(0.0, px.y)).y;
        float divergence = (x1 - x0 + y1 - y0) / 2.0;
        gl_FragColor = vec4(divergence / dt, 0.0, 0.0, 1.0);
      }
    `
    const externalForce_frag = `
      precision highp float;
      uniform vec2 force;
      uniform vec2 center;
      uniform vec2 scale;
      uniform vec2 px;
      varying vec2 vUv;
      void main(){
        vec2 circle = (vUv - 0.5) * 2.0;
        float d = 1.0 - min(length(circle), 1.0);
        d *= d;
        gl_FragColor = vec4(force * d, 0.0, 1.0);
      }
    `
    const poisson_frag = `
      precision highp float;
      uniform sampler2D pressure;
      uniform sampler2D divergence;
      uniform vec2 px;
      varying vec2 uv;
      void main(){
        float p0 = texture2D(pressure, uv + vec2(px.x * 2.0, 0.0)).r;
        float p1 = texture2D(pressure, uv - vec2(px.x * 2.0, 0.0)).r;
        float p2 = texture2D(pressure, uv + vec2(0.0, px.y * 2.0)).r;
        float p3 = texture2D(pressure, uv - vec2(0.0, px.y * 2.0)).r;
        float div = texture2D(divergence, uv).r;
        float newP = (p0 + p1 + p2 + p3) / 4.0 - div;
        gl_FragColor = vec4(newP, 0.0, 0.0, 1.0);
      }
    `
    const pressure_frag = `
      precision highp float;
      uniform sampler2D pressure;
      uniform sampler2D velocity;
      uniform vec2 px;
      uniform float dt;
      varying vec2 uv;
      void main(){
        float step = 1.0;
        float p0 = texture2D(pressure, uv + vec2(px.x * step, 0.0)).r;
        float p1 = texture2D(pressure, uv - vec2(px.x * step, 0.0)).r;
        float p2 = texture2D(pressure, uv + vec2(0.0, px.y * step)).r;
        float p3 = texture2D(pressure, uv - vec2(0.0, px.y * step)).r;
        vec2 v = texture2D(velocity, uv).xy;
        vec2 gradP = vec2(p0 - p1, p2 - p3) * 0.5;
        v = v - gradP * dt;
        gl_FragColor = vec4(v, 0.0, 1.0);
      }
    `
    const viscous_frag = `
      precision highp float;
      uniform sampler2D velocity;
      uniform sampler2D velocity_new;
      uniform float v;
      uniform vec2 px;
      uniform float dt;
      varying vec2 uv;
      void main(){
        vec2 old = texture2D(velocity, uv).xy;
        vec2 new0 = texture2D(velocity_new, uv + vec2(px.x * 2.0, 0.0)).xy;
        vec2 new1 = texture2D(velocity_new, uv - vec2(px.x * 2.0, 0.0)).xy;
        vec2 new2 = texture2D(velocity_new, uv + vec2(0.0, px.y * 2.0)).xy;
        vec2 new3 = texture2D(velocity_new, uv - vec2(0.0, px.y * 2.0)).xy;
        vec2 newv = 4.0 * old + v * dt * (new0 + new1 + new2 + new3);
        gl_FragColor = vec4(newv / (4.0 * (1.0 + v * dt)), 0.0, 1.0);
      }
    `

    // Simulation Engine Initialization
    Common.init(mountRef.current)
    Mouse.init(mountRef.current)
    Mouse.autoIntensity = autoIntensity
    Mouse.takeoverDuration = takeoverDuration

    const container = mountRef.current
    webglRef.current = Common.renderer.domElement
    container.appendChild(webglRef.current)

    // Setup Orthographic Camera & Scene
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)
    const scene = new THREE.Scene()

    // Screen Quad geometry
    const planeGeo = new THREE.BufferGeometry()
    const vertices = new Float32Array([
      -1.0, -1.0, 0.0,
       1.0, -1.0, 0.0,
      -1.0,  1.0, 0.0,
      -1.0,  1.0, 0.0,
       1.0, -1.0, 0.0,
       1.0,  1.0, 0.0
    ])
    planeGeo.setAttribute('position', new THREE.BufferAttribute(vertices, 3))

    // Initialize FBO render targets (with floating point format)
    const fboWidth = Math.floor(Common.width * resolution)
    const fboHeight = Math.floor(Common.height * resolution)
    Common.fboWidth = fboWidth
    Common.fboHeight = fboHeight

    const renderTargetOptions = {
      type: THREE.HalfFloatType,
      format: THREE.RGBAFormat,
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      depthBuffer: false,
      stencilBuffer: false
    }

    let velocityFBO1 = new THREE.WebGLRenderTarget(fboWidth, fboHeight, renderTargetOptions)
    let velocityFBO2 = new THREE.WebGLRenderTarget(fboWidth, fboHeight, renderTargetOptions)
    let pressureFBO1 = new THREE.WebGLRenderTarget(fboWidth, fboHeight, renderTargetOptions)
    let pressureFBO2 = new THREE.WebGLRenderTarget(fboWidth, fboHeight, renderTargetOptions)
    let divergenceFBO = new THREE.WebGLRenderTarget(fboWidth, fboHeight, renderTargetOptions)

    // Setup RawShaderMaterials with proper uniforms
    const advectionMat = new THREE.RawShaderMaterial({
      vertexShader: face_vert,
      fragmentShader: advection_frag,
      uniforms: {
        velocity: { value: null },
        dt: { value: dt },
        isBFECC: { value: BFECC },
        fboSize: { value: new THREE.Vector2(fboWidth, fboHeight) },
        px: { value: new THREE.Vector2(1.0 / fboWidth, 1.0 / fboHeight) },
        boundarySpace: { value: new THREE.Vector2(0, 0) }
      },
      depthWrite: false,
      depthTest: false
    })

    const divergenceMat = new THREE.RawShaderMaterial({
      vertexShader: face_vert,
      fragmentShader: divergence_frag,
      uniforms: {
        velocity: { value: null },
        dt: { value: dt },
        px: { value: new THREE.Vector2(1.0 / fboWidth, 1.0 / fboHeight) },
        boundarySpace: { value: new THREE.Vector2(0, 0) }
      },
      depthWrite: false,
      depthTest: false
    })

    const poissonMat = new THREE.RawShaderMaterial({
      vertexShader: face_vert,
      fragmentShader: poisson_frag,
      uniforms: {
        pressure: { value: null },
        divergence: { value: null },
        px: { value: new THREE.Vector2(1.0 / fboWidth, 1.0 / fboHeight) },
        boundarySpace: { value: new THREE.Vector2(0, 0) }
      },
      depthWrite: false,
      depthTest: false
    })

    const pressureMat = new THREE.RawShaderMaterial({
      vertexShader: face_vert,
      fragmentShader: pressure_frag,
      uniforms: {
        pressure: { value: null },
        velocity: { value: null },
        px: { value: new THREE.Vector2(1.0 / fboWidth, 1.0 / fboHeight) },
        dt: { value: dt },
        boundarySpace: { value: new THREE.Vector2(0, 0) }
      },
      depthWrite: false,
      depthTest: false
    })

    const viscousMat = new THREE.RawShaderMaterial({
      vertexShader: face_vert,
      fragmentShader: viscous_frag,
      uniforms: {
        velocity: { value: null },
        velocity_new: { value: null },
        v: { value: viscous },
        px: { value: new THREE.Vector2(1.0 / fboWidth, 1.0 / fboHeight) },
        dt: { value: dt },
        boundarySpace: { value: new THREE.Vector2(0, 0) }
      },
      depthWrite: false,
      depthTest: false
    })

    const externalForceMat = new THREE.RawShaderMaterial({
      vertexShader: mouse_vert,
      fragmentShader: externalForce_frag,
      uniforms: {
        force: { value: new THREE.Vector2() },
        center: { value: new THREE.Vector2() },
        scale: { value: new THREE.Vector2() },
        px: { value: new THREE.Vector2(1.0 / Common.width, 1.0 / Common.height) }
      },
      depthWrite: false,
      depthTest: false,
      blending: THREE.AdditiveBlending,
      transparent: true
    })

    const displayMat = new THREE.RawShaderMaterial({
      vertexShader: face_vert,
      fragmentShader: color_frag,
      uniforms: {
        velocity: { value: null },
        palette: { value: paletteTex },
        bgColor: { value: bgVec4 },
        boundarySpace: { value: new THREE.Vector2(0, 0) }
      },
      depthWrite: false,
      depthTest: false
    })

    // Setup display Mesh and scene wrapper
    const displayMesh = new THREE.Mesh(planeGeo, displayMat)
    scene.add(displayMesh)

    // Setup Force Injection geometries (circle plane for brush stamp)
    const mouseGeo = new THREE.BufferGeometry()
    const mVertices = new Float32Array([
      -1.0, -1.0, 0.0,
       1.0, -1.0, 0.0,
      -1.0,  1.0, 0.0,
      -1.0,  1.0, 0.0,
       1.0, -1.0, 0.0,
       1.0,  1.0, 0.0
    ])
    const mUvs = new Float32Array([
      0.0, 0.0,
      1.0, 0.0,
      0.0, 1.0,
      0.0, 1.0,
      1.0, 0.0,
      1.0, 1.0
    ])
    mouseGeo.setAttribute('position', new THREE.BufferAttribute(mVertices, 3))
    mouseGeo.setAttribute('uv', new THREE.BufferAttribute(mUvs, 2))

    const mouseMesh = new THREE.Mesh(mouseGeo, externalForceMat)
    const mouseScene = new THREE.Scene()
    mouseScene.add(mouseMesh)

    // Clear pressures helper
    function clearFBO(renderer, target) {
      renderer.setRenderTarget(target)
      renderer.clear()
    }
    clearFBO(Common.renderer, pressureFBO1)
    clearFBO(Common.renderer, pressureFBO2)

    // Simulation Step execution
    function stepSimulation() {
      const renderer = Common.renderer

      // 1. Advection
      advectionMat.uniforms.velocity.value = velocityFBO1.texture
      displayMesh.material = advectionMat
      renderer.setRenderTarget(velocityFBO2)
      renderer.render(scene, camera)
      
      // Swap FBOs
      let temp = velocityFBO1
      velocityFBO1 = velocityFBO2
      velocityFBO2 = temp

      // 2. Viscous Diffusion
      if (isViscous) {
        viscousMat.uniforms.velocity.value = velocityFBO1.texture
        for (let i = 0; i < iterationsViscous; i++) {
          viscousMat.uniforms.velocity_new.value = velocityFBO2.texture
          displayMesh.material = viscousMat
          renderer.setRenderTarget(velocityFBO2)
          renderer.render(scene, camera)

          let tempV = velocityFBO1
          velocityFBO1 = velocityFBO2
          velocityFBO2 = tempV
        }
      }

      // 3. Inject External Forces
      if (Mouse.diff.lengthSq() > 0.000001) {
        // Calculate force vector scaled by screen parameters
        const forceX = Mouse.diff.x * mouseForce * Common.aspect
        const forceY = Mouse.diff.y * mouseForce
        
        externalForceMat.uniforms.force.value.set(forceX, forceY)
        externalForceMat.uniforms.center.value.copy(Mouse.coords)
        externalForceMat.uniforms.scale.value.set(
          cursorSize / Common.width,
          cursorSize / Common.height
        )
        externalForceMat.uniforms.px.value.set(1.0 / Common.width, 1.0 / Common.height)

        renderer.setRenderTarget(velocityFBO1)
        renderer.render(mouseScene, camera)
      }

      // 4. Calculate Divergence
      divergenceMat.uniforms.velocity.value = velocityFBO1.texture
      displayMesh.material = divergenceMat
      renderer.setRenderTarget(divergenceFBO)
      renderer.render(scene, camera)

      // 5. Solve pressure Poisson equation
      clearFBO(renderer, pressureFBO2) // reset pressure
      for (let i = 0; i < iterationsPoisson; i++) {
        poissonMat.uniforms.pressure.value = pressureFBO1.texture
        poissonMat.uniforms.divergence.value = divergenceFBO.texture
        displayMesh.material = poissonMat
        renderer.setRenderTarget(pressureFBO2)
        renderer.render(scene, camera)

        let tempP = pressureFBO1
        pressureFBO1 = pressureFBO2
        pressureFBO2 = tempP
      }

      // 6. Subtract Pressure Gradient
      pressureMat.uniforms.pressure.value = pressureFBO1.texture
      pressureMat.uniforms.velocity.value = velocityFBO1.texture
      displayMesh.material = pressureMat
      renderer.setRenderTarget(velocityFBO2)
      renderer.render(scene, camera)

      let tempFinal = velocityFBO1
      velocityFBO1 = velocityFBO2
      velocityFBO2 = tempFinal

      // Boundary clamp if bounce enabled
      if (isBounce) {
        // Simple velocity bounding can be added or handled in shaders
      }
    }

    // Loop Frame update
    function renderFrame() {
      if (!isVisibleRef.current) {
        rafRef.current = requestAnimationFrame(renderFrame)
        return
      }

      Common.update()
      driver.update()
      Mouse.update()

      stepSimulation()

      // Render Display Mat directly to screen
      displayMat.uniforms.velocity.value = velocityFBO1.texture
      displayMesh.material = displayMat
      Common.renderer.setRenderTarget(null)
      Common.renderer.render(scene, camera)

      rafRef.current = requestAnimationFrame(renderFrame)
    }

    rafRef.current = requestAnimationFrame(renderFrame)

    // Resize handlers with debounce Observer
    resizeObserverRef.current = new ResizeObserver((entries) => {
      if (resizeRafRef.current) cancelAnimationFrame(resizeRafRef.current)
      resizeRafRef.current = requestAnimationFrame(() => {
        if (!entries || entries.length === 0) return
        Common.resize()

        // Recreate target buffers with new sizes
        const newFboW = Math.floor(Common.width * resolution)
        const newFboH = Math.floor(Common.height * resolution)
        Common.fboWidth = newFboW
        Common.fboHeight = newFboH

        const w = newFboW
        const h = newFboH

        velocityFBO1.setSize(w, h)
        velocityFBO2.setSize(w, h)
        pressureFBO1.setSize(w, h)
        pressureFBO2.setSize(w, h)
        divergenceFBO.setSize(w, h)

        advectionMat.uniforms.fboSize.value.set(w, h)
        advectionMat.uniforms.px.value.set(1.0 / w, 1.0 / h)
        divergenceMat.uniforms.px.value.set(1.0 / w, 1.0 / h)
        poissonMat.uniforms.px.value.set(1.0 / w, 1.0 / h)
        pressureMat.uniforms.px.value.set(1.0 / w, 1.0 / h)
        viscousMat.uniforms.px.value.set(1.0 / w, 1.0 / h)
      })
    })
    resizeObserverRef.current.observe(mountRef.current)

    // Intersection observer to pause simulation when out of viewport
    intersectionObserverRef.current = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        isVisibleRef.current = e.isIntersecting
      })
    })
    intersectionObserverRef.current.observe(mountRef.current)

    // Cleanup resources
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      if (resizeRafRef.current) cancelAnimationFrame(resizeRafRef.current)
      if (resizeObserverRef.current) resizeObserverRef.current.disconnect()
      if (intersectionObserverRef.current) intersectionObserverRef.current.disconnect()

      Mouse.dispose()

      paletteTex.dispose()
      planeGeo.dispose()
      mouseGeo.dispose()
      
      advectionMat.dispose()
      divergenceMat.dispose()
      poissonMat.dispose()
      pressureMat.dispose()
      viscousMat.dispose()
      externalForceMat.dispose()
      displayMat.dispose()

      velocityFBO1.dispose()
      velocityFBO2.dispose()
      pressureFBO1.dispose()
      pressureFBO2.dispose()
      divergenceFBO.dispose()

      if (Common.renderer) {
        if (webglRef.current && webglRef.current.parentElement) {
          webglRef.current.parentElement.removeChild(webglRef.current)
        }
        Common.renderer.dispose()
      }
    }
  }, [
    colors,
    mouseForce,
    cursorSize,
    isViscous,
    viscous,
    iterationsViscous,
    iterationsPoisson,
    resolution,
    isBounce,
    dt,
    BFECC,
    autoDemo,
    autoSpeed,
    autoIntensity,
    takeoverDuration,
    autoResumeDelay,
    autoRampDuration
  ])

  return (
    <div
      ref={mountRef}
      style={{
        ...style,
        position: 'relative',
        width: '100%',
        height: '100%',
        touchAction: 'none'
      }}
      className={`liquid-ether-container ${className}`}
    />
  )
}
