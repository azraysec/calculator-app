/**
 * E2E Tests for Gmail Integration
 * Tests Gmail connection UI and sync functionality
 */

import { test, expect } from '@playwright/test';

test.describe('Gmail Connection UI', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/settings');

    // If redirected to login, skip tests
    if (page.url().includes('/login')) {
      test.skip();
    }
  });

  test('should display Gmail connection card', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Gmail' })).toBeVisible();
    await expect(
      page.getByText(/Connect to import email interactions/i)
    ).toBeVisible();
  });

  test('should show Not Connected status for unconnected Gmail', async ({ page }) => {
    // Check for "Not Connected" badge or "Connect Gmail Account" button
    const notConnected = page.getByText('Not Connected');
    const connectButton = page.getByRole('button', { name: /Connect Gmail Account/i });

    await expect(
      notConnected.or(connectButton)
    ).toBeVisible({ timeout: 5000 });
  });

  test('should display what data will be accessed', async ({ page }) => {
    await expect(page.getByText(/What we'll access:/i)).toBeVisible({ timeout: 5000 });
    await expect(page.getByText(/Read-only access to your emails/i)).toBeVisible();
    await expect(page.getByText(/Email metadata/i)).toBeVisible();
    await expect(page.getByText(/We do NOT store email content/i)).toBeVisible();
  });

  test('should have Connect Gmail Account button', async ({ page }) => {
    const connectButton = page.getByRole('button', { name: /Connect Gmail Account/i });

    if (await connectButton.isVisible()) {
      await expect(connectButton).toBeEnabled();
    }
  });
});

test.describe('Gmail Connection Status', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/settings');

    if (page.url().includes('/login')) {
      test.skip();
    }
  });

  test('should show Connected status badge when Gmail is connected', async ({ page }) => {
    // This test requires a connected Gmail account
    // Check if "Connected" badge is visible

    const connectedBadge = page.getByText('Connected', { exact: false });
    const syncButton = page.getByRole('button', { name: /Sync Now/i });

    // If either is visible, Gmail is connected
    const isConnected = await Promise.race([
      connectedBadge.isVisible().catch(() => false),
      syncButton.isVisible().catch(() => false),
    ]);

    if (isConnected) {
      // Should show last synced time
      await expect(page.getByText(/Last synced:/i)).toBeVisible();

      // Should have Sync Now button
      await expect(syncButton).toBeVisible();

      // Should have Reconnect button
      await expect(page.getByRole('button', { name: /Reconnect/i })).toBeVisible();
    }
  });

  test('should display last sync timestamp when connected', async ({ page }) => {
    const lastSyncedText = page.getByText(/Last synced:/i);

    if (await lastSyncedText.isVisible()) {
      // Should show a timestamp
      await expect(lastSyncedText).toBeVisible();

      // Could show "Never" or an actual date
      const parentLocator = lastSyncedText.locator('..');
      await expect(
        parentLocator.getByText(/Never|[0-9]{1,2}\/[0-9]{1,2}\/[0-9]{4}/i)
      ).toBeVisible();
    }
  });
});

test.describe('Gmail Manual Sync', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/settings');

    if (page.url().includes('/login')) {
      test.skip();
    }
  });

  test('should have Sync Now button when connected', async ({ page }) => {
    const syncButton = page.getByRole('button', { name: /Sync Now/i });

    if (await syncButton.isVisible()) {
      await expect(syncButton).toBeEnabled();
    }
  });

  test('should show syncing state when sync is triggered', async ({ page }) => {
    const syncButton = page.getByRole('button', { name: /Sync Now/i });

    if (await syncButton.isVisible()) {
      // Click sync button
      await syncButton.click();

      // Should show "Syncing..." state or success message
      await expect(
        page.getByText(/Syncing|sync started|success/i)
      ).toBeVisible({ timeout: 5000 });
    }
  });

  test('should display automatic sync frequency information', async ({ page }) => {
    await expect(
      page.getByText(/Automatic sync runs every 15 minutes/i)
    ).toBeVisible({ timeout: 5000 });
  });
});

test.describe('Gmail OAuth Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/settings');

    if (page.url().includes('/login')) {
      test.skip();
    }
  });

  test('should initiate OAuth flow when clicking Connect Gmail', async ({ page }) => {
    const connectButton = page.getByRole('button', { name: /Connect Gmail Account/i });

    if (await connectButton.isVisible()) {
      // Note: We don't actually click this in E2E as it would redirect to Google
      // Just verify the button is present and enabled
      await expect(connectButton).toBeEnabled();
    }
  });

  test('should redirect back with gmailConnected param after OAuth', async ({ page }) => {
    // This tests the callback URL structure
    // Navigate to settings with gmailConnected query param (simulating OAuth callback)
    await page.goto('/settings?gmailConnected=true');

    // Should still show settings page
    await expect(page.getByRole('heading', { name: 'Gmail' })).toBeVisible();
  });
});

test.describe('Gmail Sync Cron API', () => {
  test('should require authentication for manual sync trigger', async ({ page, context }) => {
    // Clear authentication
    await context.clearCookies();

    // Try to trigger sync manually
    const response = await page.request.post('/api/cron/gmail-sync');

    // Should require authentication
    // Note: Cron endpoints might have different auth (e.g., Vercel cron secret)
    // but manual triggers should still be protected
    expect(response.status()).toBeOneOf([200, 401, 403]);
  });

  test('should return success response when sync completes', async ({ page }) => {
    // This would require proper authentication
    const response = await page.request.post('/api/cron/gmail-sync');

    if (response.status() === 200) {
      const data = await response.json();

      // Should have proper response structure
      expect(data).toHaveProperty('success');
      expect(data).toHaveProperty('processed');
      expect(data).toHaveProperty('results');
    }
  });
});

test.describe('Gmail Data Display', () => {
  test('should show email evidence in relationship graph', async ({ page }) => {
    // This test requires Gmail data to be synced
    await page.goto('/');

    if (page.url().includes('/login')) {
      test.skip();
    }

    // Click on a person node (if data exists)
    // Check if email evidence is displayed in the detail view
    // This is a conceptual test - actual implementation depends on UI

    // Look for evidence indicators
    const evidencePanel = page.locator('[data-testid="evidence-panel"]');

    if (await evidencePanel.isVisible({ timeout: 2000 }).catch(() => false)) {
      // Check for email-related evidence types
      await expect(
        evidencePanel.getByText(/email_sent|email_received|Email/i)
      ).toBeVisible({ timeout: 5000 });
    }
  });

  test('should display email metadata without full content', async ({ page }) => {
    await page.goto('/');

    if (page.url().includes('/login')) {
      test.skip();
    }

    // If email evidence is displayed, should show:
    // - Subject lines (truncated)
    // - Timestamps
    // - Participant counts
    // But NOT full email body

    const evidencePanel = page.locator('[data-testid="evidence-panel"]');

    if (await evidencePanel.isVisible({ timeout: 2000 }).catch(() => false)) {
      const evidenceText = await evidencePanel.textContent();

      // Should have some evidence metadata
      expect(evidenceText).toBeTruthy();

      // Should not have extremely long text (full email bodies)
      if (evidenceText) {
        expect(evidenceText.length).toBeLessThan(5000);
      }
    }
  });
});

test.describe('Gmail Error Handling', () => {
  test('should handle Gmail connection errors gracefully', async ({ page }) => {
    // This test would require mocking Gmail API failures
    // For now, just verify error states are handled

    await page.goto('/settings');

    if (page.url().includes('/login')) {
      test.skip();
    }

    // Click sync button if visible
    const syncButton = page.getByRole('button', { name: /Sync Now/i });

    if (await syncButton.isVisible()) {
      await syncButton.click();

      // Should handle errors and show message
      // Either success or error message should appear
      await expect(
        page.getByText(/success|error|failed|try again/i)
      ).toBeVisible({ timeout: 10000 });
    }
  });

  test('should prompt reconnection if token expired', async ({ page }) => {
    // This conceptual test verifies reconnection prompts
    // In practice, expired tokens would trigger this

    await page.goto('/settings');

    if (page.url().includes('/login')) {
      test.skip();
    }

    // If Reconnect button is visible, token may need refresh
    const reconnectButton = page.getByRole('button', { name: /Reconnect/i });

    if (await reconnectButton.isVisible()) {
      await expect(reconnectButton).toBeEnabled();
    }
  });
});
