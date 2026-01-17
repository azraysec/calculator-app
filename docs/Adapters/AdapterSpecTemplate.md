# Adapter Spec Template

Use this template when designing a new data source adapter.

---

## Adapter Name
**Source:** [e.g., Gmail, HubSpot, LinkedIn]
**Type:** API Sync / File Import / Hybrid
**Status:** Draft / In Review / Approved / Implemented

---

## Overview
Brief description of what this adapter ingests and why.

---

## Capabilities

- [ ] Contacts
- [ ] Organizations
- [ ] Interactions (messages/emails/meetings)
- [ ] Explicit connections
- [ ] Profile enrichment data

---

## Authentication

**Method:** OAuth 2.0 / API Key / File Upload / Other
**Scopes Required:**
- scope.one
- scope.two

**Credentials Storage:**
- Environment variables: `SOURCE_CLIENT_ID`, `SOURCE_CLIENT_SECRET`
- User tokens: Encrypted in database

---

## API Endpoints / Data Sources

### Contacts
- **Endpoint:** `/contacts`
- **Rate Limit:** X requests/min
- **Pagination:** Cursor-based / Offset / Page
- **Fields Mapped:**
  - `name` → `Person.name`
  - `email` → `Person.emails[]`
  - `phone` → `Person.phones[]`

### Interactions
- **Endpoint:** `/messages` or `/engagements`
- **Rate Limit:** X requests/min
- **Pagination:** Cursor-based
- **Fields Mapped:**
  - `timestamp` → `Interaction.timestamp`
  - `participants` → `Interaction.participants[]`
  - `channel` → `Interaction.channel`

---

## Data Mapping

```typescript
type SourceContact = {
  id: string;
  name: string;
  email: string;
  // ... source-specific fields
};

function mapToCanonicalContact(source: SourceContact): CanonicalContact {
  return {
    sourceId: source.id,
    sourceName: 'adapter-name',
    names: [source.name],
    emails: [source.email],
    // ...
  };
}
```

---

## Sync Strategy

- **Initial Sync:** Full import of all contacts/interactions
- **Incremental Sync:** Use `since` parameter for changes after last sync
- **Frequency:** Hourly / Daily / Manual trigger
- **Cursor Persistence:** Store in `SyncState` table

---

## Error Handling

| Error Type | Behavior |
|------------|----------|
| Rate limit | Exponential backoff, retry with delay |
| Auth expired | Trigger re-auth flow, pause sync |
| Network timeout | Retry up to 3 times |
| Invalid data | Log error, skip record, continue |

---

## Testing Approach

- **Unit Tests:** Mapping functions, error handling
- **Integration Tests:** Mock API responses, test pagination
- **Contract Tests:** Validate against generic adapter interface
- **Manual Testing:** Test against real API (if credentials available)

---

## Risks & Constraints

| Risk | Mitigation |
|------|------------|
| API changes breaking adapter | Version API calls, monitor for deprecations |
| Rate limits blocking sync | Implement backoff, batch requests |
| Large data volumes timing out | Use chunked processing with Inngest |

---

## Dependencies

- **NPM Packages:** `source-sdk`, `axios`, etc.
- **Environment Variables:** Listed in `.env.example`
- **Database Tables:** `SyncState`, `Person`, `Interaction`

---

## Implementation Checklist

- [ ] Implement adapter interface
- [ ] Add unit tests
- [ ] Add integration tests with mocks
- [ ] Document in main README
- [ ] Add to `.env.example`
- [ ] Create migration if schema changes needed
- [ ] Test against real API
- [ ] Add to sync orchestration

---

## References

- [Official API Docs](https://example.com/api-docs)
- [Rate Limits](https://example.com/rate-limits)
- [OAuth Guide](https://example.com/oauth)
