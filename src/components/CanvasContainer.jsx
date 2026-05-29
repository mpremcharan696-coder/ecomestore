import { Canvas } from '@react-three/fiber'
import ParticlesBg from './ParticlesBg'
import FloatingShapes from './FloatingShapes'

export default function CanvasContainer({ isPortals, isAuth }) {
  return (
    <div className="webgl-canvas">
      <Canvas
        camera={{ position: [0, 0, 10], fov: 60 }}
        dpr={[1, 1.5]}
        gl={{ antialias: true, alpha: true }}
      >
        <ambientLight intensity={0.4} />
        <pointLight position={[10, 10, 10]} intensity={1.5} color="#00f0ff" />
        <pointLight position={[-10, -10, -10]} intensity={1} color="#ff007f" />
        
        {/* Particle System Dots */}
        <ParticlesBg isPortals={isPortals || isAuth} />
        
        {/* Immersive 3D Rotating Glass Geometric Shapes */}
        {isAuth && <FloatingShapes />}
      </Canvas>
    </div>
  )
}
