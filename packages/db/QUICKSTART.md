# Quick Start Guide - WIG Database

Get the WIG database up and running in minutes.

## 1. Start PostgreSQL (Docker)

```bash
cd packages/db
docker-compose up -d postgres
```

This starts a PostgreSQL 16 container with:
- Port: 5432
- User: postgres
- Password: postgres
- Database: wig_dev

Verify it's running:
```bash
docker ps | grep wig-postgres
```

## 2. Configure Environment

```bash
cp .env.example .env
```

The default `.env` file should work with Docker:
```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/wig_dev?schema=public"
NODE_ENV="development"
```

## 3. Install Dependencies

```bash
npm install
```

## 4. Generate Prisma Client

```bash
npm run generate
```

This generates TypeScript types from your schema.

## 5. Run Migrations

```bash
npm run migrate
```

This creates all database tables based on the Prisma schema.

## 6. Seed Development Data

```bash
npm run seed
```

This populates your database with:
- 3 Organizations
- 8 People with various professional roles
- 8 Relationship Edges with strength scores
- 5 Sample Interactions
- 4 Configured Sync States
- 3 Audit Log entries

## 7. Explore with Prisma Studio

```bash
npm run studio
```

Open your browser to `http://localhost:5555` to visually browse and edit data.

## 8. Verify Setup

Create a test script `test-connection.ts`:

```typescript
import { prisma, isDatabaseHealthy } from './src/index';

async function test() {
  console.log('Testing database connection...');

  const healthy = await isDatabaseHealthy();
  console.log('Database healthy:', healthy);

  const personCount = await prisma.person.count();
  console.log('People in database:', personCount);

  const people = await prisma.person.findMany({
    take: 3,
    include: {
      organization: true,
      outgoingEdges: {
        include: {
          toPerson: true,
        },
      },
    },
  });

  console.log('\nSample people with relationships:');
  people.forEach(person => {
    console.log(`\n${person.names[0]} - ${person.title} @ ${person.organization?.name}`);
    console.log(`  Connections: ${person.outgoingEdges.length}`);
    person.outgoingEdges.forEach(edge => {
      console.log(`    -> ${edge.toPerson.names[0]} (strength: ${edge.strength})`);
    });
  });

  await prisma.$disconnect();
}

test().catch(console.error);
```

Run it:
```bash
npx tsx test-connection.ts
```

## Optional: pgAdmin GUI

Start pgAdmin for a full-featured database GUI:

```bash
docker-compose up -d pgadmin
```

Access at `http://localhost:5050`:
- Email: admin@wig.local
- Password: admin

Add server connection:
- Host: postgres (or localhost if outside Docker)
- Port: 5432
- User: postgres
- Password: postgres

## Common Commands

```bash
# Stop database
docker-compose down

# Stop and remove all data
docker-compose down -v

# View logs
docker-compose logs -f postgres

# Access PostgreSQL shell
docker exec -it wig-postgres psql -U postgres -d wig_dev

# Backup database
docker exec wig-postgres pg_dump -U postgres wig_dev > backup.sql

# Restore database
docker exec -i wig-postgres psql -U postgres wig_dev < backup.sql
```

## Troubleshooting

### Port 5432 Already in Use

If you have PostgreSQL already running locally:

**Option 1:** Stop local PostgreSQL
```bash
# macOS
brew services stop postgresql

# Linux
sudo systemctl stop postgresql

# Windows
net stop postgresql-x64-14
```

**Option 2:** Change port in docker-compose.yml
```yaml
ports:
  - '5433:5432'  # Use 5433 on host
```

And update `.env`:
```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5433/wig_dev?schema=public"
```

### Migration Errors

Reset everything:
```bash
npm run migrate:reset
```

### Client Not Updating

Delete and regenerate:
```bash
rm -rf node_modules/.prisma
npm run generate
```

### Connection Refused

Ensure Docker is running:
```bash
docker ps
```

Check database logs:
```bash
docker-compose logs postgres
```

## Next Steps

- Explore the schema: `packages/db/prisma/schema.prisma`
- Read the full documentation: `packages/db/README.md`
- Import into your application: `import { prisma } from '@wig/db'`
- Build graph traversal queries
- Implement entity resolution logic

## Production Deployment

For production, use a managed PostgreSQL service:

- **AWS RDS**: Fully managed PostgreSQL
- **Google Cloud SQL**: Managed database service
- **DigitalOcean Managed Databases**: Simple and affordable
- **Neon**: Serverless PostgreSQL
- **Supabase**: PostgreSQL with additional features

Update `DATABASE_URL` environment variable with production credentials.

Run migrations:
```bash
npm run migrate:deploy
```

**Never seed production databases!** Remove or comment out seed scripts.
