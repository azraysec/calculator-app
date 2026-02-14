/**
 * Simple toast hook for notifications
 *
 * In a production app, this would integrate with a toast library
 * like react-hot-toast or sonner.
 */

import { useCallback } from 'react';

export interface ToastProps {
  title: string;
  description?: string;
  variant?: 'default' | 'destructive';
}

export function useToast() {
  const toast = useCallback((props: ToastProps) => {
    // For now, just log to console
    // In production, this would show a toast notification
    if (props.variant === 'destructive') {
      console.error(`Toast: ${props.title} - ${props.description || ''}`);
    } else {
      console.log(`Toast: ${props.title} - ${props.description || ''}`);
    }
  }, []);

  return { toast };
}
