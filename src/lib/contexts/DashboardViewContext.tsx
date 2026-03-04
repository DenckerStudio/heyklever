"use client";

import React, { createContext, useContext, useState, useCallback, useEffect, useMemo } from 'react';
import { usePathname, useRouter } from 'next/navigation';

export type DashboardView = 
  | 'notebook' 
  | 'overview'
  | 'team' 
  | 'assets'
  | 'billing' 
  | 'analytics' 
  | 'settings' 
  | 'docs'
  | 'public-docs'
  | 'features'
  | 'chat'
  | 'train-ai'
  | 'welcome';

// Map URL paths to view names
const pathToView: Record<string, DashboardView> = {
  '/dashboard': 'notebook',
  '/dashboard/overview': 'overview',
  '/dashboard/team': 'team',
  '/dashboard/assets': 'assets',
  '/dashboard/billing': 'billing',
  '/dashboard/analytics': 'analytics',
  '/dashboard/settings': 'settings',
  '/dashboard/docs': 'docs',
  '/dashboard/public-docs': 'public-docs',
  '/dashboard/features': 'features',
  '/dashboard/chat': 'chat',
  '/dashboard/train-ai': 'train-ai',
  '/dashboard/welcome': 'welcome',
};

// Map view names to URL paths
const viewToPath: Record<DashboardView, string> = {
  'notebook': '/dashboard',
  'overview': '/dashboard/overview',
  'team': '/dashboard/team',
  'assets': '/dashboard/assets',
  'billing': '/dashboard/billing',
  'analytics': '/dashboard/analytics',
  'settings': '/dashboard/settings',
  'docs': '/dashboard/docs',
  'public-docs': '/dashboard/public-docs',
  'features': '/dashboard/features',
  'chat': '/dashboard/chat',
  'train-ai': '/dashboard/train-ai',
  'welcome': '/dashboard/welcome',
};

interface DashboardViewContextValue {
  currentView: DashboardView;
  setView: (view: DashboardView) => void;
  navigateTo: (view: DashboardView) => void;
  isTransitioning: boolean;
}

const DashboardViewContext = createContext<DashboardViewContextValue | null>(null);

export function DashboardViewProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [currentView, setCurrentView] = useState<DashboardView>(() => {
    return pathToView[pathname] || 'notebook';
  });
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Persist last-visited view to localStorage
  useEffect(() => {
    if (currentView && typeof window !== 'undefined') {
      try { localStorage.setItem('klever_last_view', currentView); } catch {}
    }
  }, [currentView]);

  // Sync view with URL when navigating via browser back/forward
  useEffect(() => {
    const view = pathToView[pathname];
    if (view && view !== currentView) {
      setCurrentView(view);
    }
  }, [pathname]); // eslint-disable-line react-hooks/exhaustive-deps

  const navigateTo = useCallback((view: DashboardView) => {
    if (view === currentView) return;
    
    setIsTransitioning(true);
    setCurrentView(view);
    
    const newPath = viewToPath[view];
    router.push(newPath);
    
    setTimeout(() => {
      setIsTransitioning(false);
    }, 50);
  }, [currentView, router]);

  const setView = useCallback((view: DashboardView) => {
    setCurrentView(view);
  }, []);

  const value = useMemo(() => ({
    currentView,
    setView,
    navigateTo,
    isTransitioning,
  }), [currentView, setView, navigateTo, isTransitioning]);

  return (
    <DashboardViewContext.Provider value={value}>
      {children}
    </DashboardViewContext.Provider>
  );
}

export function useDashboardView() {
  const context = useContext(DashboardViewContext);
  if (!context) {
    throw new Error('useDashboardView must be used within a DashboardViewProvider');
  }
  return context;
}

// Helper hook for sidebar navigation
export function useDashboardNavigation() {
  const { navigateTo, currentView } = useDashboardView();
  
  const isActive = useCallback((view: DashboardView) => {
    return currentView === view;
  }, [currentView]);

  return { navigateTo, isActive, currentView };
}
