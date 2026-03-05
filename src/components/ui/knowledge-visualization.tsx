"use client";

import React, { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { motion, AnimatePresence, useMotionValue, useTransform } from "framer-motion";
import { cn } from "@/lib/utils";
import { X, Sparkles, FolderOpen, ZoomIn, ZoomOut, Maximize2, Move } from "lucide-react";
import { Button } from "./button";

export interface ChunkData {
  id: string;
  content: string;
  chunk_summary?: string;
  fileName?: string;
  relevance?: number;
}

export interface TopicData {
  topic: string;
  count: number;
  folder?: string;
  context: "public" | "private";
  relatedTopics?: string[];
  documents: {
    id: string;
    fileName: string;
    createdAt: string;
  }[];
  chunks?: ChunkData[];
}

export interface KnowledgeVisualizationProps {
  topics: TopicData[];
  onTopicClick?: (topic: TopicData) => void;
  selectedTopic?: string | null;
  className?: string;
}

// Color palette for topics — theme-aware with glassmorphism
const getTopicColors = (context: "public" | "private", index: number) => {
  const publicColors = [
    { bg: "from-blue-500/70 to-blue-600/50 dark:from-blue-400/60 dark:to-blue-600/40", glow: "bg-blue-500/30", border: "border-blue-400/30 dark:border-blue-300/20", text: "text-white dark:text-blue-50" },
    { bg: "from-cyan-500/70 to-cyan-600/50 dark:from-cyan-400/60 dark:to-cyan-600/40", glow: "bg-cyan-500/30", border: "border-cyan-400/30 dark:border-cyan-300/20", text: "text-white dark:text-cyan-50" },
    { bg: "from-sky-500/70 to-sky-600/50 dark:from-sky-400/60 dark:to-sky-600/40", glow: "bg-sky-500/30", border: "border-sky-400/30 dark:border-sky-300/20", text: "text-white dark:text-sky-50" },
    { bg: "from-teal-500/70 to-teal-600/50 dark:from-teal-400/60 dark:to-teal-600/40", glow: "bg-teal-500/30", border: "border-teal-400/30 dark:border-teal-300/20", text: "text-white dark:text-teal-50" },
  ];
  const privateColors = [
    { bg: "from-purple-500/70 to-purple-600/50 dark:from-purple-400/60 dark:to-purple-600/40", glow: "bg-purple-500/30", border: "border-purple-400/30 dark:border-purple-300/20", text: "text-white dark:text-purple-50" },
    { bg: "from-violet-500/70 to-violet-600/50 dark:from-violet-400/60 dark:to-violet-600/40", glow: "bg-violet-500/30", border: "border-violet-400/30 dark:border-violet-300/20", text: "text-white dark:text-violet-50" },
    { bg: "from-indigo-500/70 to-indigo-600/50 dark:from-indigo-400/60 dark:to-indigo-600/40", glow: "bg-indigo-500/30", border: "border-indigo-400/30 dark:border-indigo-300/20", text: "text-white dark:text-indigo-50" },
    { bg: "from-fuchsia-500/70 to-fuchsia-600/50 dark:from-fuchsia-400/60 dark:to-fuchsia-600/40", glow: "bg-fuchsia-500/30", border: "border-fuchsia-400/30 dark:border-fuchsia-300/20", text: "text-white dark:text-fuchsia-50" },
  ];

  const colors = context === "public" ? publicColors : privateColors;
  return colors[index % colors.length];
};

// Generate positions using a force-directed-like algorithm
const generatePositions = (
  topics: TopicData[],
  containerWidth: number,
  containerHeight: number,
  maxCount: number
) => {
  const positions: { x: number; y: number; size: number }[] = [];
  const padding = 100; // Increased padding
  const minDistance = 160; // Increased minimum distance between circles
  
  topics.forEach((topic, index) => {
    const sizeRatio = Math.max(0.35, Math.min(1, topic.count / Math.max(maxCount, 1)));
    const baseSize = 80 + sizeRatio * 60; // Slightly adjusted base size
    
    let x: number, y: number;
    let attempts = 0;
    const maxAttempts = 100;
    
    // Golden angle distribution for better spacing
    const goldenAngle = Math.PI * (3 - Math.sqrt(5));
    const angle = index * goldenAngle;
    const radiusFactor = Math.sqrt(index / topics.length);
    const maxRadius = Math.min(containerWidth, containerHeight) * 0.38; // Slightly smaller to leave more margin
    
    do {
      // Start with golden spiral position
      const baseRadius = maxRadius * radiusFactor;
      x = containerWidth / 2 + Math.cos(angle) * baseRadius;
      y = containerHeight / 2 + Math.sin(angle) * baseRadius;
      
      // Add some jitter
      x += (Math.random() - 0.5) * 40;
      y += (Math.random() - 0.5) * 40;
      
      // Clamp to bounds
      x = Math.max(padding + baseSize / 2, Math.min(containerWidth - padding - baseSize / 2, x));
      y = Math.max(padding + baseSize / 2, Math.min(containerHeight - padding - baseSize / 2, y));
      
      // Check for collisions
      let hasCollision = false;
      for (const pos of positions) {
        const dx = x - pos.x;
        const dy = y - pos.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const minDist = (baseSize + pos.size) / 2 + minDistance;
        
        if (dist < minDist) {
          hasCollision = true;
          // Push away from collision
          const pushAngle = Math.atan2(dy, dx);
          x += Math.cos(pushAngle) * 30;
          y += Math.sin(pushAngle) * 30;
          break;
        }
      }
      
      if (!hasCollision) break;
      attempts++;
    } while (attempts < maxAttempts);
    
    positions.push({ x, y, size: baseSize });
  });
  
  return positions;
};

// Connection line between related topics
const ConnectionLine = ({
  from,
  to,
  opacity = 0.3,
}: {
  from: { x: number; y: number };
  to: { x: number; y: number };
  opacity?: number;
}) => {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.sqrt(dx * dx + dy * dy);
  const angle = Math.atan2(dy, dx) * (180 / Math.PI);
  
  return (
    <motion.div
      initial={{ opacity: 0, scaleX: 0 }}
      animate={{ opacity, scaleX: 1 }}
      exit={{ opacity: 0, scaleX: 0 }}
      className="absolute h-[2px] bg-gradient-to-r from-primary/20 via-primary/40 to-primary/20 origin-left"
      style={{
        left: from.x,
        top: from.y,
        width: length,
        transform: `rotate(${angle}deg)`,
      }}
    />
  );
};

// Floating circle component
const FloatingCircle = ({
  topic,
  position,
  isSelected,
  isHovered,
  onClick,
  onHover,
  zoom,
  colors,
  hasDragged,
}: {
  topic: TopicData;
  position: { x: number; y: number; size: number };
  isSelected: boolean;
  isHovered: boolean;
  onClick: () => void;
  onHover: (hovering: boolean) => void;
  zoom: number;
  colors: { bg: string; glow: string; border: string; text?: string };
  hasDragged: boolean;
}) => {
  const { x, y, size } = position;

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!hasDragged) onClick();
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0 }}
      animate={{
        opacity: 1,
        scale: isSelected ? 1.15 : isHovered ? 1.08 : 1,
        x: x - size / 2,
        y: y - size / 2,
      }}
      exit={{ opacity: 0, scale: 0 }}
      transition={{
        type: "spring",
        stiffness: 260,
        damping: 22,
        scale: { duration: 0.2 },
      }}
      whileHover={{ scale: 1.12 }}
      onClick={handleClick}
      onMouseEnter={() => onHover(true)}
      onMouseLeave={() => onHover(false)}
      className={cn(
        "absolute cursor-pointer group",
        "flex items-center justify-center text-center",
        "rounded-full backdrop-blur-xl",
        `border ${colors.border}`,
        "shadow-lg hover:shadow-2xl transition-shadow duration-300",
        `bg-gradient-to-br ${colors.bg}`,
        isSelected && "ring-2 ring-primary ring-offset-2 ring-offset-background z-30",
        isHovered && "z-20"
      )}
      style={{ width: size, height: size }}
    >
      <div className={cn("flex flex-col items-center px-3 gap-0.5 overflow-hidden", colors.text || "text-white")}>
        <span className="text-[13px] font-bold truncate max-w-full leading-tight drop-shadow-sm">
          {topic.topic}
        </span>
        <span className="text-[10px] opacity-80 font-medium">
          {topic.count} doc{topic.count !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Outer glow on hover/select */}
      <motion.div
        className={cn("absolute inset-0 rounded-full", colors.glow, "blur-xl -z-10")}
        animate={{
          opacity: isHovered || isSelected ? 0.5 : 0,
          scale: isHovered || isSelected ? 1.4 : 1,
        }}
        transition={{ duration: 0.25 }}
      />

      {/* Ambient halo */}
      <div className={cn("absolute inset-0 rounded-full", colors.glow, "blur-3xl -z-20 opacity-20")} />
    </motion.div>
  );
};

// Topic detail panel
const TopicDetailPanel = ({
  topic,
  onClose,
}: {
  topic: TopicData;
  onClose: () => void;
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 20, scale: 0.95 }}
      transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
      className="absolute bottom-4 left-4 right-4 bg-background/95 backdrop-blur-xl rounded-2xl border border-border/40 shadow-2xl p-5 z-50"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={cn(
            "w-4 h-4 rounded-full shadow-lg",
            topic.context === "public" 
              ? "bg-gradient-to-br from-blue-400 to-blue-600" 
              : "bg-gradient-to-br from-purple-400 to-purple-600"
          )} />
          <h3 className="font-bold text-lg text-foreground">{topic.topic}</h3>
          <span className={cn(
            "text-xs font-medium px-2.5 py-1 rounded-full",
            topic.context === "public" 
              ? "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
              : "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300"
          )}>
            {topic.context}
          </span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-foreground rounded-full"
          onClick={onClose}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
      
      {topic.folder && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3 px-1">
          <FolderOpen className="h-4 w-4" />
          <span>{topic.folder}</span>
        </div>
      )}
      
      <div className="max-h-40 overflow-y-auto scrollbar-thin">
        <p className="text-sm text-muted-foreground mb-3">
          Found in {topic.count} document{topic.count !== 1 ? "s" : ""}:
        </p>
        <div className="space-y-2">
          {topic.documents.slice(0, 6).map((doc) => (
            <div 
              key={doc.id} 
              className="flex items-center gap-2 p-2 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
            >
              <div className="w-2 h-2 rounded-full bg-primary/60" />
              <span className="text-sm text-foreground truncate flex-1">{doc.fileName}</span>
            </div>
          ))}
          {topic.documents.length > 6 && (
            <p className="text-xs text-muted-foreground pl-4">
              +{topic.documents.length - 6} more documents...
            </p>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export function KnowledgeVisualization({
  topics,
  onTopicClick,
  selectedTopic,
  className,
}: KnowledgeVisualizationProps) {
  const [containerSize, setContainerSize] = useState({ width: 500, height: 400 });
  const [selectedTopicData, setSelectedTopicData] = useState<TopicData | null>(null);
  const [hoveredTopic, setHoveredTopic] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "public" | "private">("all");
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [hasDragged, setHasDragged] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const dragStart = useRef({ x: 0, y: 0, panX: 0, panY: 0 });
  const DRAG_THRESHOLD = 5; // Minimum pixels to consider it a drag

  // Update container size on resize
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

  // Filter and sort topics
  const displayTopics = useMemo(() => {
    let filtered = filter === "all" ? topics : topics.filter((t) => t.context === filter);
    return [...filtered].sort((a, b) => b.count - a.count).slice(0, 15);
  }, [topics, filter]);

  const maxCount = useMemo(() => {
    return Math.max(...displayTopics.map((t) => t.count), 1);
  }, [displayTopics]);

  // Generate positions for all topics
  const positions = useMemo(() => {
    return generatePositions(displayTopics, containerSize.width * zoom, containerSize.height * zoom, maxCount);
  }, [displayTopics, containerSize, maxCount, zoom]);

  // Find connections between topics (share same folder or have similar names)
  const connections = useMemo(() => {
    const conns: { from: number; to: number }[] = [];
    displayTopics.forEach((topic, i) => {
      displayTopics.forEach((other, j) => {
        if (i >= j) return;
        // Connect if same folder or related topics
        if (topic.folder && topic.folder === other.folder) {
          conns.push({ from: i, to: j });
        } else if (topic.relatedTopics?.includes(other.topic) || other.relatedTopics?.includes(topic.topic)) {
          conns.push({ from: i, to: j });
        }
      });
    });
    return conns.slice(0, 10); // Limit connections
  }, [displayTopics]);

  const handleTopicClick = useCallback((topic: TopicData) => {
    setSelectedTopicData(topic);
    onTopicClick?.(topic);
  }, [onTopicClick]);

  // Zoom controls
  const handleZoomIn = () => setZoom(z => Math.min(z + 0.25, 2));
  const handleZoomOut = () => setZoom(z => Math.max(z - 0.25, 0.5));
  const handleReset = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  // Pan handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    setIsDragging(true);
    setHasDragged(false); // Reset drag flag
    dragStart.current = { x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStart.current.x;
    const dy = e.clientY - dragStart.current.y;
    
    // Only mark as dragged if movement exceeds threshold
    if (Math.abs(dx) > DRAG_THRESHOLD || Math.abs(dy) > DRAG_THRESHOLD) {
      setHasDragged(true);
      setPan({ x: dragStart.current.panX + dx, y: dragStart.current.panY + dy });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    // Reset hasDragged after a short delay to allow click events to check it
    setTimeout(() => setHasDragged(false), 10);
  };

  return (
    <div className={cn("relative w-full h-full min-h-[300px]", className)}>
      {/* Controls */}
      <div className="absolute top-3 left-3 z-40 flex items-center gap-2">
        <div className="flex items-center gap-1 bg-background/90 backdrop-blur-md rounded-xl p-1.5 border border-border/40 shadow-lg">
          <Button
            variant={filter === "all" ? "secondary" : "ghost"}
            size="sm"
            className="h-7 text-xs rounded-lg"
            onClick={() => setFilter("all")}
          >
            All
          </Button>
          <Button
            variant={filter === "public" ? "secondary" : "ghost"}
            size="sm"
            className="h-7 text-xs rounded-lg"
            onClick={() => setFilter("public")}
          >
            <span className="w-2 h-2 rounded-full bg-blue-500 mr-1.5" />
            Public
          </Button>
          <Button
            variant={filter === "private" ? "secondary" : "ghost"}
            size="sm"
            className="h-7 text-xs rounded-lg"
            onClick={() => setFilter("private")}
          >
            <span className="w-2 h-2 rounded-full bg-purple-500 mr-1.5" />
            Private
          </Button>
        </div>
      </div>

      {/* Zoom controls */}
      <div className="absolute top-3 right-3 z-40 flex items-center gap-1">
        <div className="flex items-center gap-1 bg-background/90 backdrop-blur-md rounded-xl p-1 border border-border/40 shadow-lg">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 rounded-lg"
            onClick={handleZoomOut}
            disabled={zoom <= 0.5}
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
            onClick={handleZoomIn}
            disabled={zoom >= 2}
          >
            <ZoomIn className="h-3.5 w-3.5" />
          </Button>
          <div className="w-px h-4 bg-border mx-1" />
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 rounded-lg"
            onClick={handleReset}
          >
            <Maximize2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Topic count & hint */}
      <div className="absolute bottom-3 right-3 z-40 flex items-center gap-2">
        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-background/90 backdrop-blur-md rounded-xl border border-border/40 text-xs text-muted-foreground shadow-lg">
          <Move className="h-3 w-3" />
          <span>Drag to pan</span>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-background/90 backdrop-blur-md rounded-xl border border-border/40 text-xs text-muted-foreground shadow-lg">
          <Sparkles className="h-3 w-3" />
          {displayTopics.length} topics
        </div>
      </div>

      {/* Visualization container */}
      <div
        ref={containerRef}
        className={cn(
          "relative w-full h-full overflow-hidden rounded-2xl",
          "bg-gradient-to-br from-muted/10 via-background to-muted/20",
          "border border-border/30",
          isDragging ? "cursor-grabbing" : "cursor-grab"
        )}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {/* Animated background */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary/5 via-transparent to-transparent" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_70%,_var(--tw-gradient-stops))] from-blue-500/5 via-transparent to-transparent" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_30%,_var(--tw-gradient-stops))] from-purple-500/5 via-transparent to-transparent" />
        
        {/* Grid pattern */}
        <div 
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `radial-gradient(circle, currentColor 1px, transparent 1px)`,
            backgroundSize: '40px 40px',
          }}
        />

        {/* Pannable/zoomable content */}
        <motion.div
          className="absolute inset-0"
          style={{
            x: pan.x,
            y: pan.y,
            scale: zoom,
          }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
        >
          {/* Connection lines */}
          <AnimatePresence>
            {connections.map(({ from, to }, index) => (
              positions[from] && positions[to] && (
                <ConnectionLine
                  key={`connection-${index}`}
                  from={positions[from]}
                  to={positions[to]}
                  opacity={hoveredTopic === displayTopics[from]?.topic || hoveredTopic === displayTopics[to]?.topic ? 0.5 : 0.15}
                />
              )
            ))}
          </AnimatePresence>

          {/* Floating circles */}
          <AnimatePresence mode="popLayout">
            {displayTopics.map((topic, index) => (
              <FloatingCircle
                key={`${topic.topic}-${topic.context}`}
                topic={topic}
                position={positions[index]}
                isSelected={selectedTopic === topic.topic || selectedTopicData?.topic === topic.topic}
                isHovered={hoveredTopic === topic.topic}
                onClick={() => handleTopicClick(topic)}
                onHover={(hovering) => setHoveredTopic(hovering ? topic.topic : null)}
                zoom={zoom}
                colors={getTopicColors(topic.context, index)}
                hasDragged={hasDragged}
              />
            ))}
          </AnimatePresence>
        </motion.div>

        {/* Empty state */}
        {displayTopics.length === 0 && (
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

        {/* Topic detail panel */}
        <AnimatePresence>
          {selectedTopicData && (
            <TopicDetailPanel
              topic={selectedTopicData}
              onClose={() => setSelectedTopicData(null)}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// Topic Cloud alternative view — modern pill tags
export function TopicCloud({
  topics,
  onTopicClick,
  selectedTopic,
  className,
}: KnowledgeVisualizationProps) {
  const maxCount = useMemo(() => {
    return Math.max(...topics.map((t) => t.count), 1);
  }, [topics]);

  return (
    <div className={cn("w-full", className)}>
      <div className="flex flex-wrap gap-2">
        {topics.map((topic, index) => {
          const ratio = topic.count / maxCount;
          const sizeClass = ratio > 0.7
            ? "text-sm px-4 py-2"
            : ratio > 0.4
              ? "text-[13px] px-3 py-1.5"
              : "text-xs px-2.5 py-1";

          const isPublic = topic.context === "public";
          const selected = selectedTopic === topic.topic;

          return (
            <motion.button
              key={`${topic.topic}-${topic.context}`}
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.015, type: "spring", stiffness: 300, damping: 20 }}
              whileHover={{ scale: 1.06, y: -1 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => onTopicClick?.(topic)}
              className={cn(
                "rounded-xl border font-semibold transition-all duration-200",
                "backdrop-blur-sm shadow-sm hover:shadow-md",
                sizeClass,
                isPublic
                  ? "bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-200/80 dark:border-blue-800/50 hover:bg-blue-100 dark:hover:bg-blue-900/40"
                  : "bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border-purple-200/80 dark:border-purple-800/50 hover:bg-purple-100 dark:hover:bg-purple-900/40",
                selected && "ring-2 ring-primary/60 shadow-md"
              )}
            >
              {topic.topic}
              <span className="ml-1.5 opacity-50 font-normal">{topic.count}</span>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
