import { Canvas } from '@react-three/fiber'
import ParticlesBg from './ParticlesBg'

export default function CanvasContainer({ isPortals }) {
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
        <ParticlesBg isPortals={isPortals} />
      </Canvas>
    </div>
  )
}
