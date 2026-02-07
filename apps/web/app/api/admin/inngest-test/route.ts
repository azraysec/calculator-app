/**
 * Admin API to test Inngest event sending
 * POST /api/admin/inngest-test - Send a test event to Inngest
 */

import { NextResponse } from 'next/server';
import { inngest } from '@/lib/event-bus';

export async function POST() {
  try {
    console.log('[Inngest Test] Attempting to send test event...');
    console.log('[Inngest Test] Event key present:', !!process.env.INNGEST_EVENT_KEY);
    console.log('[Inngest Test] Signing key present:', !!process.env.INNGEST_SIGNING_KEY);

    const result = await inngest.send({
      name: 'test.ping',
      data: {
        message: 'Test event from admin endpoint',
        timestamp: new Date().toISOString(),
      },
    });

    console.log('[Inngest Test] Event sent successfully:', result);

    return NextResponse.json({
      success: true,
      message: 'Test event sent to Inngest',
      result,
      config: {
        hasEventKey: !!process.env.INNGEST_EVENT_KEY,
        hasSigningKey: !!process.env.INNGEST_SIGNING_KEY,
        eventKeyPrefix: process.env.INNGEST_EVENT_KEY?.substring(0, 10) + '...',
      },
    });
  } catch (error) {
    console.error('[Inngest Test] Failed to send event:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to send test event',
        details: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Use POST to send a test event',
    config: {
      hasEventKey: !!process.env.INNGEST_EVENT_KEY,
      hasSigningKey: !!process.env.INNGEST_SIGNING_KEY,
    },
  });
}
