'use client';

/**
 * Network Stats Bar Component
 * Compact dashboard showing key network statistics
 * Used at the top of the Connections tab
 */

import { useQuery } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Users, Link2, TrendingUp, Minus, TrendingDown, BarChart3 } from 'lucide-react';

interface NetworkStats {
  totalPeople: number;
  totalConnections: number;
  averageConnectionsPerPerson: number;
  strongConnections: number;
  mediumConnections: number;
  weakConnections: number;
}

interface NetworkData {
  stats: NetworkStats;
}

export function NetworkStatsBar() {
  const { data, isLoading, error } = useQuery<NetworkData>({
    queryKey: ['network'],
    queryFn: async () => {
      const res = await fetch('/api/network');
      if (!res.ok) throw new Error('Failed to fetch network');
      return res.json();
    },
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {[...Array(6)].map((_, i) => (
          <Skeleton key={i} className="h-20" />
        ))}
      </div>
    );
  }

  if (error || !data) {
    return null; // Silently fail - connections grid will still work
  }

  const stats = [
    {
      label: 'People',
      value: data.stats.totalPeople,
      icon: Users,
      color: 'text-blue-600',
    },
    {
      label: 'Connections',
      value: data.stats.totalConnections,
      icon: Link2,
      color: 'text-purple-600',
    },
    {
      label: 'Strong',
      value: data.stats.strongConnections,
      icon: TrendingUp,
      color: 'text-green-600',
      subtext: '≥70%',
    },
    {
      label: 'Medium',
      value: data.stats.mediumConnections,
      icon: Minus,
      color: 'text-yellow-600',
      subtext: '40-69%',
    },
    {
      label: 'Weak',
      value: data.stats.weakConnections,
      icon: TrendingDown,
      color: 'text-gray-500',
      subtext: '<40%',
    },
    {
      label: 'Avg/Person',
      value: data.stats.averageConnectionsPerPerson.toFixed(1),
      icon: BarChart3,
      color: 'text-indigo-600',
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
      {stats.map((stat) => (
        <Card key={stat.label} className="p-3">
          <div className="flex items-center gap-2">
            <stat.icon className={`h-4 w-4 ${stat.color}`} />
            <span className="text-xs text-muted-foreground">{stat.label}</span>
          </div>
          <div className={`text-2xl font-bold ${stat.color} mt-1`}>
            {stat.value}
          </div>
          {stat.subtext && (
            <div className="text-xs text-muted-foreground">{stat.subtext}</div>
          )}
        </Card>
      ))}
    </div>
  );
}
