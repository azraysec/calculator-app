/**
 * Inngest API endpoint for serving functions
 * This route handles all Inngest communication
 */

import { serve } from 'inngest/next';
import { inngest } from '@/lib/event-bus';
import { inngestFunctions } from '@/lib/inngest-functions';

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: inngestFunctions,
});
