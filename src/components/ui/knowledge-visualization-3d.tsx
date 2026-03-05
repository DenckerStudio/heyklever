"use client";

import React, { useState, useCallback, useEffect, useRef, Suspense } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import {
  Globe2,
  Network,
  List,
  Sparkles,
  BookOpen,
  Loader2,
  Atom,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import { Button } from "./button";
import type { TopicData } from "./knowledge-visualization";
import { TopicCloud } from "./knowledge-visualization";
import { KnowledgeMindMap } from "./knowledge-mindmap";
import { DocumentChunkViewer } from "./document-chunk-viewer";

// Lazy load the heavy 3D components
const TopicSphere3D = React.lazy(() => import("./topic-sphere-3d"));
const KnowledgeSphereMindMap = React.lazy(() => import("./knowledge-sphere-mindmap"));

type VisualizationMode = "hybrid" | "sphere" | "mindmap" | "cloud";

interface KnowledgeVisualization3DProps {
  topics: TopicData[];
  teamId: string;
  onTopicClick?: (topic: TopicData) => void;
  selectedTopic?: string | null;
  className?: string;
  defaultMode?: VisualizationMode;
  isFullscreen?: boolean;
}

// View mode button component
function ViewModeButton({
  mode,
  currentMode,
  icon: Icon,
  label,
  onClick,
}: {
  mode: VisualizationMode;
  currentMode: VisualizationMode;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onClick: () => void;
}) {
  const isActive = mode === currentMode;

  return (
    <Button
      variant={isActive ? "secondary" : "ghost"}
      size="sm"
      className={cn(
        "h-8 px-2 lg:px-3 gap-1.5 rounded-lg transition-all duration-200",
        isActive && "bg-primary/10 text-primary border border-primary/20"
      )}
      onClick={onClick}
      title={label}
    >
      <Icon className="h-4 w-4 flex-shrink-0" />
      <span className="hidden lg:inline text-xs">{label}</span>
    </Button>
  );
}

// Loading fallback for 3D view
function Sphere3DFallback() {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-muted/30 via-background to-muted/20">
      <div className="text-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto mb-3" />
        <p className="text-sm text-muted-foreground">Loading 3D visualization...</p>
      </div>
    </div>
  );
}

const STORAGE_KEY = "klever-visualization-mode";

// Main component
export function KnowledgeVisualization3D({
  topics,
  teamId,
  onTopicClick,
  selectedTopic,
  className,
  defaultMode = "hybrid",
  isFullscreen = false,
}: KnowledgeVisualization3DProps) {
  const [mode, setMode] = useState<VisualizationMode>(() => {
    // Load from localStorage on initial render
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored && ["hybrid", "sphere", "mindmap", "cloud"].includes(stored)) {
        return stored as VisualizationMode;
      }
    }
    return defaultMode;
  });
  const [selectedTopicData, setSelectedTopicData] = useState<TopicData | null>(null);
  const [showChunkViewer, setShowChunkViewer] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isMinimal, setIsMinimal] = useState(false);

  // Handle topic click
  const handleTopicClick = useCallback(
    (topic: TopicData) => {
      setSelectedTopicData(topic);
      setShowChunkViewer(true);
      onTopicClick?.(topic);
    },
    [onTopicClick]
  );

  // Handle mode change with transition and save to localStorage
  const handleModeChange = useCallback((newMode: VisualizationMode) => {
    if (newMode === mode) return;
    
    setIsTransitioning(true);
    setTimeout(() => {
      setMode(newMode);
      // Save to localStorage
      if (typeof window !== "undefined") {
        localStorage.setItem(STORAGE_KEY, newMode);
      }
      setIsTransitioning(false);
    }, 150);
  }, [mode]);

  // Toggle minimal mode
  const toggleMinimal = useCallback(() => {
    setIsMinimal(prev => !prev);
  }, []);

  // Track last synced selectedTopic so we only open the chunk viewer when the *prop* changes, not on every topics re-reference (e.g. when changing visualization mode).
  const lastSyncedTopicRef = useRef<string | null>(null);

  // Sync selected topic from props – only open chunk viewer when selectedTopic prop actually changes
  useEffect(() => {
    if (selectedTopic) {
      const topic = topics.find((t) => t.topic === selectedTopic);
      if (topic) {
        setSelectedTopicData(topic);
        const topicChanged = lastSyncedTopicRef.current !== selectedTopic;
        lastSyncedTopicRef.current = selectedTopic;
        if (topicChanged) {
          setShowChunkViewer(true);
        }
      }
    } else {
      lastSyncedTopicRef.current = null;
    }
  }, [selectedTopic, topics]);

  // View modes configuration
  const viewModes = [
    { mode: "hybrid" as const, icon: Atom, label: "Hybrid" },
    { mode: "sphere" as const, icon: Globe2, label: "3D Sphere" },
    { mode: "mindmap" as const, icon: Network, label: "Mind Map" },
    { mode: "cloud" as const, icon: List, label: "Cloud" },
  ];

  return (
    <div className={cn("relative w-full h-full min-h-[400px]", className)}>
      {/* Bottom control bar with view switcher and expand/collapse */}
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="absolute bottom-3 left-1/2 -translate-x-1/2 z-40"
      >
        <div className="flex items-center gap-2 bg-background/90 backdrop-blur-md rounded-xl p-1.5 border border-border/40 shadow-lg">
          {/* Stats indicator - shown when not minimal */}
          {!isMinimal && (
            <div className="flex items-center gap-2 px-2 border-r border-border/40 mr-1">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Sparkles className="h-3 w-3" />
                <span className="font-medium">{topics.length} topics</span>
              </div>
              
              {selectedTopicData && (
                <div className="flex items-center gap-1.5 text-xs border-l border-border/40 pl-2 ml-1">
                  <span className="text-primary font-medium truncate max-w-[100px]">
                    {selectedTopicData.topic}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Expand/Collapse button */}
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 rounded-lg"
            onClick={toggleMinimal}
            title={isMinimal ? "Expand controls" : "Minimize controls"}
          >
            {isMinimal ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>
          
          {/* View mode buttons - shown when not minimal */}
          <AnimatePresence mode="wait">
            {!isMinimal && (
              <motion.div
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: "auto" }}
                exit={{ opacity: 0, width: 0 }}
                transition={{ duration: 0.2 }}
                className="flex items-center gap-1 overflow-hidden"
              >
                {viewModes.map(({ mode: m, icon, label }) => (
                  <ViewModeButton
                    key={m}
                    mode={m}
                    currentMode={mode}
                    icon={icon}
                    label={label}
                    onClick={() => handleModeChange(m)}
                  />
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      {/* View chunks button - hidden in hybrid mode which has its own viewer */}
      {selectedTopicData && !showChunkViewer && mode !== "hybrid" && !isMinimal && (
        <div className="absolute bottom-16 right-3 z-40">
          <Button
            onClick={() => setShowChunkViewer(true)}
            className="gap-2 shadow-lg"
            size="sm"
            >
            <BookOpen className="h-4 w-4" />
            View Chunks
          </Button>
        </div>
      )}

      {/* Main visualization area */}
      <div
        className={cn(
          "absolute inset-0 overflow-hidden transition-all duration-300",
          !isFullscreen && (showChunkViewer && mode !== "hybrid" ? "mr-[400px] rounded-l-2xl" : "rounded-2xl")
        )}
      >
        <AnimatePresence mode="wait">
          {isTransitioning ? (
            <motion.div
              key="transition"
              initial={{ opacity: 1 }}
              animate={{ opacity: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="absolute inset-0 bg-background/50 backdrop-blur-sm flex items-center justify-center"
            >
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </motion.div>
          ) : (
            <motion.div
              key={mode}
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
              className="absolute inset-0"
            >
              {mode === "hybrid" && (
                <Suspense fallback={<Sphere3DFallback />}>
                  <KnowledgeSphereMindMap
                    topics={topics}
                    teamId={teamId}
                    onTopicClick={handleTopicClick}
                    selectedTopic={selectedTopicData?.topic || null}
                    className="w-full h-full"
                    isMinimal={isMinimal}
                  />
                </Suspense>
              )}

              {mode === "sphere" && (
                <Suspense fallback={<Sphere3DFallback />}>
                  <TopicSphere3D
                    topics={topics}
                    onTopicClick={handleTopicClick}
                    selectedTopic={selectedTopicData?.topic || null}
                    className="h-full"
                  />
                </Suspense>
              )}

              {mode === "mindmap" && (
                <KnowledgeMindMap
                  topics={topics}
                  onTopicClick={handleTopicClick}
                  selectedTopic={selectedTopicData?.topic || null}
                  className="h-full"
                />
              )}

              {mode === "cloud" && (
                <div className="h-full p-6 bg-gradient-to-br from-muted/30 via-background to-muted/20 overflow-y-auto">
                  <TopicCloud
                    topics={topics}
                    onTopicClick={handleTopicClick}
                    selectedTopic={selectedTopicData?.topic || null}
                    className="pt-10"
                  />
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Empty state */}
        {topics.length === 0 && !isTransitioning && (
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-muted/30 via-background to-muted/20 z-30">
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

      {/* Document chunk viewer sidebar - hidden in hybrid mode which has its own viewer */}
      <AnimatePresence>
        {showChunkViewer && selectedTopicData && mode !== "hybrid" && (
          <DocumentChunkViewer
            topic={selectedTopicData}
            teamId={teamId}
            onClose={() => {
              setShowChunkViewer(false);
              setSelectedTopicData(null);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

export default KnowledgeVisualization3D;
