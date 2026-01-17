# @wig/adapters

Source adapters for data ingestion into WIG.

## Purpose

Adapters normalize data from external sources (Gmail, HubSpot, CSV imports) into canonical formats that WIG can process uniformly.

## What's Included

### Base Adapter (`base-adapter.ts`)
- `BaseAdapter` - Abstract base class with common functionality
- Pagination helpers
- Error handling utilities

### Mock Adapter (`mock-adapter.ts`)
- `MockAdapter` - In-memory adapter for testing
- `generateMockData()` - Realistic fixture generator
- No external dependencies or API calls

### Factory (`factory.ts`)
- `AdapterFactoryImpl` - Creates and caches adapters
- Connection validation
- Adapter lifecycle management

## Usage

```typescript
import { AdapterFactoryImpl } from '@wig/adapters';

const factory = new AdapterFactoryImpl();

// Create a mock adapter
const mockAdapter = await factory.create({
  sourceName: 'mock',
  credentials: {},
});

// List contacts
const contacts = await mockAdapter.listContacts({ limit: 50 });
console.log(contacts.items);

// List interactions
const interactions = await mockAdapter.listInteractions({ 
  since: new Date('2024-01-01'),
  limit: 100
});
```

## Adding New Adapters

To add a new source adapter:

1. Create `src/[source]-adapter.ts`
2. Extend `BaseAdapter` or implement `SourceAdapter`
3. Implement required methods:
   - `capabilities()`
   - `listContacts()`
   - `listInteractions()`
   - `validateConnection()`
4. Add to factory in `factory.ts`
5. Add tests in `src/[source]-adapter.test.ts`

Example structure:

```typescript
import { BaseAdapter } from './base-adapter';
import type { CanonicalContact, PaginatedResult, ListParams } from '@wig/shared-types';

export class GmailAdapter extends BaseAdapter {
  readonly sourceName = 'gmail';

  constructor(private config: { accessToken: string }) {
    super();
  }

  async capabilities() {
    return {
      contacts: true,
      organizations: false,
      interactions: true,
      threads: true,
    };
  }

  async listContacts(params: ListParams): Promise<PaginatedResult<CanonicalContact>> {
    // Fetch from Gmail API
    // Normalize to CanonicalContact
    // Return paginated results
  }

  async validateConnection() {
    try {
      // Test API call
      return { valid: true };
    } catch (error) {
      return { valid: false, error: error.message };
    }
  }
}
```

## Adapter Contract

All adapters must:

1. **Be idempotent** - Multiple calls with same params return same data
2. **Support cursor-based pagination** - Never load all data at once
3. **Handle rate limits** - Implement backoff/retry
4. **Normalize data** - Return canonical formats from `@wig/shared-types`
5. **Validate connections** - Fail fast if credentials invalid
6. **Be resumable** - Support `since` parameter for incremental sync

## Testing

```bash
# Run tests
npm test

# Watch mode
npm run test:watch

# Type checking
npm run typecheck
```

## Mock Data

The mock adapter includes realistic test data:
- 3 contacts with varying relationship strengths
- 5 interactions across different channels
- Timestamps spanning 365 days
- Proper participant cross-references

Use for development without API credentials.

## See Also

- [Adapter Specification Template](../../docs/Adapters/AdapterSpecTemplate.md)
- [Shared Types](../shared-types)
- [Project Documentation](../../docs)
