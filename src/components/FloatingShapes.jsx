import { useRef } from "react";
import { useFrame } from "@react-three/fiber";

function FloatingShape({ geometry, color, position, rotationSpeed = 1, hoverSpeed = 1, size = 1 }) {
  const meshRef = useRef();
  const initialY = position[1];
  const randomPhase = Math.random() * Math.PI * 2;

  useFrame((state) => {
    if (!meshRef.current) return;
    const t = state.clock.getElapsedTime();
    
    // Slow rotational movements
    meshRef.current.rotation.x += 0.003 * rotationSpeed;
    meshRef.current.rotation.y += 0.005 * rotationSpeed;
    meshRef.current.rotation.z += 0.002 * rotationSpeed;

    // Levitation offsets (floating sine wave)
    meshRef.current.position.y = initialY + Math.sin(t * 0.8 * hoverSpeed + randomPhase) * 0.18;
  });

  return (
    <mesh ref={meshRef} position={position} scale={[size, size, size]}>
      {geometry === "torus" ? (
        <torusGeometry args={[0.7, 0.22, 16, 100]} />
      ) : (
        <boxGeometry args={[1, 1, 1]} />
      )}
      
      {/* Light glassmorphism physical material matching the page theme */}
      <meshPhysicalMaterial
        color={color}
        roughness={0.15}
        metalness={0.1}
        transmission={0.7}
        thickness={1.2}
        clearcoat={1.0}
        clearcoatRoughness={0.1}
        transparent
        opacity={0.45}
      />
    </mesh>
  );
}

export default function FloatingShapes() {
  return (
    <group>
      {/* Light Glass Torus - Cyan theme (Top-Left) */}
      <FloatingShape
        geometry="torus"
        color="#0096c7"
        position={[-3.5, 1.8, -1]}
        rotationSpeed={1.2}
        hoverSpeed={1.1}
        size={1.1}
      />

      {/* Light Glass Box - Fuchsia/Magenta theme (Bottom-Right) */}
      <FloatingShape
        geometry="box"
        color="#b5179e"
        position={[3.2, -1.8, -1.2]}
        rotationSpeed={0.8}
        hoverSpeed={0.9}
        size={1.0}
      />

      {/* Auxiliary Torus (Top-Right) */}
      <FloatingShape
        geometry="torus"
        color="#7209b7"
        position={[3.8, 2.0, -2.5]}
        rotationSpeed={1.4}
        hoverSpeed={1.3}
        size={0.7}
      />
      
      {/* Auxiliary Box (Bottom-Left) */}
      <FloatingShape
        geometry="box"
        color="#00b4d8"
        position={[-4.0, -2.2, -2.2]}
        rotationSpeed={0.7}
        hoverSpeed={0.8}
        size={0.6}
      />
    </group>
  );
}
