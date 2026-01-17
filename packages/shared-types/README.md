# @wig/shared-types

Shared TypeScript types for the WIG (Warm Intro Graph) monorepo.

## Purpose

This package provides a central location for all cross-package type definitions, preventing circular dependencies between packages in the monorepo. It contains:

- **Canonical data models** - Normalized data structures for contacts, organizations, and interactions
- **Domain events** - Type-safe event definitions for the EventBus
- **Adapter interfaces** - Contracts for data source adapters
- **Broker interfaces** - Contracts for action brokers (messaging, tasks)

## Usage

Install as a dependency in other packages:

```json
{
  "dependencies": {
    "@wig/shared-types": "workspace:*"
  }
}
```

Import types:

```typescript
import type {
  CanonicalContact,
  SourceAdapter,
  DomainEvent
} from '@wig/shared-types';

// Or use subpath exports
import type { CanonicalContact } from '@wig/shared-types/canonical';
```

## Architecture Notes

- This is a **types-only package** - no runtime code
- All types are exported via barrel exports in `index.ts`
- Subpath exports allow granular imports if needed
- Strict TypeScript configuration enforces type safety
- No build step required - consumers import directly from source

## Type Categories

### Canonical Models (`canonical.ts`)
Normalized data structures that all adapters must transform their source-specific data into.

### Domain Events (`events.ts`)
Event types for the system's EventBus, using discriminated unions for type safety.

### Adapter Interfaces (`adapters.ts`)
Contracts for data source adapters that ingest contacts and interactions.

### Broker Interfaces (`brokers.ts`)
Contracts for action brokers that handle outbound actions like messaging.

## Development

Type-check the package:

```bash
npm run type-check
```

## License

MIT
