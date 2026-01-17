'use client';

/**
 * PathCard component displays a single introduction path
 * Shows nodes, score, explanation, and actions
 */

import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface Person {
  id: string;
  names: string[];
  title?: string;
}

interface Edge {
  id: string;
  strength: number;
  fromPersonId: string;
  toPersonId: string;
}

interface Path {
  nodes: Person[];
  edges: Edge[];
  score: number;
  explanation: string;
}

interface PathCardProps {
  path: Path;
  isSelected: boolean;
  onSelect: () => void;
}

export function PathCard({ path, isSelected, onSelect }: PathCardProps) {
  const pathString = path.nodes.map((n) => n.names[0]).join(' → ');
  const scorePercent = Math.round(path.score * 100);

  return (
    <Card
      className={`p-4 cursor-pointer transition-colors hover:bg-accent ${
        isSelected ? 'border-primary border-2' : ''
      }`}
      onClick={onSelect}
    >
      <div className="flex items-start justify-between mb-2">
        <Badge variant={scorePercent >= 70 ? 'default' : 'secondary'}>
          {scorePercent}% strength
        </Badge>
        <span className="text-xs text-muted-foreground">
          {path.edges.length} hop{path.edges.length > 1 ? 's' : ''}
        </span>
      </div>

      <div className="text-sm font-medium mb-2 line-clamp-2">{pathString}</div>

      <div className="text-xs text-muted-foreground mb-3 line-clamp-3">
        {path.explanation}
      </div>

      <Button
        size="sm"
        variant="outline"
        onClick={(e) => {
          e.stopPropagation();
          // TODO: Open outreach composer
          console.log('Generate intro request for path:', path);
        }}
      >
        Generate Intro Request
      </Button>
    </Card>
  );
}
