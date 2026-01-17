# Deployment Guide - WIG Project

This guide covers deploying the Warm Intro Graph (WIG) application to Vercel with automatic GitHub integration.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [GitHub Setup](#github-setup)
3. [Vercel Setup](#vercel-setup)
4. [Environment Variables](#environment-variables)
5. [Deployment Process](#deployment-process)
6. [Monitoring and Health Checks](#monitoring-and-health-checks)
7. [Troubleshooting](#troubleshooting)

## Prerequisites

- GitHub account
- Vercel account (free tier is sufficient)
- Neon Postgres database (already configured)
- Inngest account (for background jobs)

## GitHub Setup

### 1. Create GitHub Repository

```bash
# If not already done, create a new repository on GitHub
# Then add it as a remote
git remote add origin https://github.com/YOUR_USERNAME/warm-intro-graph.git
```

### 2. Push Code to GitHub

```bash
# Add all files
git add .

# Commit with descriptive message
git commit -m "Initial WIG project deployment

- Complete monorepo with 5 packages
- Next.js 14+ web app with App Router
- Prisma database schema with Neon Postgres
- Inngest event-driven background jobs
- Scoring, pathfinding, and entity resolution
- Health check endpoints
- Rate limiting middleware
- CI/CD with GitHub Actions"

# Push to GitHub
git push -u origin master
```

### 3. GitHub Actions

The CI/CD workflow is already configured in `.github/workflows/ci.yml`. It will:

- Run linting and type checking
- Build all packages
- Run tests
- Perform security audits

This runs automatically on every push and pull request.

## Vercel Setup

### 1. Connect Repository to Vercel

1. Go to [vercel.com](https://vercel.com)
2. Click "Add New Project"
3. Import your GitHub repository
4. Vercel will auto-detect the monorepo and Next.js configuration

### 2. Configure Build Settings

Vercel should automatically detect the settings from `vercel.json`:

- **Framework Preset**: Next.js
- **Root Directory**: `./` (monorepo root)
- **Build Command**: `pnpm turbo build --filter=@wig/web`
- **Install Command**: `pnpm install`
- **Output Directory**: `apps/web/.next`

### 3. Configure Environment Variables

Add these environment variables in Vercel dashboard (Settings → Environment Variables):

#### Production Variables

```
DATABASE_URL = postgresql://neondb_owner:npg_1a4tkmwEiTPQ@ep-holy-grass-ah9z4cck-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require

INNGEST_EVENT_KEY = [Get from Inngest dashboard]
INNGEST_SIGNING_KEY = [Get from Inngest dashboard]
```

#### Preview and Development

Set the same variables for preview and development environments, or use separate Neon branches for each environment.

### 4. Deploy

Click "Deploy" and Vercel will:

1. Install dependencies with `pnpm install`
2. Build all packages using Turborepo
3. Deploy the Next.js application
4. Generate a deployment URL

## Environment Variables

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | Neon Postgres connection string | `postgresql://...` |
| `INNGEST_EVENT_KEY` | Inngest event key for publishing events | `evt_...` |
| `INNGEST_SIGNING_KEY` | Inngest signing key for webhook verification | `signkey_...` |

### Optional Variables (Future)

| Variable | Description | Default |
|----------|-------------|---------|
| `NEXT_PUBLIC_APP_URL` | Public URL of the application | Auto-detected |
| `ENABLE_ANALYTICS` | Enable analytics tracking | `false` |
| `LOG_LEVEL` | Logging level | `info` |

## Deployment Process

### Automatic Deployment

Every push to the `master` branch triggers an automatic deployment:

1. GitHub Actions runs CI checks
2. On success, Vercel automatically deploys
3. Deployment URL is available in Vercel dashboard

### Manual Deployment

To trigger a manual deployment:

```bash
# Using Vercel CLI
pnpm vercel --prod

# Or use the Vercel dashboard
# Go to your project → Deployments → "Redeploy"
```

### Preview Deployments

Every pull request automatically gets a preview deployment:

1. Create a PR on GitHub
2. Vercel automatically builds and deploys a preview
3. Preview URL is posted as a comment on the PR

## Monitoring and Health Checks

### Health Check Endpoints

The application includes health check endpoints:

- **Basic Health**: `https://your-app.vercel.app/health`
  - Returns 200 if app is running

- **Readiness Probe**: `https://your-app.vercel.app/health/ready`
  - Checks database connectivity
  - Returns 200 if database is accessible
  - Returns 503 if database is unavailable

### Vercel Monitoring

Monitor your deployment in the Vercel dashboard:

- **Analytics**: View page views and web vitals
- **Logs**: Real-time function logs
- **Speed Insights**: Performance metrics
- **Deployments**: Deployment history and status

### Database Monitoring

Monitor Neon Postgres in the Neon console:

- **Connections**: Active database connections
- **Storage**: Database size and growth
- **Operations**: Query performance

## Troubleshooting

### Build Failures

**Problem**: Build fails with TypeScript errors

**Solution**:
```bash
# Run locally to reproduce
pnpm turbo build

# Check type errors
pnpm turbo typecheck
```

**Problem**: Build fails with missing dependencies

**Solution**:
```bash
# Clear lock file and reinstall
rm -rf node_modules pnpm-lock.yaml
pnpm install
```

### Database Connection Issues

**Problem**: Health check fails with database error

**Solution**:
1. Verify `DATABASE_URL` in Vercel environment variables
2. Check Neon console for database status
3. Ensure connection pooling is enabled (URL should use `-pooler` endpoint)

**Problem**: SSL/TLS errors

**Solution**:
Ensure connection string includes:
```
?sslmode=require&channel_binding=require
```

### Inngest Integration Issues

**Problem**: Events not being processed

**Solution**:
1. Verify Inngest keys in environment variables
2. Check Inngest dashboard for event delivery status
3. Ensure `/api/inngest` endpoint is accessible

### Performance Issues

**Problem**: Slow response times

**Solution**:
1. Check Vercel function logs for cold starts
2. Verify database query performance in Neon console
3. Consider enabling Edge runtime for specific routes

## Post-Deployment Checklist

After successful deployment:

- [ ] Verify health checks are passing
- [ ] Test database connectivity through `/health/ready`
- [ ] Confirm Inngest webhook is receiving events
- [ ] Check Vercel logs for any errors
- [ ] Test rate limiting (100 req/min per IP)
- [ ] Verify security headers are applied

## Future Enhancements

### Custom Domain

1. Purchase domain (e.g., from Vercel Domains)
2. Add custom domain in Vercel dashboard
3. Configure DNS records
4. SSL certificate is auto-provisioned

### Monitoring and Alerts

Consider integrating:

- **Sentry**: Error tracking and performance monitoring
- **LogDrain**: Stream logs to external service
- **Vercel Monitors**: Uptime monitoring and alerts

### Staging Environment

Create a staging environment:

1. Create `staging` branch in GitHub
2. Configure Vercel to deploy `staging` branch
3. Use separate Neon branch for staging database
4. Set up staging-specific environment variables

## Support

For issues or questions:

- Check Vercel documentation: https://vercel.com/docs
- Check Neon documentation: https://neon.tech/docs
- Check Inngest documentation: https://www.inngest.com/docs
- Review project documentation in `/docs`

---

**Last Updated**: 2026-01-17
**Project**: Warm Intro Graph (WIG)
**Version**: 1.0.0
