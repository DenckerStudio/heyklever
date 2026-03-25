"use client";

import { useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useHeroParticleProgressRef } from "@/components/landing/hero-particle-progress";

const COUNT = 960;

function hash01(i: number) {
  const x = Math.sin(i * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
}

function sampleSphere(i: number, radius: number, out: Float32Array, offset: number) {
  const u = hash01(i * 3 + 1);
  const v = hash01(i * 3 + 2);
  const theta = u * Math.PI * 2;
  const phi = Math.acos(2 * v - 1);
  const r = radius * (0.92 + 0.08 * hash01(i * 5));
  const sinP = Math.sin(phi);
  out[offset] = r * sinP * Math.cos(theta);
  out[offset + 1] = r * sinP * Math.sin(theta);
  out[offset + 2] = r * Math.cos(phi);
}

function sampleBrain(i: number, out: Float32Array, offset: number) {
  const side = i < COUNT * 0.52 ? -1 : 1;
  const u = hash01(i * 7 + 11);
  const v = hash01(i * 7 + 13);
  const w = hash01(i * 7 + 17);
  const theta = u * Math.PI * 2;
  const phi = Math.acos(2 * v - 1);
  const r = 0.42 + w * 0.38;
  const sinP = Math.sin(phi);
  const lx = r * sinP * Math.cos(theta);
  const ly = (w - 0.5) * 1.05;
  const lz = r * sinP * Math.sin(theta) * 0.82;
  const cx = side * 0.52;
  const cy = Math.sin(theta * 2 + side) * 0.08;
  out[offset] = cx + lx * 0.95;
  out[offset + 1] = ly * 0.9 + cy;
  out[offset + 2] = lz;
}

function sampleExplode(i: number, out: Float32Array, offset: number) {
  const u = hash01(i * 19 + 3);
  const v = hash01(i * 19 + 5);
  const w = hash01(i * 19 + 7);
  const theta = u * Math.PI * 2;
  const phi = Math.acos(2 * v - 1);
  const sinP = Math.sin(phi);
  const dirX = sinP * Math.cos(theta);
  const dirY = sinP * Math.sin(theta);
  const dirZ = Math.cos(phi);
  const mag = 2.4 + w * 5.5;
  out[offset] = dirX * mag;
  out[offset + 1] = dirY * mag;
  out[offset + 2] = dirZ * mag;
}

function MorphParticles() {
  const mesh = useRef<THREE.Points>(null!);
  const progressRef = useHeroParticleProgressRef();

  const { sphere, brain, explode, positions } = useMemo(() => {
    const sphere = new Float32Array(COUNT * 3);
    const brain = new Float32Array(COUNT * 3);
    const explode = new Float32Array(COUNT * 3);
    for (let i = 0; i < COUNT; i++) {
      const o = i * 3;
      sampleBrain(i, brain, o);
      sampleSphere(i, 2.05, sphere, o);
      sampleExplode(i, explode, o);
    }
    const positions = new Float32Array(brain);
    return { sphere, brain, explode, positions };
  }, []);

  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    return geo;
  }, [positions]);

  useFrame(({ clock }) => {
    if (!mesh.current) return;
    const p = THREE.MathUtils.clamp(progressRef.current, 0, 1);
    const toPlanet = THREE.MathUtils.smoothstep(p, 0.2, 0.48);
    const explodeAmt = THREE.MathUtils.smoothstep(p, 0.58, 0.92);
    const t = clock.elapsedTime;

    const groupSpin = (1 - explodeAmt) * t * 0.22;
    const wobble = (1 - explodeAmt) * 0.04;
    const cos = Math.cos(groupSpin);
    const sin = Math.sin(groupSpin);

    const geo = mesh.current.geometry;
    const posAttr = geo.getAttribute("position") as THREE.BufferAttribute;

    for (let i = 0; i < COUNT; i++) {
      const o = i * 3;
      let bx = brain[o];
      let by = brain[o + 1];
      let bz = brain[o + 2];
      const sx = sphere[o];
      const sy = sphere[o + 1];
      const sz = sphere[o + 2];
      let x = bx + (sx - bx) * toPlanet;
      let y = by + (sy - by) * toPlanet;
      let z = bz + (sz - bz) * toPlanet;

      const ex = explode[o];
      const ey = explode[o + 1];
      const ez = explode[o + 2];
      x += (ex - x) * explodeAmt;
      y += (ey - y) * explodeAmt;
      z += (ez - z) * explodeAmt;

      if (explodeAmt < 0.98) {
        const n =
          Math.sin(t * 2.1 + i * 0.04) * wobble * (1 - explodeAmt) +
          Math.cos(t * 1.7 + i * 0.03) * wobble * 0.6 * (1 - toPlanet);
        x += n;
        y += Math.sin(t * 1.5 + i * 0.02) * wobble * 0.5 * (1 - explodeAmt);
        z += n * 0.5;
      }

      const rx = x * cos - z * sin;
      const rz = x * sin + z * cos;
      x = rx;
      z = rz;

      posAttr.setXYZ(i, x, y, z);
    }
    posAttr.needsUpdate = true;

    mesh.current.rotation.x = Math.sin(t * 0.25) * 0.12 * (1 - explodeAmt);
    mesh.current.rotation.y = t * 0.08 * (1 - explodeAmt) * 0.35;
  });

  return (
    <points ref={mesh} geometry={geometry}>
      <pointsMaterial
        size={0.038}
        color="#8b8cf5"
        transparent
        opacity={0.72}
        sizeAttenuation
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

export function ParticleSphere() {
  return (
    <div className="absolute inset-0 z-0">
      <Canvas
        camera={{ position: [0, 0, 6.2], fov: 42 }}
        dpr={[1, 1.5]}
        gl={{ antialias: true, alpha: true }}
        style={{ background: "transparent" }}
      >
        <MorphParticles />
      </Canvas>
    </div>
  );
}
