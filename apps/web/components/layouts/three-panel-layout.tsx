/**
 * Three-panel layout for Intro Finder
 * Left: Paths list, Center: Graph visualization, Right: Details
 */

import { ReactNode } from 'react';

interface ThreePanelLayoutProps {
  leftPanel: ReactNode;
  centerPanel: ReactNode;
  rightPanel: ReactNode;
}

export function ThreePanelLayout({
  leftPanel,
  centerPanel,
  rightPanel,
}: ThreePanelLayoutProps) {
  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <header className="border-b px-6 py-4 bg-background">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Warm Intro Graph</h1>
          <div className="text-sm text-muted-foreground">
            Find warm introduction paths through your network
          </div>
        </div>
      </header>

      {/* Three-column grid */}
      <div className="flex-1 grid grid-cols-12 gap-4 p-4 overflow-hidden">
        {/* Left panel: Paths */}
        <div className="col-span-3 overflow-y-auto border rounded-lg p-4 bg-card">
          {leftPanel}
        </div>

        {/* Center panel: Graph visualization */}
        <div className="col-span-6 border rounded-lg bg-card overflow-hidden">
          {centerPanel}
        </div>

        {/* Right panel: Details */}
        <div className="col-span-3 overflow-y-auto border rounded-lg p-4 bg-card">
          {rightPanel}
        </div>
      </div>
    </div>
  );
}
