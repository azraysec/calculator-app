# Gmail Adapter

Integration with Gmail API for email evidence collection.

## Features

- Extract email contacts (From, To, Cc addresses)
- Parse email threads as interactions
- Support for incremental sync
- OAuth 2.0 authentication with refresh tokens

## Setup

### 1. Google Cloud Console Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the **Gmail API**:
   - Navigate to "APIs & Services" > "Library"
   - Search for "Gmail API"
   - Click "Enable"

### 2. Create OAuth 2.0 Credentials

1. Go to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "OAuth client ID"
3. Configure OAuth consent screen if prompted:
   - User Type: External (for testing) or Internal (for organization)
   - Add scopes: `https://www.googleapis.com/auth/gmail.readonly`
4. Application type: "Web application"
5. Add authorized redirect URIs:
   - `http://localhost:3000/api/auth/callback/google` (development)
   - `https://your-domain.com/api/auth/callback/google` (production)
6. Save the **Client ID** and **Client Secret**

### 3. Environment Variables

Add the following to your `.env` file:

```bash
# Google OAuth (for NextAuth.js and Gmail API)
GOOGLE_CLIENT_ID="your-client-id.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="your-client-secret"
GOOGLE_REDIRECT_URI="http://localhost:3000/api/auth/callback/google"

# NextAuth.js
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="generate-random-secret-key"
```

### 4. OAuth Scopes

The Gmail adapter requires the following OAuth scope:

- `https://www.googleapis.com/auth/gmail.readonly` - Read-only access to emails

This scope is automatically requested during the Google sign-in flow.

## Usage

### Authenticating Users

Users authenticate via NextAuth.js Google provider:

1. User clicks "Sign in with Google"
2. OAuth flow redirects to Google consent screen
3. User grants Gmail access
4. Refresh token is stored in `User.googleRefreshToken`

### Syncing Gmail Data

The Gmail adapter is used by the sync cron job:

```typescript
import { createGmailAdapter } from '@wig/adapters';

// Get user's refresh token from database
const user = await prisma.user.findUnique({
  where: { id: userId },
});

// Create adapter instance
const adapter = createGmailAdapter({
  refreshToken: user.googleRefreshToken!,
  accessToken: user.googleAccessToken,
  clientId: process.env.GOOGLE_CLIENT_ID!,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
});

// Fetch interactions
const result = await adapter.listInteractions({
  since: user.lastGmailSyncAt || undefined,
  limit: 100,
});

// Process interactions...
```

## API Rate Limits

Gmail API quotas (as of 2024):

- **Requests per user per second**: 250
- **Requests per day**: 1 billion (shared across all users)

The adapter implements:
- Automatic token refresh
- Pagination support
- Incremental sync via `since` parameter

## Data Mapping

### Contacts

Each unique email address becomes a `CanonicalContact`:

```typescript
{
  sourceId: "user@example.com",
  sourceName: "gmail",
  names: ["User Name"], // Extracted from email header or username
  emails: ["user@example.com"],
  phones: [],
  socialHandles: {},
  metadata: {
    extractedFrom: "gmail"
  }
}
```

### Interactions

Each email becomes a `CanonicalInteraction`:

```typescript
{
  sourceId: "message-id-123",
  sourceName: "gmail",
  timestamp: new Date("2024-01-15T10:30:00Z"),
  participants: ["alice@example.com", "bob@example.com"],
  channel: "email",
  direction: "2-way",
  metadata: {
    threadId: "thread-id-456",
    subject: "Project Update",
    snippet: "Here's the latest on...",
    labels: ["INBOX", "IMPORTANT"]
  }
}
```

## Privacy & Security

- Refresh tokens are stored encrypted at rest in the database
- Each user's emails are isolated by `userId`
- No email content is stored by default (only metadata)
- Users can revoke access at any time via Google account settings

## Troubleshooting

### "Access token expired" error

The adapter automatically refreshes tokens. If you see this error:

1. Check that `googleRefreshToken` is set in the User model
2. Verify OAuth credentials are correct
3. Ensure user has granted offline access during OAuth flow

### "Insufficient permissions" error

User needs to re-authenticate and grant Gmail access:

1. Revoke existing token in Google account settings
2. Sign in again via your application
3. Grant Gmail permissions when prompted

### Rate limit exceeded

If you hit rate limits:

1. Implement exponential backoff
2. Reduce sync frequency
3. Request quota increase in Google Cloud Console
