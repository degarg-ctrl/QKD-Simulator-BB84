import { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Line, Sphere, Html } from '@react-three/drei';
import * as THREE from 'three';

// State vector arrow
function StateVector({ position, color = '#00ffff', label }) {
  const points = [
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(position[0], position[1], position[2])
  ];

  return (
    <group>
      <Line points={points} color={color} lineWidth={3} />
      <mesh position={position} rotation={[Math.PI / 2, 0, 0]}>
        <coneGeometry args={[0.08, 0.2, 8]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.5} />
      </mesh>
      {label && (
        <Html position={[position[0] * 1.2, position[1] * 1.2, position[2] * 1.2]} center>
          <div className="text-xs font-mono px-1 py-0.5 bg-gray-900/80 rounded" style={{ color }}>
            {label}
          </div>
        </Html>
      )}
    </group>
  );
}

// Axis line
function Axis({ start, end, color, label }) {
  const points = [
    new THREE.Vector3(...start),
    new THREE.Vector3(...end)
  ];

  return (
    <group>
      <Line points={points} color={color} lineWidth={1.5} opacity={0.4} transparent />
      <Html position={end} center>
        <div className="text-xs font-bold" style={{ color }}>
          {label}
        </div>
      </Html>
    </group>
  );
}

// Animated scene
function BlochScene({ gateType, animate }) {
  const groupRef = useRef();

  // Gate transformations
  const gateStates = {
    H: {
      before: [0, 0, 1],
      after: [1, 0, 0],
      beforeLabel: '|0⟩',
      afterLabel: '|+⟩'
    },
    X: {
      before: [0, 0, 1],
      after: [0, 0, -1],
      beforeLabel: '|0⟩',
      afterLabel: '|1⟩'
    },
    Y: {
      before: [0, 0, 1],
      after: [0, 0, -1],
      beforeLabel: '|0⟩',
      afterLabel: '|1⟩'
    },
    Z: {
      before: [1, 0, 0],
      after: [-1, 0, 0],
      beforeLabel: '|+⟩',
      afterLabel: '|-⟩'
    },
    S: {
      before: [1, 0, 0],
      after: [0, 1, 0],
      beforeLabel: '|+⟩',
      afterLabel: 'rotated'
    },
    T: {
      before: [1, 0, 0],
      after: [0.707, 0.707, 0],
      beforeLabel: '|+⟩',
      afterLabel: 'rotated'
    }
  };

  const state = gateStates[gateType] || gateStates.H;

  // Auto-rotate
  useFrame((_, delta) => {
    if (animate && groupRef.current) {
      groupRef.current.rotation.y += delta * 0.3;
    }
  });

  return (
    <>
      <ambientLight intensity={0.6} />
      <pointLight position={[5, 5, 5]} intensity={0.8} />
      <pointLight position={[-5, -5, -5]} intensity={0.3} />

      <group ref={groupRef}>
        {/* Sphere */}
        <Sphere args={[1, 32, 32]}>
          <meshPhysicalMaterial 
            color="#0a0a1a" 
            transparent 
            opacity={0.15}
            roughness={0.1}
            metalness={0.1}
          />
        </Sphere>

        {/* Wireframe */}
        <Sphere args={[1.01, 12, 12]}>
          <meshBasicMaterial 
            color="#00ccff" 
            wireframe 
            transparent 
            opacity={0.15}
          />
        </Sphere>

        {/* Axes */}
        <Axis start={[-1.4, 0, 0]} end={[1.4, 0, 0]} color="#ff6b6b" label="X" />
        <Axis start={[0, -1.4, 0]} end={[0, 1.4, 0]} color="#51cf66" label="Y" />
        <Axis start={[0, 0, -1.4]} end={[0, 0, 1.4]} color="#4dabf7" label="Z" />

        {/* State vectors */}
        <StateVector 
          position={state.before} 
          color="#ffd43b" 
          label={state.beforeLabel}
        />
        <StateVector 
          position={state.after} 
          color="#00ffff" 
          label={state.afterLabel}
        />
      </group>

      <OrbitControls 
        enableZoom={false} 
        enablePan={false}
        autoRotate={animate}
        autoRotateSpeed={1.5}
        minPolarAngle={Math.PI / 4}
        maxPolarAngle={Math.PI * 3 / 4}
      />
    </>
  );
}

export default function BlochSphere({ gateType = 'H', animate = true, size = 200 }) {
  return (
    <div style={{ width: size, height: size }}>
      <Canvas camera={{ position: [2.5, 2, 2.5], fov: 45 }}>
        <BlochScene gateType={gateType} animate={animate} />
      </Canvas>
    </div>
  );
}
