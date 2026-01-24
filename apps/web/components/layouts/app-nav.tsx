'use client';

/**
 * App Navigation Component
 * Main navigation links for the application
 */

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  Search,
  Users,
  Building2,
  Database,
  CheckSquare,
  GitMerge,
  Zap,
  Settings
} from 'lucide-react';

const navItems = [
  {
    href: '/',
    label: 'Intro Finder',
    icon: Search,
  },
  {
    href: '/data-sources',
    label: 'Data Sources',
    icon: Database,
  },
  {
    href: '/people',
    label: 'People',
    icon: Users,
    disabled: true,
  },
  {
    href: '/organizations',
    label: 'Organizations',
    icon: Building2,
    disabled: true,
  },
  {
    href: '/tasks',
    label: 'Tasks',
    icon: CheckSquare,
    disabled: true,
  },
  {
    href: '/review-queue',
    label: 'Review Queue',
    icon: GitMerge,
    disabled: true,
  },
  {
    href: '/automations',
    label: 'Automations',
    icon: Zap,
    disabled: true,
  },
  {
    href: '/settings',
    label: 'Settings',
    icon: Settings,
    disabled: true,
  },
];

export function AppNav() {
  const pathname = usePathname();

  return (
    <nav className="space-y-1">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = pathname === item.href;

        return (
          <Link
            key={item.href}
            href={item.disabled ? '#' : item.href}
            className={cn(
              'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
              isActive
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground',
              item.disabled && 'opacity-50 cursor-not-allowed'
            )}
            aria-disabled={item.disabled}
            onClick={(e) => item.disabled && e.preventDefault()}
          >
            <Icon className="w-4 h-4" />
            {item.label}
            {item.disabled && (
              <span className="ml-auto text-xs">(Soon)</span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
