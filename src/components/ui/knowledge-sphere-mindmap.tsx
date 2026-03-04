"use client";

import React, {
  useRef,
  useState,
  useMemo,
  useCallback,
  useEffect,
  Suspense,
} from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, Html, Line } from "@react-three/drei";
import * as THREE from "three";
import { motion, AnimatePresence } from "framer-motion";
import gsap from "gsap";
import { cn } from "@/lib/utils";
import {
  Sparkles,
  FileText,
} from "lucide-react";
import { Button } from "./button";
import type { TopicData } from "./knowledge-visualization";
import { DocumentChunkViewer } from "./document-chunk-viewer";

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

interface KnowledgeSphereMindMapProps {
  topics: TopicData[];
  teamId: string;
  onTopicClick?: (topic: TopicData) => void;
  selectedTopic?: string | null;
  className?: string;
  isMinimal?: boolean;
}

interface TopicNode {
  id: string;
  topic: TopicData;
  position: THREE.Vector3;
  size: number;
  color: string;
  glowColor: string;
}

interface Connection {
  source: string;
  target: string;
  strength: number;
  type: "shared_docs" | "same_folder" | "related";
}

// ============================================================================
// CONSTANTS & HELPERS
// ============================================================================

const SPHERE_RADIUS = 3;
const MAX_TOPICS = 20; // Reduced for performance
const NODE_BASE_SIZE = 0.15;
const NODE_MAX_SIZE = 0.45;

// Color schemes for topics
const getTopicColors = (context: "public" | "private", index: number) => {
  const publicColors = [
    { solid: "#3B82F6", glow: "#60A5FA" }, // blue
    { solid: "#06B6D4", glow: "#22D3EE" }, // cyan
    { solid: "#0EA5E9", glow: "#38BDF8" }, // sky
    { solid: "#14B8A6", glow: "#2DD4BF" }, // teal
  ];
  const privateColors = [
    { solid: "#8B5CF6", glow: "#A78BFA" }, // violet
    { solid: "#A855F7", glow: "#C084FC" }, // purple
    { solid: "#D946EF", glow: "#E879F9" }, // fuchsia
    { solid: "#EC4899", glow: "#F472B6" }, // pink
  ];
  const colors = context === "public" ? publicColors : privateColors;
  return colors[index % colors.length];
};

// Fibonacci sphere distribution for even topic placement
function fibonacciSphere(
  index: number,
  total: number,
  radius: number
): THREE.Vector3 {
  const phi = Math.PI * (3 - Math.sqrt(5)); // golden angle
  const y = 1 - (index / (total - 1)) * 2; // y goes from 1 to -1
  const radiusAtY = Math.sqrt(1 - y * y);
  const theta = phi * index;

  return new THREE.Vector3(
    Math.cos(theta) * radiusAtY * radius,
    y * radius,
    Math.sin(theta) * radiusAtY * radius
  );
}

// Generate bezier curve points for connections
function generateCurvePoints(
  start: THREE.Vector3,
  end: THREE.Vector3,
  segments: number = 20 // Reduced from 50 for performance
): THREE.Vector3[] {
  const points: THREE.Vector3[] = [];
  const midPoint = new THREE.Vector3()
    .addVectors(start, end)
    .multiplyScalar(0.5);

  // Push the curve outward from the sphere center
  const distFromCenter = midPoint.length();
  const pushOutFactor = 1.3 + (SPHERE_RADIUS - distFromCenter) * 0.15;
  midPoint.multiplyScalar(pushOutFactor);

  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const point = new THREE.Vector3();

    // Quadratic bezier
    const oneMinusT = 1 - t;
    point.x =
      oneMinusT * oneMinusT * start.x +
      2 * oneMinusT * t * midPoint.x +
      t * t * end.x;
    point.y =
      oneMinusT * oneMinusT * start.y +
      2 * oneMinusT * t * midPoint.y +
      t * t * end.y;
    point.z =
      oneMinusT * oneMinusT * start.z +
      2 * oneMinusT * t * midPoint.z +
      t * t * end.z;

    points.push(point);
  }

  return points;
}

// ============================================================================
// 3D COMPONENTS
// ============================================================================

// Central glowing sphere with animated effects and GSAP enhancements
function CentralSphere({ 
  isInteracting, 
  isPaused 
}: { 
  isInteracting: boolean;
  isPaused: boolean;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const wireframeRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);
  const innerGlowRef = useRef<THREE.Mesh>(null);
  const particleRingRef = useRef<THREE.Points>(null);
  const groupRef = useRef<THREE.Group>(null);

  // GSAP animation on mount
  useEffect(() => {
    if (groupRef.current) {
      gsap.fromTo(
        groupRef.current.scale,
        { x: 0, y: 0, z: 0 },
        { 
          x: 1, 
          y: 1, 
          z: 1, 
          duration: 1.2, 
          ease: "elastic.out(1, 0.5)",
          delay: 0.2
        }
      );
    }
  }, []);

  // Create particle ring geometry
  const particleRingGeometry = useMemo(() => {
    const particleCount = 40; // Reduced from 100 for performance
    const positions = new Float32Array(particleCount * 3);
    
    for (let i = 0; i < particleCount; i++) {
      const angle = (i / particleCount) * Math.PI * 2;
      const radius = SPHERE_RADIUS * 1.1;
      positions[i * 3] = Math.cos(angle) * radius;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 0.3;
      positions[i * 3 + 2] = Math.sin(angle) * radius;
    }
    
    return positions;
  }, []);

  useFrame((state) => {
    if (isPaused) return;
    
    // Slowed down animations for smoother experience
    const speed = isInteracting ? 0.008 : 0.025;

    if (meshRef.current) {
      meshRef.current.rotation.y += speed * 0.4;
      meshRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.1) * 0.05;
    }
    if (wireframeRef.current) {
      wireframeRef.current.rotation.y -= speed * 0.25;
      wireframeRef.current.rotation.z = Math.cos(state.clock.elapsedTime * 0.08) * 0.03;
    }
    if (glowRef.current) {
      const pulse = 1 + Math.sin(state.clock.elapsedTime * 0.8) * 0.02;
      glowRef.current.scale.setScalar(pulse);
    }
    if (innerGlowRef.current) {
      const innerPulse = 1 + Math.sin(state.clock.elapsedTime * 1.2) * 0.06;
      innerGlowRef.current.scale.setScalar(innerPulse);
      (innerGlowRef.current.material as THREE.MeshBasicMaterial).opacity = 
        0.15 + Math.sin(state.clock.elapsedTime * 0.8) * 0.05;
    }
    if (particleRingRef.current) {
      particleRingRef.current.rotation.y += speed * 0.15;
      particleRingRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.15) * 0.05;
    }
  });

  return (
    <group ref={groupRef}>
      {/* Outer glow */}
      <mesh ref={glowRef}>
        <sphereGeometry args={[SPHERE_RADIUS * 1.15, 32, 32]} />
        <meshBasicMaterial
          color="#3B82F6"
          transparent
          opacity={0.04}
          side={THREE.BackSide}
        />
      </mesh>

      {/* Main sphere with gradient effect */}
      <mesh ref={meshRef}>
        <sphereGeometry args={[SPHERE_RADIUS * 0.95, 64, 64]} />
        <meshStandardMaterial
          color="#0f172a"
          emissive="#1e293b"
          emissiveIntensity={0.3}
          metalness={0.8}
          roughness={0.4}
          transparent
          opacity={0.6}
        />
      </mesh>

      {/* Wireframe overlay */}
      <mesh ref={wireframeRef}>
        <icosahedronGeometry args={[SPHERE_RADIUS * 0.98, 2]} />
        <meshBasicMaterial
          color="#3B82F6"
          wireframe
          transparent
          opacity={0.15}
        />
      </mesh>

      {/* Inner core glow */}
      <mesh ref={innerGlowRef}>
        <sphereGeometry args={[SPHERE_RADIUS * 0.3, 32, 32]} />
        <meshBasicMaterial color="#3B82F6" transparent opacity={0.3} />
      </mesh>

      {/* Particle ring */}
      <points ref={particleRingRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[particleRingGeometry, 3]}
          />
        </bufferGeometry>
        <pointsMaterial
          color="#60A5FA"
          size={0.04}
          transparent
          opacity={0.6}
          sizeAttenuation
        />
      </points>
    </group>
  );
}

// Individual topic node with GSAP animations
function TopicNode({
  node,
  index,
  isSelected,
  isHovered,
  isConnectedToSelected,
  isPaused,
  onHover,
  onClick,
}: {
  node: TopicNode;
  index: number;
  isSelected: boolean;
  isHovered: boolean;
  isConnectedToSelected: boolean;
  isPaused: boolean;
  onHover: (hovering: boolean) => void;
  onClick: () => void;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);
  const ringRef = useRef<THREE.Mesh>(null);
  const groupRef = useRef<THREE.Group>(null);
  const orbitRef = useRef<THREE.Group>(null);

  // GSAP entrance animation
  useEffect(() => {
    if (groupRef.current) {
      gsap.fromTo(
        groupRef.current.scale,
        { x: 0, y: 0, z: 0 },
        { 
          x: 1, 
          y: 1, 
          z: 1, 
          duration: 0.8, 
          ease: "back.out(1.7)",
          delay: 0.3 + index * 0.03
        }
      );
    }
  }, [index]);

  // GSAP selection animation
  useEffect(() => {
    if (meshRef.current && isSelected) {
      gsap.to(meshRef.current.scale, {
        x: node.size * 1.3,
        y: node.size * 1.3,
        z: node.size * 1.3,
        duration: 0.3,
        ease: "elastic.out(1, 0.5)"
      });
    }
  }, [isSelected, node.size]);

  useFrame((state) => {
    if (!meshRef.current) return;

    // Pulsing effect (reduced when paused)
    const basePulse = isPaused 
      ? 0 
      : Math.sin(state.clock.elapsedTime * 2 + node.position.x * 2);
    const pulse = isHovered || isSelected ? 0.2 : basePulse * 0.05;
    
    if (!isSelected) {
      meshRef.current.scale.setScalar(node.size * (1 + pulse));
    }

    // Glow intensity
    if (glowRef.current) {
      const glowScale = isSelected ? 2.5 : isHovered ? 2 : isConnectedToSelected ? 1.8 : 1.5;
      glowRef.current.scale.setScalar(node.size * glowScale);
      (glowRef.current.material as THREE.MeshBasicMaterial).opacity =
        isSelected ? 0.5 : isHovered ? 0.4 : isConnectedToSelected ? 0.3 : 0.15;
    }

    // Rotating ring for selected node
    if (ringRef.current) {
      ringRef.current.rotation.z += isPaused ? 0 : 0.02;
      ringRef.current.visible = isSelected || isHovered;
    }

    // Orbiting particles for selected node
    if (orbitRef.current && isSelected && !isPaused) {
      orbitRef.current.rotation.y += 0.03;
      orbitRef.current.rotation.x += 0.01;
    }
  });

  return (
    <group ref={groupRef} position={node.position}>
      {/* Glow sphere */}
      <mesh ref={glowRef}>
        <sphereGeometry args={[1, 16, 16]} />
        <meshBasicMaterial color={node.glowColor} transparent opacity={0.15} />
      </mesh>

      {/* Selection ring */}
      <mesh ref={ringRef} visible={false}>
        <ringGeometry args={[node.size * 1.8, node.size * 2, 32]} />
        <meshBasicMaterial
          color={node.glowColor}
          transparent
          opacity={0.6}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Orbiting particles for selected node */}
      {isSelected && (
        <group ref={orbitRef}>
          {[0, 1, 2].map((i) => (
            <mesh
              key={i}
              position={[
                Math.cos((i * Math.PI * 2) / 3) * node.size * 2,
                0,
                Math.sin((i * Math.PI * 2) / 3) * node.size * 2,
              ]}
            >
              <sphereGeometry args={[0.03, 8, 8]} />
              <meshBasicMaterial color={node.glowColor} />
            </mesh>
          ))}
        </group>
      )}

      {/* Main node sphere */}
      <mesh
        ref={meshRef}
        onClick={(e) => {
          e.stopPropagation();
          onClick();
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          onHover(true);
          document.body.style.cursor = "pointer";
        }}
        onPointerOut={(e) => {
          e.stopPropagation();
          onHover(false);
          document.body.style.cursor = "auto";
        }}
      >
        <sphereGeometry args={[1, 32, 32]} />
        <meshStandardMaterial
          color={node.color}
          emissive={node.color}
          emissiveIntensity={isSelected ? 0.8 : isHovered ? 0.6 : isConnectedToSelected ? 0.5 : 0.3}
          metalness={0.4}
          roughness={0.3}
        />
      </mesh>

      {/* Always visible label */}
      <Html
        position={[0, node.size + 0.2, 0]}
        center
        zIndexRange={[10, 0]} // Keep labels below modal backdrop (z-40)
        style={{ pointerEvents: "none", userSelect: "none" }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ 
            opacity: isHovered || isSelected ? 1 : 0.85,
            scale: isHovered || isSelected ? 1.1 : 1 
          }}
          transition={{ duration: 0.2 }}
          className={cn(
            "whitespace-nowrap text-center transition-all",
            isHovered || isSelected 
              ? "bg-background/95 backdrop-blur-md px-3 py-2 rounded-xl border border-border/50 shadow-2xl"
              : "bg-transparent"
          )}
        >
          <p className={cn(
            "font-semibold",
            isHovered || isSelected 
              ? "text-sm text-foreground"
              : "text-[10px] text-white/90 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]"
          )}>
            {node.topic.topic.length > 15 && !(isHovered || isSelected)
              ? node.topic.topic.slice(0, 12) + "..."
              : node.topic.topic}
          </p>
          {(isHovered || isSelected) && (
            <>
              <p className="text-xs text-muted-foreground">
                {node.topic.count} document{node.topic.count !== 1 ? "s" : ""}
              </p>
              {isSelected && (
                <p className="text-[10px] text-primary mt-1">Click to view chunks</p>
              )}
            </>
          )}
        </motion.div>
      </Html>
    </group>
  );
}

// Animated connection line between topics with multiple flowing particles
function ConnectionLine({
  connection,
  nodes,
  selectedNodeId,
  hoveredNodeId,
  isPaused,
}: {
  connection: Connection;
  nodes: Map<string, TopicNode>;
  selectedNodeId: string | null;
  hoveredNodeId: string | null;
  isPaused: boolean;
}) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const particleRefs = useRef<any[]>([null, null, null]);
  const progressRefs = useRef<number[]>([Math.random(), Math.random() + 0.33, Math.random() + 0.66]);

  const sourceNode = nodes.get(connection.source);
  const targetNode = nodes.get(connection.target);

  const isHighlighted =
    selectedNodeId === connection.source ||
    selectedNodeId === connection.target ||
    hoveredNodeId === connection.source ||
    hoveredNodeId === connection.target;

  const curvePoints = useMemo(() => {
    if (!sourceNode || !targetNode) return [];
    return generateCurvePoints(sourceNode.position, targetNode.position); // Uses default 20 segments
  }, [sourceNode, targetNode]);

  // Pre-create particle geometry data - must be before any early returns
  const particlePositionArray = useMemo(() => new Float32Array([0, 0, 0]), []);

  useFrame(() => {
    if (isPaused || curvePoints.length === 0) return;

    // Animate multiple particles along the curve
    particleRefs.current.forEach((particle, i) => {
      if (!particle) return;
      
      const speed = isHighlighted ? 0.018 : 0.008;
      progressRefs.current[i] += speed;
      if (progressRefs.current[i] > 1) progressRefs.current[i] = 0;

      const index = Math.floor(progressRefs.current[i] * (curvePoints.length - 1));
      const point = curvePoints[index];
      if (point) {
        particle.position.copy(point);
      }
    });
  });

  if (!sourceNode || !targetNode || curvePoints.length === 0) return null;

  const lineColor = isHighlighted ? "#60A5FA" : "#475569";
  const lineOpacity = isHighlighted ? 0.6 : 0.12;
  const lineWidth = isHighlighted ? 2.5 : 1;

  return (
    <group>
      {/* Connection line */}
      <Line
        points={curvePoints}
        color={lineColor}
        lineWidth={lineWidth}
        transparent
        opacity={lineOpacity}
      />

      {/* Multiple animated particles */}
      {isHighlighted && [0, 1, 2].map((i) => (
        <points 
          key={i} 
          ref={(el) => { particleRefs.current[i] = el; }}
        >
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              args={[particlePositionArray, 3]}
            />
          </bufferGeometry>
          <pointsMaterial
            color={i === 0 ? "#60A5FA" : i === 1 ? "#A78BFA" : "#34D399"}
            size={0.06 + i * 0.01}
            transparent
            opacity={0.9 - i * 0.1}
            sizeAttenuation
          />
        </points>
      ))}
    </group>
  );
}

// Modern animated background with gradient stripes
function BackgroundEffect() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none select-none">
      {/* Deep space base */}
      <div className="absolute inset-0 bg-[#020617]" />
      
      {/* Animated gradient stripes/beams */}
      <div className="absolute inset-0 opacity-20">
        <motion.div 
          animate={{ 
            rotate: [0, 360],
            scale: [1, 1.2, 1] 
          }}
          transition={{ 
            duration: 90, 
            repeat: Infinity, 
            ease: "linear" 
          }}
          className="absolute -top-[50%] -left-[50%] w-[200%] h-[200%]"
        >
          {/* Blue beam */}
          <div className="absolute top-1/2 left-1/2 w-[60%] h-[2px] -translate-x-1/2 -translate-y-1/2 bg-gradient-to-r from-transparent via-blue-500 to-transparent blur-3xl shadow-[0_0_120px_rgba(59,130,246,0.6)]" />
          
          {/* Purple beam - 45 deg */}
          <div className="absolute top-1/2 left-1/2 w-[60%] h-[2px] -translate-x-1/2 -translate-y-1/2 rotate-45 bg-gradient-to-r from-transparent via-purple-500 to-transparent blur-3xl shadow-[0_0_120px_rgba(168,85,247,0.6)]" />
          
          {/* Cyan beam - 90 deg */}
          <div className="absolute top-1/2 left-1/2 w-[60%] h-[2px] -translate-x-1/2 -translate-y-1/2 rotate-90 bg-gradient-to-r from-transparent via-cyan-500 to-transparent blur-3xl shadow-[0_0_120px_rgba(6,182,212,0.6)]" />
          
           {/* Pink beam - 135 deg */}
           <div className="absolute top-1/2 left-1/2 w-[60%] h-[2px] -translate-x-1/2 -translate-y-1/2 rotate-135 bg-gradient-to-r from-transparent via-pink-500 to-transparent blur-3xl shadow-[0_0_120px_rgba(236,72,153,0.6)]" />
        </motion.div>
      </div>

      {/* Subtle grid lines for modern tech feel */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-[0.07]" />
      
      {/* Floating particles/stars */}
      <div className="absolute inset-0 opacity-30">
        <motion.div
           animate={{ y: [-20, -40] }}
           transition={{ duration: 10, repeat: Infinity, repeatType: "reverse", ease: "easeInOut" }}
           className="absolute top-1/4 left-1/4 w-1 h-1 bg-blue-400 rounded-full blur-[1px]"
        />
        <motion.div
           animate={{ y: [20, 40] }}
           transition={{ duration: 15, repeat: Infinity, repeatType: "reverse", ease: "easeInOut" }}
           className="absolute bottom-1/3 right-1/3 w-1.5 h-1.5 bg-purple-400 rounded-full blur-[1px]"
        />
         <motion.div
           animate={{ x: [-20, 20] }}
           transition={{ duration: 12, repeat: Infinity, repeatType: "reverse", ease: "easeInOut" }}
           className="absolute top-1/3 right-1/4 w-1 h-1 bg-cyan-400 rounded-full blur-[1px]"
        />
      </div>

      {/* Vignette overlay */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,#020617_100%)] opacity-80" />
    </div>
  );
}

// Scene containing all 3D elements
function Scene({
  nodes,
  connections,
  selectedNodeId,
  hoveredNodeId,
  onNodeHover,
  onNodeClick,
  isInteracting,
  isPaused,
}: {
  nodes: TopicNode[];
  connections: Connection[];
  selectedNodeId: string | null;
  hoveredNodeId: string | null;
  onNodeHover: (id: string | null) => void;
  onNodeClick: (node: TopicNode) => void;
  isInteracting: boolean;
  isPaused: boolean;
}) {
  const nodesMap = useMemo(() => {
    const map = new Map<string, TopicNode>();
    nodes.forEach((node) => map.set(node.id, node));
    return map;
  }, [nodes]);

  // Get connected node IDs for the selected node
  const connectedToSelected = useMemo(() => {
    if (!selectedNodeId) return new Set<string>();
    const connected = new Set<string>();
    connections.forEach((conn) => {
      if (conn.source === selectedNodeId) connected.add(conn.target);
      if (conn.target === selectedNodeId) connected.add(conn.source);
    });
    return connected;
  }, [selectedNodeId, connections]);

  return (
    <>
      {/* Lighting */}
      <ambientLight intensity={0.4} />
      <pointLight position={[10, 10, 10]} intensity={1} />
      <pointLight position={[-10, -10, -10]} intensity={0.5} color="#3B82F6" />
      <spotLight
        position={[0, 10, 0]}
        angle={0.5}
        penumbra={1}
        intensity={0.5}
        color="#A855F7"
      />

      {/* Central sphere */}
      <CentralSphere isInteracting={isInteracting} isPaused={isPaused} />

      {/* Connection lines */}
      {connections.map((connection, index) => (
        <ConnectionLine
          key={`${connection.source}-${connection.target}-${index}`}
          connection={connection}
          nodes={nodesMap}
          selectedNodeId={selectedNodeId}
          hoveredNodeId={hoveredNodeId}
          isPaused={isPaused}
        />
      ))}

      {/* Topic nodes */}
      {nodes.map((node, index) => (
        <TopicNode
          key={node.id}
          node={node}
          index={index}
          isSelected={selectedNodeId === node.id}
          isHovered={hoveredNodeId === node.id}
          isConnectedToSelected={connectedToSelected.has(node.id)}
          isPaused={isPaused}
          onHover={(hovering) => onNodeHover(hovering ? node.id : null)}
          onClick={() => onNodeClick(node)}
        />
      ))}

      {/* Camera controls */}
      <OrbitControls
        enablePan={false}
        enableZoom={true}
        minDistance={SPHERE_RADIUS * 1.5}
        maxDistance={SPHERE_RADIUS * 4}
        autoRotate={!isInteracting && !isPaused}
        autoRotateSpeed={0.3}
        dampingFactor={0.05}
        enableDamping
      />
    </>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function KnowledgeSphereMindMap({
  topics,
  teamId,
  onTopicClick,
  selectedTopic,
  className,
  isMinimal = false,
}: KnowledgeSphereMindMapProps) {
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedTopicData, setSelectedTopicData] = useState<TopicData | null>(
    null
  );
  const [showChunkViewer, setShowChunkViewer] = useState(false);
  const [isInteracting, setIsInteracting] = useState(false);
  const [isPaused] = useState(false); // Always running, no pause control
  const containerRef = useRef<HTMLDivElement>(null);

  // Pre-calculate connection counts for each topic to use in sizing
  const connectionData = useMemo(() => {
    const limitedTopics = topics.slice(0, MAX_TOPICS);
    const topicIds = new Set(limitedTopics.map((t) => t.topic));
    const connectionCounts: Map<string, number> = new Map();
    
    // Initialize counts
    limitedTopics.forEach((t) => connectionCounts.set(t.topic, 0));
    
    // Count connections from related topics
    limitedTopics.forEach((topic) => {
      if (topic.relatedTopics) {
        topic.relatedTopics.forEach((related) => {
          if (topicIds.has(related)) {
            connectionCounts.set(topic.topic, (connectionCounts.get(topic.topic) || 0) + 1);
          }
        });
      }
    });
    
    // Count connections from same folder
    limitedTopics.forEach((topic) => {
      if (topic.folder) {
        const sameFolderCount = limitedTopics.filter(
          (t) => t.topic !== topic.topic && t.folder === topic.folder
        ).length;
        connectionCounts.set(topic.topic, (connectionCounts.get(topic.topic) || 0) + sameFolderCount);
      }
    });
    
    // Count connections from shared documents
    limitedTopics.forEach((topic) => {
      limitedTopics.forEach((other) => {
        if (topic.topic !== other.topic) {
          const sharedDocs = topic.documents.filter((d) =>
            other.documents.some((od) => od.id === d.id)
          );
          if (sharedDocs.length > 0) {
            connectionCounts.set(topic.topic, (connectionCounts.get(topic.topic) || 0) + 1);
          }
        }
      });
    });
    
    return connectionCounts;
  }, [topics]);

  // Generate nodes from topics with size based on documents AND connections
  const nodes = useMemo(() => {
    const limitedTopics = topics.slice(0, MAX_TOPICS);
    const maxDocCount = Math.max(...limitedTopics.map((t) => t.count), 1);
    const maxConnections = Math.max(...Array.from(connectionData.values()), 1);

    return limitedTopics.map((topic, index) => {
      const position = fibonacciSphere(
        index,
        limitedTopics.length,
        SPHERE_RADIUS * 1.15
      );
      
      // Calculate size based on both document count and connection count
      const docRatio = topic.count / maxDocCount;
      const connCount = connectionData.get(topic.topic) || 0;
      const connRatio = connCount / maxConnections;
      
      // Weight: 60% documents, 40% connections
      const combinedRatio = docRatio * 0.6 + connRatio * 0.4;
      const sizeRatio = Math.max(0.25, Math.min(1, combinedRatio));
      const size = NODE_BASE_SIZE + sizeRatio * (NODE_MAX_SIZE - NODE_BASE_SIZE);
      const colors = getTopicColors(topic.context, index);

      return {
        id: topic.topic,
        topic,
        position,
        size,
        color: colors.solid,
        glowColor: colors.glow,
      };
    });
  }, [topics, connectionData]);

  // Generate connections based on relationships
  const connections = useMemo(() => {
    const conns: Connection[] = [];
    const nodeIds = new Set(nodes.map((n) => n.id));

    nodes.forEach((node) => {
      // Connect related topics
      if (node.topic.relatedTopics) {
        node.topic.relatedTopics.forEach((related) => {
          if (
            nodeIds.has(related) &&
            !conns.some(
              (c) =>
                (c.source === node.id && c.target === related) ||
                (c.source === related && c.target === node.id)
            )
          ) {
            conns.push({
              source: node.id,
              target: related,
              strength: 0.9,
              type: "related",
            });
          }
        });
      }

      // Connect topics in same folder
      nodes.forEach((other) => {
        if (
          node.id !== other.id &&
          node.topic.folder &&
          node.topic.folder === other.topic.folder &&
          !conns.some(
            (c) =>
              (c.source === node.id && c.target === other.id) ||
              (c.source === other.id && c.target === node.id)
          )
        ) {
          conns.push({
            source: node.id,
            target: other.id,
            strength: 0.5,
            type: "same_folder",
          });
        }
      });

      // Connect topics with shared documents
      nodes.forEach((other) => {
        if (node.id !== other.id) {
          const sharedDocs = node.topic.documents.filter((d) =>
            other.topic.documents.some((od) => od.id === d.id)
          );
          if (
            sharedDocs.length > 0 &&
            !conns.some(
              (c) =>
                (c.source === node.id && c.target === other.id) ||
                (c.source === other.id && c.target === node.id)
            )
          ) {
            conns.push({
              source: node.id,
              target: other.id,
              strength: Math.min(1, sharedDocs.length * 0.3),
              type: "shared_docs",
            });
          }
        }
      });
    });

    // Limit connections to prevent visual clutter and improve performance
    return conns
      .sort((a, b) => b.strength - a.strength)
      .slice(0, Math.min(25, nodes.length)); // Reduced from 60 for performance
  }, [nodes]);

  // Handle node click
  const handleNodeClick = useCallback(
    (node: TopicNode) => {
      setSelectedNodeId(node.id);
      setSelectedTopicData(node.topic);
      setShowChunkViewer(true);
      onTopicClick?.(node.topic);
    },
    [onTopicClick]
  );

  // Sync with external selectedTopic prop
  useEffect(() => {
    if (selectedTopic) {
      const node = nodes.find((n) => n.id === selectedTopic);
      if (node) {
        setSelectedNodeId(node.id);
        setSelectedTopicData(node.topic);
        setShowChunkViewer(true);
      }
    }
  }, [selectedTopic, nodes]);

  // Handle close chunk viewer
  const handleCloseChunkViewer = useCallback(() => {
    setShowChunkViewer(false);
    setSelectedNodeId(null);
    setSelectedTopicData(null);
  }, []);

  // Reset view
  const handleResetView = useCallback(() => {
    setSelectedNodeId(null);
    setSelectedTopicData(null);
    setShowChunkViewer(false);
    setHoveredNodeId(null);
  }, []);

  return (
    <div 
      ref={containerRef} 
      className={cn(
        "relative w-full h-full bg-[#020617] overflow-hidden",
        className
      )}
    >
      <BackgroundEffect />

      {/* Selected topic indicator - hidden in minimal mode */}
      <AnimatePresence>
        {selectedTopicData && !showChunkViewer && !isMinimal && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute bottom-3 left-3 z-30"
          >
            <div className="flex items-center gap-3 px-4 py-3 bg-background/95 backdrop-blur-md rounded-xl border border-border/50 shadow-xl">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-primary animate-pulse" />
                <span className="font-medium text-sm">
                  {selectedTopicData.topic}
                </span>
              </div>
              <Button
                size="sm"
                className="h-7 gap-1.5"
                onClick={() => setShowChunkViewer(true)}
              >
                <FileText className="h-3.5 w-3.5" />
                View Chunks
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 3D Canvas */}
      <div className="absolute inset-0">

        <Canvas
          camera={{ position: [0, 0, SPHERE_RADIUS * 2.5], fov: 50 }}
          onPointerDown={() => setIsInteracting(true)}
          onPointerUp={() => setIsInteracting(false)}
          onPointerLeave={() => setIsInteracting(false)}
          gl={{ antialias: true, alpha: true }}
          style={{ width: "100%", height: "100%", background: "transparent" }}
        >
          {/* <color attach="background" args={["#0f172a"]} /> - Removed for custom background */}
          <fog attach="fog" args={["#020617", 10, 30]} />
          <Scene
            nodes={nodes}
            connections={connections}
            selectedNodeId={selectedNodeId}
            hoveredNodeId={hoveredNodeId}
            onNodeHover={setHoveredNodeId}
            onNodeClick={handleNodeClick}
            isInteracting={isInteracting}
            isPaused={isPaused}
          />
        </Canvas>

      </div>

      {/* Empty state */}
      {nodes.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-900">
          <div className="text-center">
            <div className="w-20 h-20 rounded-2xl bg-muted/20 flex items-center justify-center mx-auto mb-4">
              <Sparkles className="h-10 w-10 text-muted-foreground/30" />
            </div>
            <p className="text-muted-foreground font-medium text-lg">
              No topics discovered
            </p>
            <p className="text-muted-foreground/60 text-sm mt-1">
              Upload documents to visualize knowledge topics
            </p>
          </div>
        </div>
      )}

      {/* Document chunk viewer sidebar */}
      <AnimatePresence>
        {showChunkViewer && selectedTopicData && (
          <DocumentChunkViewer
            topic={selectedTopicData}
            teamId={teamId}
            onClose={handleCloseChunkViewer}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

export default KnowledgeSphereMindMap;
