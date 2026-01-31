/**
 * Data Source Connections API
 * Manages user's connected data sources (LinkedIn, Gmail, etc.)
 *
 * GET /api/data-sources - List all data sources for current user
 * POST /api/data-sources - Create/update a data source connection
 */

import { NextResponse } from 'next/server';
import { prisma } from '@wig/db';
import { withAuth } from '@/lib/auth-helpers';

/**
 * GET /api/data-sources
 * Returns all data source connections for the authenticated user
 */
export const GET = withAuth(async (_request, { userId }) => {
  try {
    const connections = await prisma.dataSourceConnection.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({
      connections: connections.map((conn) => ({
        id: conn.id,
        sourceType: conn.sourceType,
        connectionStatus: conn.connectionStatus,
        privacyLevel: conn.privacyLevel,
        lastSyncedAt: conn.lastSyncedAt,
        metadata: conn.metadata,
        createdAt: conn.createdAt,
        updatedAt: conn.updatedAt,
      })),
    });
  } catch (error) {
    console.error('Error fetching data sources:', error);
    return NextResponse.json(
      { error: 'Failed to fetch data sources' },
      { status: 500 }
    );
  }
});

/**
 * POST /api/data-sources
 * Create or update a data source connection
 */
export const POST = withAuth(async (request, { userId }) => {
  try {
    const body = await request.json();
    const { sourceType, privacyLevel, metadata } = body;

    if (!sourceType) {
      return NextResponse.json(
        { error: 'sourceType is required' },
        { status: 400 }
      );
    }

    // Check if connection already exists
    const existing = await prisma.dataSourceConnection.findUnique({
      where: {
        userId_sourceType: {
          userId,
          sourceType,
        },
      },
    });

    let connection;

    if (existing) {
      // Update existing connection
      connection = await prisma.dataSourceConnection.update({
        where: { id: existing.id },
        data: {
          privacyLevel: privacyLevel || existing.privacyLevel,
          metadata: metadata || existing.metadata,
          updatedAt: new Date(),
        },
      });
    } else {
      // Create new connection
      connection = await prisma.dataSourceConnection.create({
        data: {
          userId,
          sourceType,
          connectionStatus: 'DISCONNECTED',
          privacyLevel: privacyLevel || 'PRIVATE',
          metadata,
        },
      });
    }

    return NextResponse.json({
      connection: {
        id: connection.id,
        sourceType: connection.sourceType,
        connectionStatus: connection.connectionStatus,
        privacyLevel: connection.privacyLevel,
        lastSyncedAt: connection.lastSyncedAt,
        metadata: connection.metadata,
        createdAt: connection.createdAt,
        updatedAt: connection.updatedAt,
      },
    });
  } catch (error) {
    console.error('Error creating/updating data source:', error);
    return NextResponse.json(
      { error: 'Failed to create/update data source' },
      { status: 500 }
    );
  }
});
