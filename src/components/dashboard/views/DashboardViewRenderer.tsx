"use client";

import React, { Suspense, lazy, useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { useDashboardView, DashboardView } from '@/lib/contexts/DashboardViewContext';
import { Loader2 } from 'lucide-react';

// Lazy load view components for code splitting
const NotebookView = lazy(() => import('./NotebookView').then(m => ({ default: m.NotebookView })));
const OverviewView = lazy(() => import('./OverviewView').then(m => ({ default: m.OverviewView })));
const TeamView = lazy(() => import('@/app/dashboard/team/page'));
const BillingView = lazy(() => import('@/app/dashboard/billing/page'));
const AnalyticsView = lazy(() => import('./AnalyticsView').then(m => ({ default: m.AnalyticsView })));
const TrainAIView = lazy(() => import('./TrainAIView').then(m => ({ default: m.TrainAIView })));
const AssetsView = lazy(() => import('./AssetsView').then(m => ({ default: m.AssetsView })));

// Loading fallback component
function ViewLoadingFallback() {
  return (
    <div className="flex items-center justify-center h-full min-h-[400px]">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  );
}

// Map views to their components
function getViewComponent(view: DashboardView): React.LazyExoticComponent<React.ComponentType<any>> | null {
  switch (view) {
    case 'notebook':
      return NotebookView;
    case 'overview':
      return OverviewView;
    case 'team':
      return TeamView;
    case 'billing':
      return BillingView;
    case 'analytics':
      return AnalyticsView;
    case 'train-ai':
      return TrainAIView;
    case 'assets':
      return AssetsView;
    default:
      return null;
  }
}

interface DashboardViewRendererProps {
  // Initial data that can be passed from server
  initialTeamId?: string;
  initialTeamName?: string;
  initialTeamLogo?: string | null;
  // Fallback for views not yet implemented as client components
  children?: React.ReactNode;
}

export function DashboardViewRenderer({ 
  initialTeamId, 
  initialTeamName, 
  initialTeamLogo,
  children 
}: DashboardViewRendererProps) {
  const { currentView, isTransitioning } = useDashboardView();
  const [mounted, setMounted] = useState(false);
  
  // Track which views have been rendered for caching
  const [renderedViews, setRenderedViews] = useState<Set<DashboardView>>(new Set([currentView]));

  useEffect(() => {
    setMounted(true);
  }, []);

  // Add current view to rendered set when it changes
  useEffect(() => {
    if (!renderedViews.has(currentView)) {
      setRenderedViews(prev => new Set([...prev, currentView]));
    }
  }, [currentView, renderedViews]);

  // Before hydration, render children (server-rendered content)
  if (!mounted) {
    return <>{children}</>;
  }

  const ViewComponent = getViewComponent(currentView);

  // If no view component exists for this route, fall back to children
  if (!ViewComponent) {
    return <>{children}</>;
  }

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={currentView}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{
          duration: 0.2,
          ease: [0.4, 0, 0.2, 1],
        }}
        className="h-full min-h-0"
      >
        <Suspense fallback={<ViewLoadingFallback />}>
          {currentView === 'notebook' ? (
            <NotebookView 
              initialTeamId={initialTeamId}
              initialTeamName={initialTeamName}
              initialTeamLogo={initialTeamLogo}
            />
          ) : currentView === 'overview' ? (
            <OverviewView />
          ) : currentView === 'assets' ? (
            <AssetsView />
          ) : (
            <ViewComponent />
          )}
        </Suspense>
      </motion.div>
    </AnimatePresence>
  );
}
