'use client';

/**
 * PersonNode - Custom React Flow node for displaying people
 */

import { memo } from 'react';
import { Handle, Position } from 'reactflow';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';

interface PersonNodeData {
  name: string;
  title?: string;
  isTarget: boolean;
  isSource: boolean;
}

export const PersonNode = memo(({ data }: { data: PersonNodeData }) => {
  const initials = data.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase();

  return (
    <div className="px-4 py-3 shadow-lg rounded-lg bg-card border-2 border-border min-w-[200px]">
      <Handle type="target" position={Position.Left} className="w-2 h-2" />

      <div className="flex items-center gap-3 mb-2">
        <Avatar className="h-10 w-10">
          <AvatarFallback className="text-xs">{initials}</AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-sm truncate">{data.name}</div>
          {data.title && (
            <div className="text-xs text-muted-foreground truncate">
              {data.title}
            </div>
          )}
        </div>
      </div>

      <div className="flex gap-1">
        {data.isSource && (
          <Badge variant="outline" className="text-xs">
            You
          </Badge>
        )}
        {data.isTarget && (
          <Badge variant="default" className="text-xs">
            Target
          </Badge>
        )}
      </div>

      <Handle type="source" position={Position.Right} className="w-2 h-2" />
    </div>
  );
});

PersonNode.displayName = 'PersonNode';
