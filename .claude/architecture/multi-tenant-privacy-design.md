# Multi-Tenant Privacy Architecture

## Database Schema Changes

### New Table: DataSourceConnection

Tracks each data source connection with privacy controls:

```prisma
model DataSourceConnection {
  id        String   @id @default(uuid())
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  // Ownership
  userId String
  user   User   @relation(fields: [userId], references: [id], onDelete: Cascade)

  // Source Identity
  sourceType   SourceType // gmail, linkedin, slack, facebook, whatsapp, etc.
  accountEmail String?    // For email-based services (Gmail)
  accountId    String?    // For ID-based services (Slack user ID, FB ID)
  displayName  String     // User-friendly name shown in UI

  // OAuth Credentials
  refreshToken   String  // Encrypted at rest
  accessToken    String? // Encrypted at rest
  tokenExpiresAt DateTime?

  // Privacy Controls (User Configured)
  evidenceUsage   EvidenceUsage   @default(metadata_only)
  visibilityLevel VisibilityLevel @default(private)

  // Sync Status
  status     ConnectionStatus @default(active)
  lastSyncAt DateTime?
  syncError  String?

  // Relationships
  evidenceEvents EvidenceEvent[]
  conversations  Conversation[]
  messages       Message[]

  @@unique([userId, sourceType, accountEmail]) // One connection per email per user
  @@unique([userId, sourceType, accountId])    // One connection per account per user
  @@index([userId])
  @@index([status])
  @@map("data_source_connections")
}

enum SourceType {
  gmail
  linkedin
  slack
  facebook
  whatsapp
  twitter
  calendar
  // Extensible for future sources
}

enum EvidenceUsage {
  metadata_only // Use connections (who talks to who), not content
  full_content  // Analyze message content for relationship strength
  no_evidence   // Don't use for graph scoring, only show on detail view
}

enum VisibilityLevel {
  private          // Nothing visible to other users
  connections_only // Other users can see who I'm connected to (network graph)
  full_sharing     // Other users can see connections AND message metadata
}

enum ConnectionStatus {
  active       // Syncing normally
  error        // Sync failing
  disconnected // User disconnected
  paused       // Temporarily paused
}
```

### Modified Tables

#### EvidenceEvent (Track Source Connection)

```prisma
model EvidenceEvent {
  // ... existing fields ...

  // Privacy Tracking
  userId       String // Owner of this evidence
  connectionId String? // Which DataSourceConnection created this
  connection   DataSourceConnection? @relation(fields: [connectionId], references: [id])

  // Inherited from connection at creation time
  visibilityLevel VisibilityLevel @default(private)

  @@index([userId, visibilityLevel]) // Fast privacy-filtered queries
}
```

#### Conversation (Track Source Connection)

```prisma
model Conversation {
  // ... existing fields ...

  userId       String // Owner
  connectionId String // Which Gmail/Slack account
  connection   DataSourceConnection @relation(...)

  @@index([userId, connectionId])
}
```

#### Message (Track Source Connection)

```prisma
model Message {
  // ... existing fields ...

  userId       String // Owner
  connectionId String // Source
  connection   DataSourceConnection @relation(...)

  @@index([userId, connectionId])
}
```

---

## Privacy Query Layer

### Base Principle: "Can User A See Data Owned by User B?"

```typescript
interface PrivacyContext {
  requestingUserId: string; // Who is asking?
  ownerId: string;          // Who owns the data?
  visibilityLevel: VisibilityLevel;
}

function canAccess(context: PrivacyContext): boolean {
  // Always see your own data
  if (context.requestingUserId === context.ownerId) {
    return true;
  }

  // Check visibility level
  switch (context.visibilityLevel) {
    case 'private':
      return false; // Never visible to others
    case 'connections_only':
      return true; // Graph visible, not content
    case 'full_sharing':
      return true; // Everything visible
  }
}
```

### Graph Query with Privacy

When building relationship graph for User A:

```typescript
async function buildPrivacyAwareGraph(userId: string) {
  // Get all evidence visible to this user
  const evidence = await prisma.evidenceEvent.findMany({
    where: {
      OR: [
        // All of user's own evidence
        { userId },

        // Others' evidence that is shared
        {
          userId: { not: userId },
          visibilityLevel: { in: ['connections_only', 'full_sharing'] }
        }
      ]
    },
    include: {
      connection: true // To show source in UI
    }
  });

  // Build graph from evidence
  return buildGraphFromEvidence(evidence);
}
```

### Message Content Access

```typescript
async function getMessageContent(
  requestingUserId: string,
  messageId: string
): Promise<Message | null> {
  const message = await prisma.message.findUnique({
    where: { id: messageId },
    include: {
      conversation: {
        include: { connection: true }
      }
    }
  });

  if (!message) return null;

  // Own message - always visible
  if (message.userId === requestingUserId) {
    return message;
  }

  // Other's message - check visibility
  const connection = message.conversation.connection;

  if (connection.visibilityLevel === 'full_sharing') {
    return message; // Shared message content
  }

  // Not visible
  return null;
}
```

---

## UI Components

### Settings: Data Sources Page

```tsx
<DataSourcesPage>
  {/* Gmail Connections */}
  <Section title="Gmail">
    <ConnectionCard
      email="work@company.com"
      status="active"
      lastSync="5 minutes ago"
      evidenceUsage="metadata_only"
      visibilityLevel="private"
      onConfigurePrivacy={(settings) => updateConnection(id, settings)}
      onDisconnect={() => disconnectGmail(id)}
      onSync={() => syncNow(id)}
    />

    <ConnectionCard
      email="personal@gmail.com"
      status="active"
      lastSync="1 hour ago"
      evidenceUsage="full_content"
      visibilityLevel="connections_only"
      onConfigurePrivacy={...}
    />

    <Button onClick={addGmailAccount}>
      + Add Another Gmail Account
    </Button>
  </Section>

  {/* LinkedIn */}
  <Section title="LinkedIn">
    <ConnectionCard
      displayName="LinkedIn Archive"
      type="archive"
      status="active"
      evidenceUsage="metadata_only"
      visibilityLevel="connections_only"
    />
  </Section>

  {/* Future: Slack, Facebook, etc. */}
</DataSourcesPage>
```

### Privacy Configuration Dialog

```tsx
<PrivacyDialog connection={gmailConnection}>
  <FormSection title="Evidence Usage">
    <RadioGroup value={evidenceUsage} onChange={...}>
      <Radio value="metadata_only">
        <Label>Connections only</Label>
        <Description>
          Use who I communicate with for relationship strength.
          Message content is NOT analyzed.
        </Description>
      </Radio>

      <Radio value="full_content">
        <Label>Full content analysis</Label>
        <Description>
          Analyze message content for sentiment, frequency, and
          relationship strength scoring.
        </Description>
      </Radio>

      <Radio value="no_evidence">
        <Label>No evidence</Label>
        <Description>
          Don't use for relationship graph. Messages only visible
          when clicking on a connection.
        </Description>
      </Radio>
    </RadioGroup>
  </FormSection>

  <FormSection title="Visibility to Other Users">
    <RadioGroup value={visibilityLevel} onChange={...}>
      <Radio value="private">
        <Label>Private</Label>
        <Description>
          Only I can see this data. Not visible to anyone else.
        </Description>
      </Radio>

      <Radio value="connections_only">
        <Label>Share network graph</Label>
        <Description>
          Other users can see who I'm connected to, but NOT
          message content. Helps with intro pathfinding.
        </Description>
      </Radio>

      <Radio value="full_sharing">
        <Label>Full sharing</Label>
        <Description>
          Other users can see connections AND message metadata
          (timestamps, frequency). Content still NOT shared.
        </Description>
      </Radio>
    </RadioGroup>
  </FormSection>

  <Button>Save Privacy Settings</Button>
</PrivacyDialog>
```

### Evidence Viewer (Shows Source)

When viewing relationship evidence:

```tsx
<EvidenceList>
  <EvidenceItem>
    <Icon>📧</Icon>
    <Text>Email exchange</Text>
    <Timestamp>2 days ago</Timestamp>
    <SourceBadge>
      work@company.com (Your Gmail)
    </SourceBadge>
  </EvidenceItem>

  <EvidenceItem>
    <Icon>💼</Icon>
    <Text>LinkedIn connection</Text>
    <Timestamp>1 year ago</Timestamp>
    <SourceBadge>
      LinkedIn Archive (Your Data)
    </SourceBadge>
  </EvidenceItem>

  <EvidenceItem>
    <Icon>📧</Icon>
    <Text>Email introduction</Text>
    <Timestamp>3 weeks ago</Timestamp>
    <SourceBadge>
      john@example.com (Shared by John) 🔗
    </SourceBadge>
    <VisibilityNote>
      John shared their network graph with you
    </VisibilityNote>
  </EvidenceItem>
</EvidenceList>
```

---

## OAuth Flow for Adding Accounts

### API Routes

```typescript
// POST /api/connections/gmail/add
export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return unauthorized();

  // Generate OAuth URL
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    `${process.env.NEXTAUTH_URL}/api/connections/gmail/callback`
  );

  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: ['https://www.googleapis.com/auth/gmail.readonly'],
    state: JSON.stringify({
      userId: session.user.id,
      action: 'add_gmail',
    }),
  });

  return NextResponse.json({ url });
}

// GET /api/connections/gmail/callback
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const state = JSON.parse(searchParams.get('state') || '{}');

  // Exchange code for tokens
  const { tokens } = await oauth2Client.getToken(code);

  // Get user info from Google
  const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
  const { data } = await oauth2.userinfo.get();

  // Create connection in database
  await prisma.dataSourceConnection.create({
    data: {
      userId: state.userId,
      sourceType: 'gmail',
      accountEmail: data.email,
      displayName: `${data.name} (${data.email})`,
      refreshToken: encrypt(tokens.refresh_token),
      accessToken: encrypt(tokens.access_token),
      tokenExpiresAt: new Date(tokens.expiry_date),
      // Defaults
      evidenceUsage: 'metadata_only',
      visibilityLevel: 'private',
      status: 'active',
    },
  });

  // Redirect back to settings
  return NextResponse.redirect('/settings?gmailAdded=true');
}
```

### Sync Job (Multi-Account)

```typescript
// Cron: /api/cron/sync-all-connections
export async function POST() {
  // Get all active connections across all users
  const connections = await prisma.dataSourceConnection.findMany({
    where: { status: 'active' },
    include: { user: true },
  });

  for (const connection of connections) {
    try {
      await syncConnection(connection);
    } catch (error) {
      // Mark connection as error
      await prisma.dataSourceConnection.update({
        where: { id: connection.id },
        data: {
          status: 'error',
          syncError: error.message,
        },
      });
    }
  }
}

async function syncConnection(connection: DataSourceConnection) {
  switch (connection.sourceType) {
    case 'gmail':
      return await syncGmailConnection(connection);
    case 'slack':
      return await syncSlackConnection(connection);
    // ... other sources
  }
}

async function syncGmailConnection(connection: DataSourceConnection) {
  // Create adapter with this connection's tokens
  const adapter = new GmailAdapter({
    refreshToken: decrypt(connection.refreshToken),
    accessToken: decrypt(connection.accessToken),
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  });

  // Sync emails
  const result = await adapter.listInteractions({
    since: connection.lastSyncAt,
    limit: 100,
  });

  for (const interaction of result.items) {
    // Create evidence with proper ownership and visibility
    await createEvidenceFromInteraction(interaction, {
      userId: connection.userId,
      connectionId: connection.id,
      visibilityLevel: connection.visibilityLevel,
      evidenceUsage: connection.evidenceUsage,
    });
  }

  // Update last sync time
  await prisma.dataSourceConnection.update({
    where: { id: connection.id },
    data: { lastSyncAt: new Date() },
  });
}
```

---

## Migration Path

### Phase 1: Database Schema
1. Create DataSourceConnection table
2. Migrate existing User.googleRefreshToken to DataSourceConnection
3. Set all existing as private + metadata_only

### Phase 2: Privacy Query Layer
1. Update all graph queries to respect visibility
2. Add privacy checks to message access
3. Add source badges to evidence viewer

### Phase 3: Multi-Account UI
1. Build connection list UI
2. Add privacy configuration dialog
3. Implement "Add Another Account" flow

### Phase 4: Additional Sources
1. Slack adapter + OAuth flow
2. Facebook/WhatsApp (if APIs available)
3. Calendar integration

---

## Security Considerations

### Data Encryption
- Encrypt refresh tokens at rest
- Encrypt access tokens at rest
- Use AES-256-GCM

### Access Control
- Middleware checks userId on all queries
- Privacy filters applied at database level
- No client-side visibility control (always server-side)

### Audit Trail
- Log when users change privacy settings
- Log when data is accessed by other users
- GDPR compliance: data export, deletion

---

## Example Scenarios

### Scenario 1: Private Work Gmail
```
User: John
Connection: work@bigcorp.com
Evidence Usage: full_content
Visibility: private

Result:
- John sees all emails in his graph
- John's connection strength scores use email content
- Other users CANNOT see John knows anyone from work emails
- Complete isolation
```

### Scenario 2: Shared LinkedIn Network
```
User: Sarah
Connection: LinkedIn Archive
Evidence Usage: metadata_only
Visibility: connections_only

Result:
- Sarah sees all her LinkedIn connections
- Other users see "Sarah knows Person X" in pathfinding
- Other users CANNOT see message content
- Network graph is shared, details are private
```

### Scenario 3: Team Collaboration
```
User: Team Lead
Connection: team-slack@company.com
Evidence Usage: full_content
Visibility: full_sharing

Result:
- Team Lead sees all Slack messages
- Team members can see who Team Lead talks to
- Team members can see frequency/timestamps (not content)
- Enables team-wide pathfinding
```

---

## Open Questions

1. **Default Privacy Settings?**
   - Recommendation: private + metadata_only (most restrictive)
   - User must explicitly choose to share

2. **Granular Sharing?**
   - Should users be able to share with specific users only?
   - Or is "all users" vs "no users" sufficient?

3. **Message Content Storage?**
   - Even with "no evidence" setting, store messages?
   - Or only store if evidenceUsage != no_evidence?

4. **Cross-User Intro Requests?**
   - If User A wants intro to Person X via User B
   - Should system notify User B?
   - Should User B approve before revealing connection?

5. **Future: Organization Accounts?**
   - Company-wide visibility settings?
   - Org admin controls?
