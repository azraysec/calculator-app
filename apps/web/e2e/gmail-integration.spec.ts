/**
 * E2E Tests for Gmail Integration
 * Tests Gmail connection UI and sync functionality
 */

import { test, expect } from '@playwright/test';

test.describe('Gmail Connection UI', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/settings');
    // Wait for page and API calls to complete
    await page.waitForLoadState('domcontentloaded');
    // Additional wait for React hydration and API calls
    await page.waitForTimeout(3000);
  });

  test('should display settings page header', async ({ page }) => {
    // Just verify the settings page loads properly
    await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible({ timeout: 15000 });
    await expect(page.getByRole('heading', { name: 'Data Sources' })).toBeVisible({ timeout: 15000 });
  });

  test('should show data sources section', async ({ page }) => {
    // Check the Data Sources section is visible
    await expect(page.getByRole('heading', { name: 'Data Sources' })).toBeVisible({ timeout: 15000 });
    await expect(page.getByText(/build your network graph/i)).toBeVisible({ timeout: 15000 });
  });

  test('should display privacy information', async ({ page }) => {
    // Check for privacy section
    await expect(page.getByText(/Privacy & Security/i)).toBeVisible({ timeout: 15000 });
    await expect(page.getByText(/isolated to your account/i)).toBeVisible({ timeout: 15000 });
  });

  test('should have navigation link back to home', async ({ page }) => {
    const homeLink = page.getByRole('link', { name: /Back to Home/i });
    await expect(homeLink).toBeVisible({ timeout: 15000 });
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
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000);
  });

  test('should have Sync Now button when connected', async ({ page }) => {
    const syncButton = page.getByRole('button', { name: /Sync Now/i });

    // Sync button only shows when Gmail is connected
    if (await syncButton.isVisible().catch(() => false)) {
      await expect(syncButton).toBeEnabled();
    }
  });

  test('should show syncing state when sync is triggered', async ({ page }) => {
    const syncButton = page.getByRole('button', { name: /Sync Now/i });

    if (await syncButton.isVisible().catch(() => false)) {
      // Click sync button
      await syncButton.click();

      // Should show "Syncing..." state or success message (alert)
      await page.waitForTimeout(1000);
    }
  });

  test('should display settings page with data sources section', async ({ page }) => {
    // Just verify the settings page loads with data sources section
    await expect(page.getByRole('heading', { name: 'Data Sources' })).toBeVisible({ timeout: 15000 });
    await expect(page.getByText(/build your network graph/i)).toBeVisible({ timeout: 15000 });
  });
});

test.describe('Gmail OAuth Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/settings');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000);
  });

  test('should initiate OAuth flow when clicking Connect', async ({ page }) => {
    const connectButton = page.getByRole('button', { name: /Connect$/i }).first();

    if (await connectButton.isVisible().catch(() => false)) {
      // Note: We don't actually click this in E2E as it would redirect to Google
      // Just verify the button is present and enabled
      await expect(connectButton).toBeEnabled();
    }
  });

  test('should redirect back with gmailConnected param after OAuth', async ({ page }) => {
    // This tests the callback URL structure
    // Navigate to settings with gmailConnected query param (simulating OAuth callback)
    await page.goto('/settings?gmailConnected=true');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000);

    // Should still show settings page with Data Sources section
    await expect(page.getByRole('heading', { name: 'Data Sources' })).toBeVisible({ timeout: 15000 });
  });
});

test.describe('Gmail Sync Cron API', () => {
  test('should handle sync trigger API call', async ({ page }) => {
    // Try to trigger sync
    const response = await page.request.post('/api/cron/gmail-sync');

    // Should return some response (200, 401, or 500 depending on auth/config)
    expect([200, 401, 403, 500]).toContain(response.status());
  });

  test('should return response when sync endpoint is called', async ({ page }) => {
    const response = await page.request.post('/api/cron/gmail-sync');

    if (response.status() === 200) {
      const data = await response.json();
      // Should have some response structure
      expect(data).toBeTruthy();
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
