# Warm Intro Graph (WIG)

Professional networking platform for warm introductions - transforming professional connections through intelligent relationship mapping.

## Project Overview

WIG is a full-stack professional networking system built with Next.js 14+ and a modern monorepo architecture. The platform facilitates warm introductions by mapping professional relationships and enabling meaningful connections.

## Tech Stack

- **Framework**: Next.js 14+ with App Router
- **Language**: TypeScript (strict mode)
- **Styling**: TailwindCSS
- **Package Manager**: pnpm
- **Monorepo**: Turborepo
- **Runtime**: React 18+

## Monorepo Structure

```
warm-intro-graph/
├── apps/
│   └── web/                    # Next.js 14+ application
│       ├── app/                # App Router pages
│       ├── components/         # React components
│       ├── lib/                # Utilities
│       └── public/             # Static assets
├── packages/
│   ├── shared-types/           # Shared TypeScript types
│   ├── core/                   # Core business logic
│   ├── db/                     # Database layer (Prisma)
│   ├── adapters/               # External service adapters
│   ├── brokers/                # Message brokers (Inngest)
│   └── agent-runtime/          # AI agent orchestration
├── docs/                       # Project documentation
├── legacy/                     # Legacy calculator app
├── package.json                # Root package.json
├── pnpm-workspace.yaml         # Workspace configuration
└── turbo.json                  # Turborepo configuration
```

## Getting Started

### Prerequisites

- Node.js >= 18.0.0
- pnpm >= 8.0.0

### Installation

```bash
# Install pnpm globally if not already installed
npm install -g pnpm

# Install dependencies
pnpm install
```

### Development

```bash
# Start development server
pnpm dev

# Build all packages
pnpm build

# Lint all packages
pnpm lint

# Run tests
pnpm test

# Clean build artifacts
pnpm clean
```

The development server will start at [http://localhost:3000](http://localhost:3000).

## Workspace Packages

### @wig/web
Next.js application with App Router, server components, and TailwindCSS.

### @wig/shared-types
Shared TypeScript types and interfaces used across all packages.

### @wig/core
Core business logic and domain models.

### @wig/db
Database layer with Prisma ORM (to be implemented).

### @wig/adapters
Adapters for external services and APIs.

### @wig/brokers
Event-driven architecture with Inngest (to be implemented).

### @wig/agent-runtime
AI agent orchestration and runtime (to be implemented).

## Development Workflow

1. All packages are linked through the pnpm workspace
2. Turborepo caches build outputs for faster rebuilds
3. Changes to packages automatically trigger rebuilds in dependent packages
4. Use `pnpm add <package>` in the relevant workspace to add dependencies

## Scripts

- `pnpm dev` - Start development server for all apps
- `pnpm build` - Build all packages and apps
- `pnpm lint` - Lint all packages
- `pnpm test` - Run tests across all packages
- `pnpm clean` - Clean build artifacts
- `pnpm format` - Format code with Prettier

## Environment Variables

Create a `.env.local` file in the root directory:

```env
# Add environment variables as needed
```

## Deployment

The project is configured for Vercel deployment:

1. Push to main branch
2. Vercel automatically builds and deploys
3. Preview deployments for pull requests

## Contributing

This is an internal project. Follow the established patterns and conventions.

## License

Proprietary
