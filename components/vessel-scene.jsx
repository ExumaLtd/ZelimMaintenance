'use client';

import { Suspense, useRef, useState, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, useGLTF, Center, Html, useProgress } from '@react-three/drei';
import * as THREE from 'three';

/* ─── Loading spinner shown while GLB streams in ─────────────────────────── */
function Loader() {
  const { progress } = useProgress();
  return (
    <Html center>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
        <div style={spinnerStyle} />
        <span style={{ color: '#bdc4c6', fontSize: 13, fontFamily: 'Montserrat, sans-serif' }}>
          {Math.round(progress)}%
        </span>
      </div>
    </Html>
  );
}

const spinnerStyle = {
  width: 40,
  height: 40,
  borderRadius: '50%',
  border: '3px solid rgba(189,196,198,0.15)',
  borderTopColor: '#bdc4c6',
  animation: 'spin 0.8s linear infinite',
};

/* ─── Actual GLB model ───────────────────────────────────────────────────── */
function ShipModel() {
  const { scene } = useGLTF('/ship.glb');

  useEffect(() => {
    scene.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
        if (child.material) child.material.needsUpdate = true;
      }
    });
  }, [scene]);

  return (
    <Center>
      <primitive object={scene} />
    </Center>
  );
}

/* ─── Placeholder box shown when ship.glb doesn't exist yet ─────────────── */
function PlaceholderShip() {
  const meshRef = useRef();
  useFrame((_, delta) => {
    if (meshRef.current) meshRef.current.rotation.y += delta * 0.3;
  });
  return (
    <group>
      {/* Hull */}
      <mesh ref={meshRef} position={[0, 0, 0]} castShadow>
        <boxGeometry args={[3, 0.8, 9]} />
        <meshStandardMaterial color="#27454B" roughness={0.5} metalness={0.5} />
      </mesh>
      {/* Bridge */}
      <mesh position={[0, 0.9, -2]} castShadow>
        <boxGeometry args={[2, 1, 2.5]} />
        <meshStandardMaterial color="#1e3a40" roughness={0.5} metalness={0.4} />
      </mesh>
    </group>
  );
}

/* ─── Controls, auto-rotate stops on first pointer interaction ───────────── */
function Controls({ onInteract }) {
  const controlsRef = useRef();
  const interacted = useRef(false);

  useEffect(() => {
    const el = controlsRef.current?.domElement;
    if (!el) return;
    const stop = () => {
      if (!interacted.current) {
        interacted.current = true;
        if (controlsRef.current) controlsRef.current.autoRotate = false;
        onInteract?.();
      }
    };
    el.addEventListener('pointerdown', stop);
    return () => el.removeEventListener('pointerdown', stop);
  }, [onInteract]);

  return (
    <OrbitControls
      ref={controlsRef}
      enableDamping
      dampingFactor={0.08}
      autoRotate
      autoRotateSpeed={0.7}
      minDistance={4}
      maxDistance={80}
      enablePan={false}
    />
  );
}

/* ─── Main exported component ────────────────────────────────────────────── */
export default function VesselScene() {
  const [glbExists, setGlbExists] = useState(null); // null = probing
  const [hasInteracted, setHasInteracted] = useState(false);
  const [hintVisible, setHintVisible] = useState(true);

  useEffect(() => {
    fetch('/ship.glb', { method: 'HEAD' })
      .then((r) => setGlbExists(r.ok))
      .catch(() => setGlbExists(false));
  }, []);

  const handleInteract = () => {
    setHasInteracted(true);
    setTimeout(() => setHintVisible(false), 600);
  };

  return (
    <>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      {glbExists !== null && (
        <Canvas
          shadows
          camera={{ position: [0, 6, 20], fov: 45 }}
          gl={{
            antialias: true,
            toneMapping: THREE.ACESFilmicToneMapping,
            toneMappingExposure: 1.2,
          }}
          style={{ width: '100%', height: '100%' }}
        >
          {/* Lighting */}
          <ambientLight intensity={0.7} />
          <directionalLight position={[10, 15, 10]} intensity={1.4} castShadow />
          <directionalLight position={[-10, 5, -10]} intensity={0.5} />
          <hemisphereLight args={['#27454B', '#172F36', 0.4]} />

          {/* Model or placeholder */}
          <Suspense fallback={<Loader />}>
            {glbExists ? <ShipModel /> : <PlaceholderShip />}
          </Suspense>

          <Controls onInteract={handleInteract} />
        </Canvas>
      )}

      {/* Drag-to-rotate hint */}
      {hintVisible && (
        <div
          style={{
            ...hintStyle,
            opacity: hasInteracted ? 0 : 1,
            transition: 'opacity 0.6s ease',
          }}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            style={{ flexShrink: 0 }}
          >
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10" strokeLinecap="round" />
            <path
              d="M18 8l4-4m0 0l-4-4m4 4H14"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          Drag to rotate
        </div>
      )}

      {/* Placeholder notice */}
      {glbExists === false && (
        <div style={badgeStyle}>
          Placeholder, drop your model at{' '}
          <code style={{ fontFamily: 'monospace', background: 'rgba(255,255,255,0.1)', padding: '1px 5px', borderRadius: 3 }}>
            /public/ship.glb
          </code>
        </div>
      )}
    </>
  );
}

const hintStyle = {
  position: 'absolute',
  bottom: 32,
  left: '50%',
  transform: 'translateX(-50%)',
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  color: 'rgba(189,196,198,0.75)',
  fontSize: 13,
  fontFamily: 'Montserrat, sans-serif',
  letterSpacing: '0.04em',
  pointerEvents: 'none',
  userSelect: 'none',
};

const badgeStyle = {
  position: 'absolute',
  top: 16,
  left: '50%',
  transform: 'translateX(-50%)',
  background: 'rgba(39,69,75,0.6)',
  border: '1px solid rgba(189,196,198,0.15)',
  color: 'rgba(189,196,198,0.6)',
  fontSize: 12,
  fontFamily: 'Montserrat, sans-serif',
  padding: '6px 14px',
  borderRadius: 6,
  pointerEvents: 'none',
  whiteSpace: 'nowrap',
};
