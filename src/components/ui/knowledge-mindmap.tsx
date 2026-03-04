"use client";

import React, { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { motion, AnimatePresence, useMotionValue, useSpring, useTransform } from "framer-motion";
import { cn } from "@/lib/utils";
import { X, Sparkles, ZoomIn, ZoomOut, Maximize2, Move, FileText } from "lucide-react";
import { Button } from "./button";
import type { TopicData } from "./knowledge-visualization";

interface KnowledgeMindMapProps {
  topics: TopicData[];
  onTopicClick?: (topic: TopicData) => void;
  selectedTopic?: string | null;
  className?: string;
}

interface Node {
  id: string;
  topic: TopicData;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
}

interface Edge {
  source: string;
  target: string;
  strength: number;
}

// Color schemes
const getNodeColor = (context: "public" | "private", index: number) => {
  const publicColors = [
    { bg: "from-blue-400 to-cyan-500", solid: "#3B82F6", glow: "rgba(59, 130, 246, 0.4)" },
    { bg: "from-cyan-400 to-teal-500", solid: "#06B6D4", glow: "rgba(6, 182, 212, 0.4)" },
    { bg: "from-sky-400 to-blue-500", solid: "#0EA5E9", glow: "rgba(14, 165, 233, 0.4)" },
  ];
  const privateColors = [
    { bg: "from-purple-400 to-violet-500", solid: "#8B5CF6", glow: "rgba(139, 92, 246, 0.4)" },
    { bg: "from-violet-400 to-purple-500", solid: "#A855F7", glow: "rgba(168, 85, 247, 0.4)" },
    { bg: "from-fuchsia-400 to-pink-500", solid: "#D946EF", glow: "rgba(217, 70, 239, 0.4)" },
  ];
  const colors = context === "public" ? publicColors : privateColors;
  return colors[index % colors.length];
};

// Force simulation
function useForceSimulation(
  topics: TopicData[],
  containerSize: { width: number; height: number }
) {
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const animationRef = useRef<number | null>(null);
  const isRunning = useRef<boolean>(true);

  // Initialize nodes and edges
  useEffect(() => {
    if (!topics.length || containerSize.width === 0) return;

    const maxCount = Math.max(...topics.map((t) => t.count), 1);
    const centerX = containerSize.width / 2;
    const centerY = containerSize.height / 2;

    // Create nodes with random initial positions
    const newNodes: Node[] = topics.slice(0, 25).map((topic, i) => {
      const angle = (2 * Math.PI * i) / Math.min(topics.length, 25);
      const radius = Math.min(containerSize.width, containerSize.height) * 0.3;
      const sizeRatio = Math.max(0.4, Math.min(1, topic.count / maxCount));

      return {
        id: topic.topic,
        topic,
        x: centerX + Math.cos(angle) * radius + (Math.random() - 0.5) * 50,
        y: centerY + Math.sin(angle) * radius + (Math.random() - 0.5) * 50,
        vx: 0,
        vy: 0,
        size: 30 + sizeRatio * 40,
        color: getNodeColor(topic.context, i).solid,
      };
    });

    // Create edges based on relationships
    const newEdges: Edge[] = [];
    const nodeIds = new Set(newNodes.map((n) => n.id));

    topics.slice(0, 25).forEach((topic) => {
      // Connect related topics
      if (topic.relatedTopics) {
        topic.relatedTopics.forEach((related) => {
          if (
            nodeIds.has(related) &&
            !newEdges.some(
              (e) =>
                (e.source === topic.topic && e.target === related) ||
                (e.source === related && e.target === topic.topic)
            )
          ) {
            newEdges.push({ source: topic.topic, target: related, strength: 0.8 });
          }
        });
      }

      // Connect topics in same folder
      topics.slice(0, 25).forEach((other) => {
        if (
          topic.topic !== other.topic &&
          topic.folder &&
          topic.folder === other.folder &&
          !newEdges.some(
            (e) =>
              (e.source === topic.topic && e.target === other.topic) ||
              (e.source === other.topic && e.target === topic.topic)
          )
        ) {
          newEdges.push({ source: topic.topic, target: other.topic, strength: 0.4 });
        }
      });

      // Connect topics that share documents
      topics.slice(0, 25).forEach((other) => {
        if (topic.topic !== other.topic) {
          const sharedDocs = topic.documents.filter((d) =>
            other.documents.some((od) => od.id === d.id)
          );
          if (
            sharedDocs.length > 0 &&
            !newEdges.some(
              (e) =>
                (e.source === topic.topic && e.target === other.topic) ||
                (e.source === other.topic && e.target === topic.topic)
            )
          ) {
            newEdges.push({
              source: topic.topic,
              target: other.topic,
              strength: Math.min(1, sharedDocs.length * 0.3),
            });
          }
        }
      });
    });

    setNodes(newNodes);
    setEdges(newEdges.slice(0, 40)); // Limit edges
    isRunning.current = true;
  }, [topics, containerSize]);

  // Force simulation loop
  useEffect(() => {
    if (!nodes.length) return;

    const simulate = () => {
      setNodes((prevNodes) => {
        const newNodes = prevNodes.map((node) => ({ ...node }));

        // Apply forces
        newNodes.forEach((node, i) => {
          // Center gravity
          const dx = containerSize.width / 2 - node.x;
          const dy = containerSize.height / 2 - node.y;
          node.vx += dx * 0.0005;
          node.vy += dy * 0.0005;

          // Repulsion from other nodes - increased spacing
          newNodes.forEach((other, j) => {
            if (i === j) return;
            const ddx = node.x - other.x;
            const ddy = node.y - other.y;
            const dist = Math.sqrt(ddx * ddx + ddy * ddy) || 1;
            const minDist = (node.size + other.size) * 2.5; // Increased from 1.5 for more spacing

            if (dist < minDist) {
              const force = ((minDist - dist) / dist) * 0.08; // Stronger repulsion
              node.vx += ddx * force;
              node.vy += ddy * force;
            }
          });

          // Attraction along edges
          edges.forEach((edge) => {
            if (edge.source === node.id || edge.target === node.id) {
              const otherId = edge.source === node.id ? edge.target : edge.source;
              const other = newNodes.find((n) => n.id === otherId);
              if (other) {
                const ddx = other.x - node.x;
                const ddy = other.y - node.y;
                const dist = Math.sqrt(ddx * ddx + ddy * ddy) || 1;
                const targetDist = 200; // Increased from 150 for more spacing

                if (dist > targetDist) {
                  const force = ((dist - targetDist) / dist) * edge.strength * 0.01;
                  node.vx += ddx * force;
                  node.vy += ddy * force;
                }
              }
            }
          });

          // Apply velocity with damping
          node.vx *= 0.85;
          node.vy *= 0.85;
          node.x += node.vx;
          node.y += node.vy;

          // Boundary constraints
          const padding = node.size;
          node.x = Math.max(padding, Math.min(containerSize.width - padding, node.x));
          node.y = Math.max(padding, Math.min(containerSize.height - padding, node.y));
        });

        return newNodes;
      });

      if (isRunning.current) {
        animationRef.current = requestAnimationFrame(simulate);
      }
    };

    animationRef.current = requestAnimationFrame(simulate);

    return () => {
      isRunning.current = false;
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [nodes.length, edges, containerSize]);

  return { nodes, edges, setNodes };
}

// Mind map node component
function MindMapNode({
  node,
  isSelected,
  isHovered,
  onHover,
  onClick,
  onDrag,
}: {
  node: Node;
  isSelected: boolean;
  isHovered: boolean;
  onHover: (hovering: boolean) => void;
  onClick: () => void;
  onDrag: (x: number, y: number) => void;
}) {
  const colorScheme = getNodeColor(node.topic.context, 0);
  const isDragging = useRef(false);
  const hasDragged = useRef(false); // Track if actual drag occurred
  const dragStart = useRef({ x: 0, y: 0, nodeX: 0, nodeY: 0 });
  const DRAG_THRESHOLD = 5; // Minimum pixels to consider it a drag

  const handleMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    isDragging.current = true;
    hasDragged.current = false; // Reset drag flag
    dragStart.current = {
      x: e.clientX,
      y: e.clientY,
      nodeX: node.x,
      nodeY: node.y,
    };

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!isDragging.current) return;
      const dx = moveEvent.clientX - dragStart.current.x;
      const dy = moveEvent.clientY - dragStart.current.y;
      
      // Only mark as dragged if movement exceeds threshold
      if (Math.abs(dx) > DRAG_THRESHOLD || Math.abs(dy) > DRAG_THRESHOLD) {
        hasDragged.current = true;
        onDrag(dragStart.current.nodeX + dx, dragStart.current.nodeY + dy);
      }
    };

    const handleMouseUp = () => {
      isDragging.current = false;
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
  };

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    // Only trigger click if it wasn't a drag
    if (!hasDragged.current) {
      onClick();
    }
  };

  return (
    <motion.g
      initial={{ opacity: 0, scale: 0 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 25 }}
    >
      {/* Glow effect */}
      <motion.circle
        cx={node.x}
        cy={node.y}
        r={node.size * 1.5}
        fill={colorScheme.glow}
        animate={{
          r: isHovered || isSelected ? node.size * 2 : node.size * 1.3,
          opacity: isHovered || isSelected ? 0.6 : 0.2,
        }}
        transition={{ duration: 0.2 }}
      />

      {/* Main node */}
      <motion.circle
        cx={node.x}
        cy={node.y}
        r={node.size}
        fill={`url(#gradient-${node.id.replace(/\s+/g, "-")})`}
        stroke={isSelected ? "#fff" : "rgba(255,255,255,0.2)"}
        strokeWidth={isSelected ? 3 : 1}
        style={{ cursor: isDragging.current ? "grabbing" : "grab" }}
        onMouseEnter={() => onHover(true)}
        onMouseLeave={() => onHover(false)}
        onMouseDown={handleMouseDown}
        onClick={handleClick}
        animate={{
          scale: isHovered ? 1.1 : 1,
        }}
        transition={{ duration: 0.15 }}
      />

      {/* Gradient definition */}
      <defs>
        <radialGradient
          id={`gradient-${node.id.replace(/\s+/g, "-")}`}
          cx="30%"
          cy="30%"
        >
          <stop offset="0%" stopColor={colorScheme.solid} stopOpacity="1" />
          <stop offset="100%" stopColor={colorScheme.solid} stopOpacity="0.7" />
        </radialGradient>
      </defs>

      {/* External label below circle - always visible */}
      <g style={{ pointerEvents: "none" }}>
        {/* Background for better readability */}
        <rect
          x={node.x - 50}
          y={node.y + node.size + 4}
          width={100}
          height={20}
          fill="rgba(0,0,0,0.5)"
          rx={4}
          opacity={isHovered || isSelected ? 0.8 : 0.5}
        />
        {/* Topic name */}
        <text
          x={node.x}
          y={node.y + node.size + 16}
          textAnchor="middle"
          dominantBaseline="middle"
          fill="white"
          fontSize={11}
          fontWeight="500"
          style={{ userSelect: "none" }}
        >
          {node.topic.topic.length > 12
            ? node.topic.topic.substring(0, 10) + "..."
            : node.topic.topic}
        </text>
      </g>

      {/* Document count inside circle */}
      <text
        x={node.x}
        y={node.y}
        textAnchor="middle"
        dominantBaseline="middle"
        fill="white"
        fontSize={Math.max(10, Math.min(16, node.size * 0.4))}
        fontWeight="700"
        style={{ pointerEvents: "none", userSelect: "none" }}
      >
        {node.topic.count}
      </text>
    </motion.g>
  );
}

// Edge component with animation and glow effect
function MindMapEdge({
  edge,
  nodes,
  isHighlighted,
}: {
  edge: Edge;
  nodes: Node[];
  isHighlighted: boolean;
}) {
  const sourceNode = nodes.find((n) => n.id === edge.source);
  const targetNode = nodes.find((n) => n.id === edge.target);

  if (!sourceNode || !targetNode) return null;

  const dx = targetNode.x - sourceNode.x;
  const dy = targetNode.y - sourceNode.y;
  const dist = Math.sqrt(dx * dx + dy * dy);

  if (dist === 0) return null;

  // Adjust start and end points to node edges
  const sourceRadius = sourceNode.size;
  const targetRadius = targetNode.size;
  const sourceX = sourceNode.x + (dx / dist) * sourceRadius;
  const sourceY = sourceNode.y + (dy / dist) * sourceRadius;
  const targetX = targetNode.x - (dx / dist) * targetRadius;
  const targetY = targetNode.y - (dy / dist) * targetRadius;

  // Calculate midpoint for curved path
  const midX = (sourceX + targetX) / 2;
  const midY = (sourceY + targetY) / 2;
  
  // Add slight curve offset
  const perpX = -(targetY - sourceY) / dist * 15 * edge.strength;
  const perpY = (targetX - sourceX) / dist * 15 * edge.strength;
  const controlX = midX + perpX;
  const controlY = midY + perpY;

  const pathD = `M ${sourceX} ${sourceY} Q ${controlX} ${controlY} ${targetX} ${targetY}`;

  return (
    <g>
      {/* Glow effect for highlighted edges */}
      {isHighlighted && (
        <motion.path
          d={pathD}
          fill="none"
          stroke="#8B5CF6"
          strokeWidth={6}
          strokeOpacity={0.2}
          strokeLinecap="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.3 }}
        />
      )}
      {/* Main edge */}
      <motion.path
        d={pathD}
        fill="none"
        stroke={isHighlighted ? "#8B5CF6" : "#4B5563"}
        strokeWidth={isHighlighted ? 2 : 1}
        strokeOpacity={isHighlighted ? 0.8 : 0.3}
        strokeLinecap="round"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      />
      {/* Animated particle along the edge when highlighted */}
      {isHighlighted && (
        <motion.circle
          r={3}
          fill="#8B5CF6"
          initial={{ opacity: 0 }}
          animate={{
            opacity: [0, 1, 1, 0],
            offsetDistance: ["0%", "100%"],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "linear",
          }}
          style={{
            offsetPath: `path('${pathD}')`,
          }}
        />
      )}
    </g>
  );
}

// Topic detail sidebar
function TopicDetailSidebar({
  topic,
  onClose,
}: {
  topic: TopicData;
  onClose: () => void;
}) {
  const colorScheme = getNodeColor(topic.context, 0);

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ duration: 0.3 }}
      className="absolute top-4 right-4 w-80 bg-background/95 backdrop-blur-xl rounded-2xl border border-border/40 shadow-2xl overflow-hidden z-50"
    >
      {/* Header with gradient */}
      <div
        className={cn(
          "p-4 bg-gradient-to-r",
          topic.context === "public"
            ? "from-blue-500/20 to-cyan-500/20"
            : "from-purple-500/20 to-violet-500/20"
        )}
      >
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div
              className={cn(
                "w-10 h-10 rounded-xl flex items-center justify-center",
                "bg-gradient-to-br",
                colorScheme.bg
              )}
            >
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-foreground">{topic.topic}</h3>
              <span
                className={cn(
                  "text-xs px-2 py-0.5 rounded-full",
                  topic.context === "public"
                    ? "bg-blue-500/20 text-blue-400"
                    : "bg-purple-500/20 text-purple-400"
                )}
              >
                {topic.context}
              </span>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-full"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-4">
        <div className="flex items-center gap-2 text-sm">
          <FileText className="h-4 w-4 text-muted-foreground" />
          <span className="text-muted-foreground">
            {topic.count} document{topic.count !== 1 ? "s" : ""}
          </span>
        </div>

        {topic.folder && (
          <div className="text-xs text-muted-foreground bg-muted/30 px-3 py-2 rounded-lg">
            📁 {topic.folder}
          </div>
        )}

        {/* Documents list */}
        <div>
          <p className="text-xs text-muted-foreground mb-2 font-medium">Documents</p>
          <div className="max-h-40 overflow-y-auto space-y-1.5">
            {topic.documents.slice(0, 8).map((doc) => (
              <div
                key={doc.id}
                className="flex items-center gap-2 p-2 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
              >
                <div className="w-1.5 h-1.5 rounded-full bg-primary/60" />
                <span className="text-sm text-foreground truncate flex-1">
                  {doc.fileName}
                </span>
              </div>
            ))}
            {topic.documents.length > 8 && (
              <p className="text-xs text-muted-foreground text-center py-1">
                +{topic.documents.length - 8} more
              </p>
            )}
          </div>
        </div>

        {/* Related topics */}
        {topic.relatedTopics && topic.relatedTopics.length > 0 && (
          <div>
            <p className="text-xs text-muted-foreground mb-2 font-medium">
              Related Topics
            </p>
            <div className="flex flex-wrap gap-1.5">
              {topic.relatedTopics.slice(0, 6).map((related) => (
                <span
                  key={related}
                  className="text-xs px-2 py-1 bg-muted/50 text-muted-foreground rounded-md hover:bg-muted transition-colors"
                >
                  {related}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}

// Main component
export function KnowledgeMindMap({
  topics,
  onTopicClick,
  selectedTopic,
  className,
}: KnowledgeMindMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [selectedTopicData, setSelectedTopicData] = useState<TopicData | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const isDragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0, panX: 0, panY: 0 });

  // Update container size
  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        setContainerSize({
          width: containerRef.current.offsetWidth,
          height: containerRef.current.offsetHeight,
        });
      }
    };

    updateSize();
    const observer = new ResizeObserver(updateSize);
    if (containerRef.current) {
      observer.observe(containerRef.current);
    }
    return () => observer.disconnect();
  }, []);

  // Force simulation
  const { nodes, edges, setNodes } = useForceSimulation(topics, containerSize);

  // Handle node click
  const handleNodeClick = useCallback(
    (node: Node) => {
      setSelectedTopicData(node.topic);
      onTopicClick?.(node.topic);
    },
    [onTopicClick]
  );

  // Handle node drag
  const handleNodeDrag = useCallback(
    (nodeId: string, x: number, y: number) => {
      setNodes((prev) =>
        prev.map((n) =>
          n.id === nodeId ? { ...n, x, y, vx: 0, vy: 0 } : n
        )
      );
    },
    [setNodes]
  );

  // Pan handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget || (e.target as Element).tagName === "svg") {
      isDragging.current = true;
      dragStart.current = { x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y };
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging.current) return;
    const dx = e.clientX - dragStart.current.x;
    const dy = e.clientY - dragStart.current.y;
    setPan({ x: dragStart.current.panX + dx, y: dragStart.current.panY + dy });
  };

  const handleMouseUp = () => {
    isDragging.current = false;
  };

  // Sync selected topic
  useEffect(() => {
    if (selectedTopic) {
      const topic = topics.find((t) => t.topic === selectedTopic);
      if (topic) setSelectedTopicData(topic);
    }
  }, [selectedTopic, topics]);

  return (
    <div className={cn("relative w-full h-full min-h-[400px]", className)}>
      {/* Controls */}
      <div className="absolute top-3 left-3 z-40 flex items-center gap-2">
        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-background/90 backdrop-blur-md rounded-xl border border-border/40 text-xs text-muted-foreground shadow-lg">
          <Sparkles className="h-3 w-3" />
          {topics.length} topics • Mind Map
        </div>
      </div>

      {/* Zoom controls */}
      <div className="absolute top-3 right-3 z-40">
        <div className="flex items-center gap-1 bg-background/90 backdrop-blur-md rounded-xl p-1 border border-border/40 shadow-lg">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 rounded-lg"
            onClick={() => setZoom((z) => Math.max(0.5, z - 0.1))}
          >
            <ZoomOut className="h-3.5 w-3.5" />
          </Button>
          <span className="text-xs font-medium px-2 min-w-[3rem] text-center">
            {Math.round(zoom * 100)}%
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 rounded-lg"
            onClick={() => setZoom((z) => Math.min(2, z + 0.1))}
          >
            <ZoomIn className="h-3.5 w-3.5" />
          </Button>
          <div className="w-px h-4 bg-border mx-1" />
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 rounded-lg"
            onClick={() => {
              setZoom(1);
              setPan({ x: 0, y: 0 });
            }}
          >
            <Maximize2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

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

      {/* Drag hint */}
      <div className="absolute bottom-3 right-3 z-40">
        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-background/90 backdrop-blur-md rounded-xl border border-border/40 text-xs text-muted-foreground shadow-lg">
          <Move className="h-3 w-3" />
          <span>Drag nodes or background</span>
        </div>
      </div>

      {/* SVG container */}
      <div
        ref={containerRef}
        className={cn(
          "absolute inset-0 overflow-hidden",
          "bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900",
          isDragging.current ? "cursor-grabbing" : "cursor-grab"
        )}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {/* Background pattern */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `radial-gradient(circle, currentColor 1px, transparent 1px)`,
            backgroundSize: "30px 30px",
          }}
        />

        <svg
          width="100%"
          height="100%"
          style={{
            transform: `scale(${zoom}) translate(${pan.x / zoom}px, ${pan.y / zoom}px)`,
            transformOrigin: "center",
          }}
        >
          {/* Edges */}
          <g>
            {edges.map((edge, i) => (
              <MindMapEdge
                key={`${edge.source}-${edge.target}-${i}`}
                edge={edge}
                nodes={nodes}
                isHighlighted={
                  hoveredNode === edge.source || hoveredNode === edge.target
                }
              />
            ))}
          </g>

          {/* Nodes */}
          <AnimatePresence>
            {nodes.map((node) => (
              <MindMapNode
                key={node.id}
                node={node}
                isSelected={selectedTopicData?.topic === node.id}
                isHovered={hoveredNode === node.id}
                onHover={(hovering) => setHoveredNode(hovering ? node.id : null)}
                onClick={() => handleNodeClick(node)}
                onDrag={(x, y) => handleNodeDrag(node.id, x, y)}
              />
            ))}
          </AnimatePresence>
        </svg>

        {/* Empty state */}
        {topics.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center">
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

      {/* Topic detail sidebar */}
      <AnimatePresence>
        {selectedTopicData && (
          <TopicDetailSidebar
            topic={selectedTopicData}
            onClose={() => setSelectedTopicData(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

export default KnowledgeMindMap;
