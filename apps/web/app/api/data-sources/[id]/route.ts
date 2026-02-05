/**
 * Data Source Connection by ID API
 *
 * GET /api/data-sources/[id] - Get specific data source
 * PATCH /api/data-sources/[id] - Update data source settings
 * DELETE /api/data-sources/[id] - Delete/disconnect data source
 */

import { NextResponse } from 'next/server';
import { prisma } from '@wig/db';
import { withAuth, forbiddenResponse } from '@/lib/auth-helpers';

/**
 * GET /api/data-sources/[id]
 * Fetch a specific data source connection
 */
export const GET = withAuth(async (_request, { userId, params }) => {
  try {
    const { id: connectionId } = await params;
    if (!connectionId) {
      return NextResponse.json(
        { error: 'Data source ID is required' },
        { status: 400 }
      );
    }

    const connection = await prisma.dataSourceConnection.findUnique({
      where: { id: connectionId },
    });

    if (!connection) {
      return NextResponse.json(
        { error: 'Data source not found' },
        { status: 404 }
      );
    }

    // Ensure user owns this connection
    if (connection.userId !== userId) {
      return forbiddenResponse('You do not have access to this data source');
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
    console.error('Error fetching data source:', error);
    return NextResponse.json(
      { error: 'Failed to fetch data source' },
      { status: 500 }
    );
  }
});

/**
 * PATCH /api/data-sources/[id]
 * Update data source privacy settings
 */
export const PATCH = withAuth(async (request, { userId, params }) => {
  try {
    const { id: connectionId } = await params;
    if (!connectionId) {
      return NextResponse.json(
        { error: 'Data source ID is required' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { privacyLevel, metadata } = body;

    const connection = await prisma.dataSourceConnection.findUnique({
      where: { id: connectionId },
    });

    if (!connection) {
      return NextResponse.json(
        { error: 'Data source not found' },
        { status: 404 }
      );
    }

    // Ensure user owns this connection
    if (connection.userId !== userId) {
      return forbiddenResponse('You do not have access to this data source');
    }

    const updated = await prisma.dataSourceConnection.update({
      where: { id: connectionId },
      data: {
        ...(privacyLevel && { privacyLevel }),
        ...(metadata && { metadata }),
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({
      connection: {
        id: updated.id,
        sourceType: updated.sourceType,
        connectionStatus: updated.connectionStatus,
        privacyLevel: updated.privacyLevel,
        lastSyncedAt: updated.lastSyncedAt,
        metadata: updated.metadata,
        createdAt: updated.createdAt,
        updatedAt: updated.updatedAt,
      },
    });
  } catch (error) {
    console.error('Error updating data source:', error);
    return NextResponse.json(
      { error: 'Failed to update data source' },
      { status: 500 }
    );
  }
});

/**
 * DELETE /api/data-sources/[id]
 * Delete/disconnect a data source
 */
export const DELETE = withAuth(async (_request, { userId, params }) => {
  try {
    const { id: connectionId } = await params;
    if (!connectionId) {
      return NextResponse.json(
        { error: 'Data source ID is required' },
        { status: 400 }
      );
    }

    const connection = await prisma.dataSourceConnection.findUnique({
      where: { id: connectionId },
    });

    if (!connection) {
      return NextResponse.json(
        { error: 'Data source not found' },
        { status: 404 }
      );
    }

    // Ensure user owns this connection
    if (connection.userId !== userId) {
      return forbiddenResponse('You do not have access to this data source');
    }

    await prisma.dataSourceConnection.delete({
      where: { id: connectionId },
    });

    return NextResponse.json({
      success: true,
      message: 'Data source disconnected successfully',
    });
  } catch (error) {
    console.error('Error deleting data source:', error);
    return NextResponse.json(
      { error: 'Failed to delete data source' },
      { status: 500 }
    );
  }
});
