# Seed Production Database

The production database is currently empty. Here's how to seed it with test data.

## Option 1: Manual Seed (Recommended for First Time)

Run the seed script against your production database:

```bash
# Set the production DATABASE_URL temporarily
export DATABASE_URL="your-production-database-url"

# Run the seed script
cd packages/db
pnpm seed
```

This will create:
- 5 people (You, Alice, Bob, Jane, Charlie)
- 2 organizations (Startup Co, Big Corp)
- 6 connections between people
- 3 sample interactions

## Option 2: Using Vercel CLI

You can run the seed command on Vercel:

```bash
vercel env pull
cd packages/db
pnpm seed
```

## Option 3: Create Seed API Endpoint

For easier seeding in production, create an API endpoint:

**File**: `apps/web/app/api/seed/route.ts`

```typescript
import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export async function POST(request: Request) {
  // Add authentication check here!
  const { authorization } = Object.fromEntries(request.headers);

  if (authorization !== `Bearer ${process.env.SEED_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await execAsync('cd ../../packages/db && pnpm seed');
    return NextResponse.json({ success: true, message: 'Database seeded successfully' });
  } catch (error) {
    return NextResponse.json({ error: 'Seed failed', details: error }, { status: 500 });
  }
}
```

Then call it:

```bash
curl -X POST https://calculator-app-dun-chi.vercel.app/api/seed \
  -H "Authorization: Bearer your-secret-key"
```

## What Gets Seeded

The seed script creates realistic test data:

### People
1. **You** (me) - Software Engineer
2. **Jane Doe** - CTO at Big Corp (target person)
3. **Alice Smith** - Founder & CEO at Startup Co
4. **Bob Johnson** - VP of Engineering at Big Corp
5. **Charlie Brown** - CTO at Startup Co

### Introduction Paths
- **Path 1**: You → Alice → Jane (2 hops, strong 85% connection)
- **Path 2**: You → Bob → Jane (2 hops, weaker 65% connection to Bob)
- **Path 3**: You → Alice → Charlie → Bob → Jane (4 hops, longest path)

### Organizations
- Startup Co (3 people)
- Big Corp (2 people)

## After Seeding

Once seeded, you should see:
- **My Network tab**: 5 people with connection strengths
- **Intro Finder**: Search for "Jane" to see 2-3 introduction paths
- **Statistics**: Connection counts and quality metrics

## Verify Seeding

Check if data was created:

```bash
# Using Prisma Studio
cd packages/db
pnpm studio

# Or query via SQL
psql $DATABASE_URL -c "SELECT COUNT(*) FROM \"Person\";"
```

You should see 5 people in the database.
