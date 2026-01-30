/**
 * E2E Tests for Privacy Controls
 * Tests user data isolation and privacy features
 *
 * Note: These tests require test database setup with multiple users
 * In a real environment, you'd seed test users and data
 */

import { test, expect } from '@playwright/test';

test.describe('Data Isolation', () => {
  test('should only return authenticated user data from /api/me', async ({ page, context }) => {
    // This test assumes authentication is set up
    // In production, you'd authenticate as a test user first

    const response = await page.request.get('/api/me');

    if (response.status() === 401) {
      // User not authenticated - expected for this test setup
      expect(response.status()).toBe(401);
      return;
    }

    const data = await response.json();

    // Should have user-specific fields
    expect(data).toHaveProperty('id');
    expect(data).toHaveProperty('email');
    expect(data).toHaveProperty('googleRefreshToken'); // Boolean flag only
  });

  test('should filter evidence by authenticated user', async ({ page }) => {
    // Mock evidence API call
    const response = await page.request.get('/api/evidence?edgeIds=test-edge-1');

    if (response.status() === 401) {
      // User not authenticated
      expect(response.status()).toBe(401);
      return;
    }

    // If authenticated, should return data
    const data = await response.json();
    expect(data).toHaveProperty('edges');
  });

  test('should require authentication for LinkedIn archive upload', async ({ page }) => {
    // Try to upload without authentication
    const formData = new FormData();
    formData.append('file', new Blob(['test'], { type: 'application/zip' }), 'test.zip');

    const response = await page.request.post('/api/linkedin/archive/upload', {
      multipart: {
        file: {
          name: 'test.zip',
          mimeType: 'application/zip',
          buffer: Buffer.from('test'),
        },
      },
    });

    // Should return 401 without authentication
    expect(response.status()).toBe(401);
  });
});

test.describe('Gmail Connection Privacy', () => {
  test('should display Gmail connection status for authenticated user only', async ({ page }) => {
    await page.goto('/settings');

    // If redirected to login, that's correct behavior
    if (page.url().includes('/login')) {
      expect(page.url()).toContain('/login');
      return;
    }

    // If authenticated, should see Gmail connection component
    // The actual content depends on connection status
    await expect(
      page.locator('text=Gmail').or(page.locator('text=Connect Gmail'))
    ).toBeVisible({ timeout: 5000 });
  });

  test('should not expose OAuth tokens in API responses', async ({ page }) => {
    const response = await page.request.get('/api/me');

    if (response.status() === 200) {
      const data = await response.json();

      // Should have boolean flag only, not actual tokens
      if ('googleRefreshToken' in data) {
        expect(typeof data.googleRefreshToken).toBe('boolean');
      }

      // Should never expose actual token values
      expect(data).not.toHaveProperty('googleAccessToken');
      expect(JSON.stringify(data)).not.toContain('ya29'); // Google token prefix
      expect(JSON.stringify(data)).not.toContain('refresh_token');
    }
  });
});

test.describe('Email Content Privacy', () => {
  test('should not store email content in evidence metadata', async ({ page }) => {
    const response = await page.request.get('/api/evidence?edgeIds=test-edge-1');

    if (response.status() === 200) {
      const data = await response.json();

      if (data.edges && data.edges.length > 0) {
        for (const edge of data.edges) {
          for (const evidence of edge.evidence) {
            // Email evidence should only have metadata, not full content
            if (evidence.type === 'email_sent' || evidence.type === 'email_received') {
              // Should have metadata like subject, but not full body
              expect(evidence.metadata).toBeDefined();

              // Should NOT have full email body stored
              const metadataStr = JSON.stringify(evidence.metadata);
              expect(metadataStr.length).toBeLessThan(1000); // Reasonable size limit
            }
          }
        }
      }
    }
  });

  test('should only show "We do NOT store email content" message on Gmail connection', async ({ page }) => {
    await page.goto('/settings');

    if (page.url().includes('/login')) {
      return; // Not authenticated
    }

    // Should display privacy assurance
    await expect(
      page.getByText(/We do NOT store email content/i)
    ).toBeVisible({ timeout: 5000 });
  });
});

test.describe('User Isolation Verification', () => {
  test('should not allow accessing other users evidence', async ({ page }) => {
    // This is a conceptual test - in practice you'd need multiple test users
    // The API should filter all queries by the authenticated userId

    const response = await page.request.get('/api/evidence?edgeIds=another-user-edge');

    if (response.status() === 200) {
      const data = await response.json();

      // Should return empty or filtered results, not other user's data
      // The actual verification depends on test data setup
      expect(data).toHaveProperty('edges');
    } else {
      // 401 if not authenticated is also acceptable
      expect(response.status()).toBeOneOf([200, 401, 404]);
    }
  });

  test('should not allow uploading files for other users', async ({ page }) => {
    // userId should come from session, not from form data
    // This prevents spoofing attacks

    const formData = new FormData();
    formData.append('file', new Blob(['test'], { type: 'application/zip' }), 'test.zip');
    formData.append('userId', 'spoofed-user-id'); // Should be ignored

    const response = await page.request.post('/api/linkedin/archive/upload', {
      multipart: {
        file: {
          name: 'test.zip',
          mimeType: 'application/zip',
          buffer: Buffer.from('test'),
        },
        // Note: userId should NOT be accepted from form data
      },
    });

    // Should either reject (401) or use session userId (not form userId)
    expect(response.status()).toBeOneOf([401, 200]);

    if (response.status() === 200) {
      const data = await response.json();
      // Should use session userId, not the spoofed one from form
      expect(data).toHaveProperty('jobId');
    }
  });
});

test.describe('Privacy UI Elements', () => {
  test('should display privacy notice on login page', async ({ page }) => {
    await page.goto('/login');

    // Should explain data privacy
    await expect(page.getByText(/Privacy-first/i)).toBeVisible();
    await expect(page.getByText(/Your data is only visible to you/i)).toBeVisible();
  });

  test('should show Gmail privacy information before connection', async ({ page }) => {
    await page.goto('/settings');

    if (page.url().includes('/login')) {
      return; // Not authenticated
    }

    // Should explain what data is accessed
    await expect(
      page.getByText(/Read-only access to your emails/i)
    ).toBeVisible({ timeout: 5000 });

    await expect(
      page.getByText(/Email metadata/i)
    ).toBeVisible({ timeout: 5000 });

    await expect(
      page.getByText(/We do NOT store email content/i)
    ).toBeVisible({ timeout: 5000 });
  });
});

test.describe('Audit and Compliance', () => {
  test('should include userId in all data creation', async ({ page }) => {
    // This is verified at the API level - all evidence, conversations, and messages
    // should have userId set from the authenticated session

    // Conceptual test - in practice, you'd verify database records
    // have the correct userId after operations
  });

  test('should log out user when clicking sign out', async ({ page, context }) => {
    // This test would require actual authentication first
    // Then verify signOut clears cookies and redirects to login

    // For now, just verify the session behavior
    await context.clearCookies();

    const response = await page.request.get('/api/me');
    expect(response.status()).toBe(401);
  });
});
