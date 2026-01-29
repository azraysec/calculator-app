/**
 * Current User API
 * GET /api/me - Returns the current user's person record
 */

import { NextResponse } from 'next/server';
import { prisma } from '@wig/db';

export async function GET() {
  try {
    // Find person with isMe flag in metadata
    const mePerson = await prisma.person.findFirst({
      where: {
        metadata: {
          path: ['isMe'],
          equals: true,
        },
        deletedAt: null,
      },
      include: {
        organization: true,
      },
    });

    if (!mePerson) {
      return NextResponse.json(
        { error: 'Current user not found. Upload LinkedIn archive to create your profile.' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      id: mePerson.id,
      names: mePerson.names,
      emails: mePerson.emails,
      title: mePerson.title,
      organization: mePerson.organization,
    });
  } catch (error) {
    console.error('Error fetching current user:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
