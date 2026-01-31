"use client";

/**
 * Privacy Settings Component
 *
 * Allows users to configure privacy levels for their data sources.
 * Displays clear information about what each privacy level means.
 */

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { DataSourceConnection } from './data-source-card';

interface PrivacySettingsProps {
  connection: DataSourceConnection;
  onUpdate: (privacyLevel: 'PRIVATE' | 'CONNECTIONS_ONLY' | 'PUBLIC') => Promise<void>;
}

const PRIVACY_LEVELS = [
  {
    value: 'PRIVATE' as const,
    label: 'Private',
    icon: '🔒',
    description: 'Only you can see your data. No one else can access your connections or messages.',
    recommended: true,
  },
  {
    value: 'CONNECTIONS_ONLY' as const,
    label: 'Connections Only',
    icon: '👥',
    description: 'Your direct connections can see limited metadata. Useful for team introductions.',
    recommended: false,
  },
  {
    value: 'PUBLIC' as const,
    label: 'Public',
    icon: '🌍',
    description: 'All users can see your public profile and connection metadata. Not recommended.',
    recommended: false,
  },
];

export function PrivacySettings({ connection, onUpdate }: PrivacySettingsProps) {
  const [selectedLevel, setSelectedLevel] = useState(connection.privacyLevel);
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (selectedLevel === connection.privacyLevel) {
      return; // No change
    }

    setLoading(true);
    try {
      await onUpdate(selectedLevel);
    } finally {
      setLoading(false);
    }
  };

  const hasChanged = selectedLevel !== connection.privacyLevel;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Privacy Settings</CardTitle>
        <CardDescription>
          Control who can see your {connection.sourceType.toLowerCase()} data
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Privacy Level Options */}
          <div className="space-y-3">
            {PRIVACY_LEVELS.map((level) => {
              const isSelected = selectedLevel === level.value;
              return (
                <div
                  key={level.value}
                  className={`border rounded-lg p-4 cursor-pointer transition-all ${
                    isSelected
                      ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                      : 'border-border hover:border-primary/50'
                  }`}
                  onClick={() => setSelectedLevel(level.value)}
                >
                  <div className="flex items-start gap-3">
                    <div className="text-2xl mt-1">{level.icon}</div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold">{level.label}</h4>
                        {level.recommended && (
                          <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded">
                            Recommended
                          </span>
                        )}
                        {isSelected && (
                          <span className="text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded">
                            Current
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {level.description}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Save Button */}
          {hasChanged && (
            <div className="pt-4 border-t">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  You have unsaved changes
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setSelectedLevel(connection.privacyLevel)}
                    disabled={loading}
                  >
                    Cancel
                  </Button>
                  <Button onClick={handleSave} disabled={loading}>
                    {loading ? 'Saving...' : 'Save Changes'}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* MVP Notice */}
          <div className="pt-4 border-t">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="flex gap-2">
                <div className="text-blue-600 mt-0.5">ℹ️</div>
                <div className="text-sm text-blue-900">
                  <p className="font-medium mb-1">MVP Privacy Model</p>
                  <p>
                    Currently, all privacy levels default to PRIVATE. Advanced sharing
                    features (connections-only and public) will be enabled in a future update.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
