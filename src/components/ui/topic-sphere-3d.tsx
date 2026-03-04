"use client";

import React, { useRef, useState, useMemo, Suspense } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Html } from "@react-three/drei";
import * as THREE from "three";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Sparkles } from "lucide-react";
import type { TopicData } from "./knowledge-visualization";

interface TopicSphere3DProps {
  topics: TopicData[];
  onTopicClick?: (topic: TopicData) => void;
  selectedTopic?: string | null;
  className?: string;
}

// Convert spherical coordinates to cartesian
function sphericalToCartesian(
  radius: number,
  theta: number,
  phi: number
): [number, number, number] {
  const x = radius * Math.sin(phi) * Math.cos(theta);
  const y = radius * Math.cos(phi);
  const z = radius * Math.sin(phi) * Math.sin(theta);
  return [x, y, z];
}

// Color schemes for topics
const getTopicColor = (context: "public" | "private", index: number) => {
  const publicColors = ["#3B82F6", "#06B6D4", "#0EA5E9", "#14B8A6"];
  const privateColors = ["#8B5CF6", "#A855F7", "#6366F1", "#D946EF"];
  const colors = context === "public" ? publicColors : privateColors;
  return colors[index % colors.length];
};

// Individual topic marker on sphere
function TopicMarker({
  topic,
  position,
  size,
  color,
  isSelected,
  isHovered,
  onHover,
  onClick,
}: {
  topic: TopicData;
  position: [number, number, number];
  size: number;
  color: string;
  isSelected: boolean;
  isHovered: boolean;
  onHover: (hovering: boolean) => void;
  onClick: () => void;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);
  
  // Animate the marker
  useFrame((state) => {
    if (meshRef.current) {
      // Pulsing effect
      const pulse = Math.sin(state.clock.elapsedTime * 2 + position[0]) * 0.1;
      meshRef.current.scale.setScalar(size * (1 + (isHovered || isSelected ? 0.3 : pulse * 0.1)));
    }
    if (glowRef.current) {
      glowRef.current.scale.setScalar(size * 1.5 * (isHovered || isSelected ? 1.5 : 1));
    }
  });

  return (
    <group position={position}>
      {/* Glow effect */}
      <mesh ref={glowRef}>
        <sphereGeometry args={[1, 16, 16]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={isHovered || isSelected ? 0.4 : 0.15}
        />
      </mesh>
      
      {/* Main marker */}
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
          color={color}
          emissive={color}
          emissiveIntensity={isHovered || isSelected ? 0.8 : 0.3}
          metalness={0.3}
          roughness={0.4}
        />
      </mesh>

      {/* Always visible label */}
      <Html
        position={[0, size * 1.3, 0]}
        center
        zIndexRange={[10, 0]} // Keep labels below modal backdrop (z-40)
        style={{
          pointerEvents: "none",
          userSelect: "none",
        }}
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
              ? "bg-background/95 backdrop-blur-md px-3 py-2 rounded-lg border border-border/40 shadow-xl"
              : "bg-transparent"
          )}
        >
          <p className={cn(
            "font-semibold",
            isHovered || isSelected 
              ? "text-sm text-foreground"
              : "text-[10px] text-white/90 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]"
          )}>
            {topic.topic.length > 15 && !(isHovered || isSelected)
              ? topic.topic.slice(0, 12) + "..."
              : topic.topic}
          </p>
          {(isHovered || isSelected) && (
            <p className="text-xs text-muted-foreground">
              {topic.count} doc{topic.count !== 1 ? "s" : ""}
            </p>
          )}
        </motion.div>
      </Html>
    </group>
  );
}

// Central glowing sphere with particle ring
function CentralSphere() {
  const meshRef = useRef<THREE.Mesh>(null);
  const ringRef = useRef<THREE.Mesh>(null);
  const innerGlowRef = useRef<THREE.Mesh>(null);
  
  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y = state.clock.elapsedTime * 0.1;
      meshRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.05) * 0.1;
    }
    if (ringRef.current) {
      ringRef.current.rotation.z = state.clock.elapsedTime * 0.15;
    }
    if (innerGlowRef.current) {
      const pulse = Math.sin(state.clock.elapsedTime * 0.5) * 0.1 + 0.9;
      innerGlowRef.current.scale.setScalar(pulse);
    }
  });

  return (
    <group>
      {/* Inner glow */}
      <mesh ref={innerGlowRef}>
        <sphereGeometry args={[1.8, 32, 32]} />
        <meshBasicMaterial
          color="#8B5CF6"
          transparent
          opacity={0.08}
        />
      </mesh>
      
      {/* Main wireframe sphere */}
      <mesh ref={meshRef}>
        <sphereGeometry args={[2, 64, 64]} />
        <meshStandardMaterial
          color="#3B82F6"
          transparent
          opacity={0.2}
          wireframe
        />
      </mesh>
      
      {/* Decorative ring */}
      <mesh ref={ringRef} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[3, 0.02, 16, 100]} />
        <meshBasicMaterial
          color="#8B5CF6"
          transparent
          opacity={0.3}
        />
      </mesh>
    </group>
  );
}

// Single connection line component
function ConnectionLine({
  fromPos,
  toPos,
  isHighlighted,
}: {
  fromPos: [number, number, number];
  toPos: [number, number, number];
  isHighlighted: boolean;
}) {
  const lineRef = useRef<THREE.Line>(null);
  
  const geometry = useMemo(() => {
    const points = [
      new THREE.Vector3(...fromPos),
      new THREE.Vector3(...toPos),
    ];
    return new THREE.BufferGeometry().setFromPoints(points);
  }, [fromPos, toPos]);
  
  const material = useMemo(() => {
    return new THREE.LineBasicMaterial({
      color: isHighlighted ? "#8B5CF6" : "#4B5563",
      transparent: true,
      opacity: isHighlighted ? 0.8 : 0.2,
    });
  }, [isHighlighted]);

  return <primitive ref={lineRef} object={new THREE.Line(geometry, material)} />;
}

// Connection lines between related topics
function TopicConnections({
  topics,
  positions,
  hoveredTopic,
}: {
  topics: TopicData[];
  positions: Map<string, [number, number, number]>;
  hoveredTopic: string | null;
}) {
  const lines = useMemo(() => {
    const connections: { from: string; to: string; strength: number }[] = [];
    
    topics.forEach((topic) => {
      if (topic.relatedTopics) {
        topic.relatedTopics.forEach((relatedTopic) => {
          if (
            positions.has(relatedTopic) &&
            !connections.some(
              (c) =>
                (c.from === topic.topic && c.to === relatedTopic) ||
                (c.from === relatedTopic && c.to === topic.topic)
            )
          ) {
            connections.push({
              from: topic.topic,
              to: relatedTopic,
              strength: 0.5,
            });
          }
        });
      }
      
      // Connect topics that share the same folder
      topics.forEach((other) => {
        if (
          topic.topic !== other.topic &&
          topic.folder &&
          topic.folder === other.folder &&
          !connections.some(
            (c) =>
              (c.from === topic.topic && c.to === other.topic) ||
              (c.from === other.topic && c.to === topic.topic)
          )
        ) {
          connections.push({
            from: topic.topic,
            to: other.topic,
            strength: 0.3,
          });
        }
      });
    });
    
    return connections.slice(0, 20); // Limit connections for performance
  }, [topics, positions]);

  return (
    <group>
      {lines.map(({ from, to }, index) => {
        const fromPos = positions.get(from);
        const toPos = positions.get(to);
        if (!fromPos || !toPos) return null;
        
        const isHighlighted = hoveredTopic === from || hoveredTopic === to;
        
        return (
          <ConnectionLine
            key={`${from}-${to}-${index}`}
            fromPos={fromPos}
            toPos={toPos}
            isHighlighted={isHighlighted}
          />
        );
      })}
    </group>
  );
}

// Scene containing all 3D elements
function Scene({
  topics,
  selectedTopic,
  onTopicClick,
}: {
  topics: TopicData[];
  selectedTopic: string | null;
  onTopicClick?: (topic: TopicData) => void;
}) {
  const [hoveredTopic, setHoveredTopic] = useState<string | null>(null);
  
  // Calculate positions and sizes for topics
  const { positions, sizes } = useMemo(() => {
    const posMap = new Map<string, [number, number, number]>();
    const sizeMap = new Map<string, number>();
    const limitedTopics = topics.slice(0, 30);
    const maxCount = Math.max(...limitedTopics.map((t) => t.count), 1);
    const radius = 5;
    
    // Calculate connection counts for sizing
    const connectionCounts = new Map<string, number>();
    const topicIds = new Set(limitedTopics.map((t) => t.topic));
    
    limitedTopics.forEach((t) => connectionCounts.set(t.topic, 0));
    
    limitedTopics.forEach((topic) => {
      // Related topics connections
      if (topic.relatedTopics) {
        topic.relatedTopics.forEach((related) => {
          if (topicIds.has(related)) {
            connectionCounts.set(topic.topic, (connectionCounts.get(topic.topic) || 0) + 1);
          }
        });
      }
      // Same folder connections
      if (topic.folder) {
        const sameFolderCount = limitedTopics.filter(
          (t) => t.topic !== topic.topic && t.folder === topic.folder
        ).length;
        connectionCounts.set(topic.topic, (connectionCounts.get(topic.topic) || 0) + sameFolderCount);
      }
    });
    
    const maxConnections = Math.max(...Array.from(connectionCounts.values()), 1);
    
    // Distribute topics on sphere using Fibonacci sphere
    const goldenRatio = (1 + Math.sqrt(5)) / 2;
    
    limitedTopics.forEach((topic, i) => {
      const theta = 2 * Math.PI * i / goldenRatio;
      const phi = Math.acos(1 - 2 * (i + 0.5) / limitedTopics.length);
      
      const pos = sphericalToCartesian(radius, theta, phi);
      posMap.set(topic.topic, pos);
      
      // Size based on document count AND connection count
      const docRatio = topic.count / maxCount;
      const connCount = connectionCounts.get(topic.topic) || 0;
      const connRatio = connCount / maxConnections;
      
      // Weight: 60% documents, 40% connections
      const combinedRatio = docRatio * 0.6 + connRatio * 0.4;
      const sizeRatio = Math.max(0.3, Math.min(1, combinedRatio));
      sizeMap.set(topic.topic, 0.3 + sizeRatio * 0.5);
    });
    
    return { positions: posMap, sizes: sizeMap };
  }, [topics]);

  return (
    <>
      {/* Lighting */}
      <ambientLight intensity={0.4} />
      <pointLight position={[10, 10, 10]} intensity={1} />
      <pointLight position={[-10, -10, -10]} intensity={0.5} color="#8B5CF6" />
      
      {/* Central sphere */}
      <CentralSphere />
      
      {/* Topic connections */}
      <TopicConnections
        topics={topics}
        positions={positions}
        hoveredTopic={hoveredTopic}
      />
      
      {/* Topic markers */}
      {topics.slice(0, 30).map((topic, index) => {
        const pos = positions.get(topic.topic);
        const size = sizes.get(topic.topic) || 0.5;
        if (!pos) return null;
        
        return (
          <TopicMarker
            key={topic.topic}
            topic={topic}
            position={pos}
            size={size}
            color={getTopicColor(topic.context, index)}
            isSelected={selectedTopic === topic.topic}
            isHovered={hoveredTopic === topic.topic}
            onHover={(hovering) => setHoveredTopic(hovering ? topic.topic : null)}
            onClick={() => onTopicClick?.(topic)}
          />
        );
      })}
      
      {/* Controls */}
      <OrbitControls
        enableZoom={true}
        enablePan={false}
        minDistance={6}
        maxDistance={15}
        autoRotate
        autoRotateSpeed={0.5}
      />
    </>
  );
}

// Loading fallback
function LoadingFallback() {
  return (
    <div className="absolute inset-0 flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-4 animate-pulse">
          <Sparkles className="h-8 w-8 text-muted-foreground/40" />
        </div>
        <p className="text-muted-foreground font-medium">Loading 3D view...</p>
      </div>
    </div>
  );
}

// Main component
export function TopicSphere3D({
  topics,
  onTopicClick,
  selectedTopic,
  className,
}: TopicSphere3DProps) {
  const [selectedTopicData, setSelectedTopicData] = useState<TopicData | null>(
    null
  );

  const handleTopicClick = (topic: TopicData) => {
    setSelectedTopicData(topic);
    onTopicClick?.(topic);
  };

  // Find selected topic data
  React.useEffect(() => {
    if (selectedTopic) {
      const topic = topics.find((t) => t.topic === selectedTopic);
      if (topic) setSelectedTopicData(topic);
    }
  }, [selectedTopic, topics]);

  return (
    <div className={cn("relative w-full h-full min-h-[400px]", className)}>

      {/* Legend */}
      <div className="absolute bottom-3 left-3 z-40">
        <div className="flex items-center gap-3 px-3 py-1.5 bg-background/90 backdrop-blur-md rounded-xl border border-border/40 text-xs shadow-lg">
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
            <span className="text-muted-foreground">Public</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-purple-500" />
            <span className="text-muted-foreground">Private</span>
          </div>
        </div>
      </div>

      {/* 3D Canvas */}
      <div className="absolute inset-0 overflow-hidden bg-[#020617]">
        <Suspense fallback={<LoadingFallback />}>
          <Canvas
            camera={{ position: [0, 0, 10], fov: 60 }}
            style={{ width: "100%", height: "100%", background: "transparent" }}
          >
            <Scene
              topics={topics}
              selectedTopic={selectedTopic || selectedTopicData?.topic || null}
              onTopicClick={handleTopicClick}
            />
          </Canvas>
        </Suspense>
      </div>

      {/* Empty state */}
      {topics.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center z-30">
          <div className="text-center">
            <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-4">
              <Sparkles className="h-8 w-8 text-muted-foreground/40" />
            </div>
            <p className="text-muted-foreground font-medium">No topics found</p>
            <p className="text-muted-foreground/60 text-sm mt-1">
              Upload documents to discover knowledge topics
            </p>
          </div>
        </div>
      )}

    </div>
  );
}

export default TopicSphere3D;
