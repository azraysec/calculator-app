# Troubleshooting: Empty Network Data on Vercel

## Current Status

✅ **Database seeded successfully** - 9 people, 10 edges confirmed in Neon database
❌ **Vercel not showing data** - API endpoints returning empty results
❌ **Recent deployments failing** - Multiple Error status deployments

## The Problem

The production database has been seeded with data, but Vercel deployments are not connecting to it properly or are experiencing deployment failures.

## Verified Facts

1. Database contains:
   - 9 people (including "me" user with ID `me`)
   - 10 relationship edges
   - 3 organizations
   - All data confirmed via direct database queries

2. Local queries work perfectly:
   ```bash
   DATABASE_URL="postgresql://..." npx tsx check-me.ts
   # Returns: User "me": EXISTS with 9 total people
   ```

3. Vercel API returns empty:
   ```bash
   curl https://calculator-app-dun-chi.vercel.app/api/network
   # Returns: {"people":[],"edges":[],"stats":{...all zeros}}
   ```

## Possible Causes

### 1. DATABASE_URL Not Set Correctly on Vercel
The environment variable was recently updated, but Vercel might need a manual redeploy to pick it up.

### 2. Prisma Client Cache
Vercel's serverless functions might be using a cached Prisma client that's not connecting to the new database.

### 3. Deployment Protection
Some preview deployments are behind authentication, which could interfere with testing.

### 4. Build Failures
Recent deployments (last 4) show "Error" status, which might indicate build or runtime issues.

## Solutions to Try

### Solution 1: Force Clean Redeploy (Recommended)
```bash
# Remove node_modules and .next to force clean build
git clean -fdx
pnpm install

# Force production deploy
vercel --prod --force
```

### Solution 2: Verify and Reset DATABASE_URL
```bash
# Check current value
vercel env ls production

# If needed, remove and re-add
vercel env rm DATABASE_URL production
echo "postgresql://neondb_owner:npg_1a4tkmwEiTPQ@ep-holy-grass-ah9z4cck-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require" | vercel env add DATABASE_URL production

# Trigger new deployment
vercel --prod
```

### Solution 3: Clear Vercel Cache
```bash
# Use Vercel dashboard
# 1. Go to https://vercel.com/ray-security/calculator-app
# 2. Settings → General → Clear Build Cache
# 3. Redeploy from Deployments tab
```

### Solution 4: Check Deployment Logs
```bash
# Get latest successful deployment
vercel ls

# Inspect a specific deployment
vercel inspect <deployment-url>

# View runtime logs (once deployment is ready)
vercel logs <deployment-url>
```

### Solution 5: Test with Vercel CLI
```bash
# Use authenticated curl
vercel curl /api/network

# This bypasses deployment protection and uses your auth
```

### Solution 6: Verify Prisma Generation
```bash
# In packages/db
cd packages/db
pnpm generate

# Verify no errors, then deploy
cd ../..
git add -A
git commit -m "Regenerate Prisma client"
git push origin master
```

## Quick Verification Steps

After trying any solution:

1. **Check deployment status**:
   ```bash
   vercel ls
   # Look for "● Ready" status on latest deployment
   ```

2. **Test API endpoint**:
   ```bash
   curl https://calculator-app-dun-chi.vercel.app/api/network
   # Should return people and edges arrays with data
   ```

3. **Test debug endpoint**:
   ```bash
   curl https://calculator-app-dun-chi.vercel.app/api/debug
   # Should show database_url: "SET" and counts > 0
   ```

4. **Check main UI**:
   - Visit https://calculator-app-dun-chi.vercel.app
   - Go to "My Network" tab
   - Should show 9 people with connection statistics

## Most Likely Fix

Based on the symptoms, **Solution 1 (Force Clean Redeploy)** is most likely to work. The deployment failures suggest a build cache issue or corrupted state.

Try this command sequence:
```bash
vercel --prod --force
```

Then wait 1-2 minutes for the deployment to complete and test:
```bash
curl https://calculator-app-dun-chi.vercel.app/api/network
```

## If Still Not Working

If none of the above work, the nuclear option is to:

1. Delete the Vercel project entirely
2. Recreate it from scratch
3. Set environment variables fresh
4. Deploy

But this should be a last resort - one of the solutions above should work.

## Contact/Support

- Check Vercel deployment logs in the dashboard
- Look for any error messages in the Functions tab
- Ensure DATABASE_URL environment variable is set for "Production" environment

Last updated: 2026-01-24
