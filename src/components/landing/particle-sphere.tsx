"use client";

import { useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";

function Particles({ count = 4000 }) {
  const mesh = useRef<THREE.Points>(null!);

  const [positions, basePositions] = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const base = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = 2.2 + (Math.random() - 0.5) * 0.15;
      const x = r * Math.sin(phi) * Math.cos(theta);
      const y = r * Math.sin(phi) * Math.sin(theta);
      const z = r * Math.cos(phi);
      pos[i * 3] = x;
      pos[i * 3 + 1] = y;
      pos[i * 3 + 2] = z;
      base[i * 3] = x;
      base[i * 3 + 1] = y;
      base[i * 3 + 2] = z;
    }
    return [pos, base];
  }, [count]);

  useFrame(({ clock }) => {
    if (!mesh.current) return;
    const t = clock.getElapsedTime() * 0.15;
    mesh.current.rotation.y = t;
    mesh.current.rotation.x = Math.sin(t * 0.5) * 0.1;

    const geo = mesh.current.geometry;
    const posAttr = geo.getAttribute("position") as THREE.BufferAttribute;
    for (let i = 0; i < count; i++) {
      const bx = basePositions[i * 3];
      const by = basePositions[i * 3 + 1];
      const bz = basePositions[i * 3 + 2];
      const noise = Math.sin(t * 2 + i * 0.01) * 0.02;
      posAttr.setXYZ(i, bx + noise, by + noise * 0.5, bz);
    }
    posAttr.needsUpdate = true;
  });

  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    return geo;
  }, [positions]);

  return (
    <points ref={mesh} geometry={geometry}>
      <pointsMaterial
        size={0.015}
        color="#6366f1"
        transparent
        opacity={0.7}
        sizeAttenuation
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

function InnerRing({ count = 1500 }) {
  const mesh = useRef<THREE.Points>(null!);

  const geometry = useMemo(() => {
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = 1.4 + (Math.random() - 0.5) * 0.1;
      pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      pos[i * 3 + 2] = r * Math.cos(phi);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    return geo;
  }, [count]);

  useFrame(({ clock }) => {
    if (!mesh.current) return;
    const t = clock.getElapsedTime() * 0.1;
    mesh.current.rotation.y = -t;
    mesh.current.rotation.z = Math.cos(t * 0.3) * 0.15;
  });

  return (
    <points ref={mesh} geometry={geometry}>
      <pointsMaterial
        size={0.008}
        color="#a78bfa"
        transparent
        opacity={0.5}
        sizeAttenuation
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

function OrbitalRing() {
  const mesh = useRef<THREE.LineLoop>(null!);

  const geometry = useMemo(() => {
    const segmentCount = 256;
    const pos = new Float32Array(segmentCount * 3);
    for (let i = 0; i < segmentCount; i++) {
      const angle = (i / segmentCount) * Math.PI * 2;
      pos[i * 3] = Math.cos(angle) * 2.8;
      pos[i * 3 + 1] = Math.sin(angle) * 0.1;
      pos[i * 3 + 2] = Math.sin(angle) * 2.8;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    return geo;
  }, []);

  useFrame(({ clock }) => {
    if (!mesh.current) return;
    mesh.current.rotation.x = 0.4;
    mesh.current.rotation.y = clock.getElapsedTime() * 0.05;
  });

  return (
    <lineLoop ref={mesh} geometry={geometry}>
      <lineBasicMaterial color="#4f46e5" transparent opacity={0.15} />
    </lineLoop>
  );
}

export function ParticleSphere() {
  return (
    <div className="absolute inset-0 z-0">
      <Canvas
        camera={{ position: [0, 0, 6], fov: 45 }}
        dpr={[1, 1.5]}
        gl={{ antialias: true, alpha: true }}
        style={{ background: "transparent" }}
      >
        <ambientLight intensity={0.3} />
        <Particles />
        <InnerRing />
        <OrbitalRing />
      </Canvas>
    </div>
  );
}
