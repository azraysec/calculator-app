/**
 * Basic health check endpoint
 * Returns 200 OK if the service is running
 */

import { NextResponse } from 'next/server';
import packageJson from '../../../package.json';

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'WIG API',
    version: packageJson.version,
  });
}
