/**
 * Vercel Queue Client Configuration
 */

import { Queue } from '@vercel/queue';

// LinkedIn archive processing queue
export const linkedInQueue = new Queue('linkedin-process', {
  // Queue will invoke /api/queue/linkedin-process
  invokeUrl: '/api/queue/linkedin-process',
});
