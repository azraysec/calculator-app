/**
 * Inngest API Route
 *
 * This endpoint serves the Inngest functions to the Inngest platform.
 * It handles:
 * - Function registration
 * - Event delivery
 * - Webhook signatures verification
 *
 * Environment variables required:
 * - INNGEST_EVENT_KEY: For publishing events
 * - INNGEST_SIGNING_KEY: For webhook verification (production)
 */

import { serve } from 'inngest/next';
import { inngest, functions } from '@wig/brokers';

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions,
});
