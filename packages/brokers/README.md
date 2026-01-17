# @wig/brokers

Action brokers for outbound messaging and task creation in WIG.

## Purpose

Brokers handle outbound actions like sending introduction requests, creating tasks/reminders, and logging interactions back to source systems. All brokers are safe-by-default with draft-only mode.

## What's Included

### Base Broker (`base-broker.ts`)
- `BaseBroker` - Abstract base class with common functionality
- Draft validation
- Email validation
- Error handling utilities

### Manual Broker (`manual-broker.ts`)
- `ManualBroker` - Copy-to-clipboard workflow
- Draft-only (no actual sending)
- Geographic and tone customization
- Context-aware message generation

### Rate Limiter (`rate-limiter.ts`)
- `RateLimiter` - Token bucket rate limiting
- Per-minute and per-hour limits
- Status tracking and reset capabilities

### Factory (`factory.ts`)
- `BrokerFactoryImpl` - Creates and caches brokers
- Connection validation
- Rate limiter integration

## Usage

```typescript
import { BrokerFactoryImpl } from '@wig/brokers';

const factory = new BrokerFactoryImpl();

// Create a manual broker
const broker = await factory.create({
  channel: 'manual',
  options: { draftOnly: true }
});

// Generate draft
const draft = await broker.draftMessage({
  context: {
    targetPerson: {
      name: 'Jane Doe',
      title: 'CTO',
      organization: 'TechCorp'
    },
    introducerPerson: {
      name: 'John Smith',
      title: 'VP Engineering',
      organization: 'Acme'
    },
    path: [
      { name: 'Alice', relationship: 'colleague' }
    ]
  },
  tone: 'professional',
  geography: 'US'
});

console.log(draft.body); // Ready to copy and send manually
```

## Safe-by-Default Design

All brokers follow these principles:

1. **Draft-only by default** - Must explicitly enable sending
2. **Rate limiting** - Prevents accidental spam
3. **Validation** - Recipients, content, attachments checked
4. **Audit logging** - Every action logged to AuditLog
5. **Error handling** - Graceful failures with clear messages

## Adding New Brokers

To add a new action broker:

1. Create `src/[channel]-broker.ts`
2. Extend `BaseBroker` or implement `ActionBroker`
3. Implement required methods:
   - `draftMessage()`
   - `validateConnection()`
   - Optionally: `sendMessage()`, `createTask()`
4. Add to factory in `factory.ts`
5. Add tests in `src/[channel]-broker.test.ts`

Example structure:

```typescript
import { BaseBroker } from './base-broker';
import type { Draft, DraftInput, SendOptions, SendResult } from '@wig/shared-types';

export class EmailBroker extends BaseBroker {
  readonly channel = 'email';

  constructor(private config: { smtpHost: string; credentials: any }) {
    super();
  }

  async draftMessage(input: DraftInput): Promise<Draft> {
    // Generate email draft with subject and body
  }

  async sendMessage(draft: Draft, opts: SendOptions): Promise<SendResult> {
    // Only if draftOnly: false
    this.validateDraft(draft);
    this.validateSendOptions(opts);
    
    // Send via SMTP/API
    // Return messageId on success
  }

  async validateConnection() {
    // Test SMTP connection
  }
}
```

## Broker Contract

All brokers must:

1. **Generate context-aware drafts** - Use all available evidence
2. **Respect rate limits** - Check before sending
3. **Handle errors gracefully** - Never throw on send failure
4. **Log all actions** - Success and failure to audit log
5. **Support geography/tone** - Localize messaging style

## Testing

```bash
# Run tests
npm test

# Watch mode
npm run test:watch

# Type checking
npm run typecheck
```

## Message Generation

The manual broker demonstrates the pattern for draft generation:

- **Geography-aware**: US/Israel/Europe greetings and closings
- **Tone variants**: Professional, casual, formal
- **Evidence inclusion**: Recent interactions, meeting history
- **Path context**: Show connection path to build credibility
- **Clear ask**: Specific request with easy yes/no

Adapt this pattern for other channels (email, LinkedIn, etc.).

## See Also

- [Shared Types](../shared-types)
- [Project Documentation](../../docs)
