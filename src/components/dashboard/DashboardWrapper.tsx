'use client';

import React from 'react';

/**
 * DashboardWrapper - Simple wrapper for dashboard pages
 * File uploads are handled locally in components that need them (NotebookLayout, etc.)
 */
export function DashboardWrapper({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
