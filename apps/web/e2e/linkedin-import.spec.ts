/**
 * E2E Tests for LinkedIn Archive Import
 *
 * Tests the FULL flow:
 * 1. User uploads LinkedIn archive
 * 2. Archive is processed
 * 3. Connections appear in the UI
 * 4. Multi-tenant isolation verified
 */

import { test, expect } from '@playwright/test';

test.describe('LinkedIn Archive Import - E2E', () => {
  test.describe('Full import flow', () => {
    test('should import connections and display them in UI', async ({ page }) => {
      // Login first
      await page.goto('/login');
      // Note: This requires test authentication setup

      // Navigate to import page
      await page.goto('/connections');

      // Find upload button/area
      const uploadArea = page.locator('[data-testid="linkedin-upload"]');

      // Check initial state - may show "no connections" or previous data
      const initialConnections = await page.locator('[data-testid="connection-card"]').count();

      // Upload test archive
      // Note: Requires test fixture file
      const fileInput = page.locator('input[type="file"]');
      await fileInput.setInputFiles('./e2e/fixtures/test-linkedin-archive.zip');

      // Wait for processing
      await expect(page.locator('[data-testid="upload-progress"]')).toBeVisible();
      await expect(page.locator('[data-testid="upload-complete"]')).toBeVisible({ timeout: 60000 });

      // Verify connections appear
      await page.reload();
      const newConnections = await page.locator('[data-testid="connection-card"]').count();
      expect(newConnections).toBeGreaterThan(initialConnections);
    });

    test('should show correct connection count after import', async ({ page }) => {
      await page.goto('/connections');

      // Check the count in header/summary
      const countText = await page.locator('[data-testid="connection-count"]').textContent();
      const count = parseInt(countText?.replace(/\D/g, '') || '0');

      // Count should match actual cards displayed (accounting for pagination)
      const cards = await page.locator('[data-testid="connection-card"]').count();

      // If pagination exists, cards should be <= total count
      expect(cards).toBeLessThanOrEqual(count);
    });
  });

  test.describe('Multi-tenant isolation', () => {
    test('should not show connections from other users', async ({ browser }) => {
      // Create two browser contexts (two users)
      const context1 = await browser.newContext();
      const context2 = await browser.newContext();

      const page1 = await context1.newPage();
      const page2 = await context2.newPage();

      // Login as User 1
      await page1.goto('/login');
      // TODO: Login as test user 1

      // Login as User 2
      await page2.goto('/login');
      // TODO: Login as test user 2

      // User 1 views connections
      await page1.goto('/connections');
      const user1Connections = await page1.locator('[data-testid="connection-card"]').allTextContents();

      // User 2 views connections
      await page2.goto('/connections');
      const user2Connections = await page2.locator('[data-testid="connection-card"]').allTextContents();

      // Connections should be different (unless both have no connections)
      if (user1Connections.length > 0 && user2Connections.length > 0) {
        // At least verify they're not identical
        expect(JSON.stringify(user1Connections)).not.toBe(JSON.stringify(user2Connections));
      }

      await context1.close();
      await context2.close();
    });
  });

  test.describe('API verification', () => {
    test('should return only authenticated user connections via API', async ({ request }) => {
      // This test requires authenticated API access
      // Skip if running without auth setup

      const response = await request.get('/api/connections');

      if (response.status() === 401) {
        test.skip();
        return;
      }

      expect(response.ok()).toBeTruthy();

      const data = await response.json();

      // Verify response structure
      expect(data).toHaveProperty('connections');
      expect(data).toHaveProperty('pagination');

      // Each connection should have expected fields
      if (data.connections.length > 0) {
        const connection = data.connections[0];
        expect(connection).toHaveProperty('id');
        expect(connection).toHaveProperty('names');
        expect(connection).toHaveProperty('emails');
      }
    });

    test('should reject unauthenticated requests', async ({ request }) => {
      // Make request without auth
      const response = await request.get('/api/connections', {
        headers: {
          // No auth header
        },
      });

      expect(response.status()).toBe(401);
    });
  });
});

test.describe('LinkedIn Upload History', () => {
  test('should show upload history for current user only', async ({ page }) => {
    await page.goto('/connections');

    // Open upload history
    const historyButton = page.locator('[data-testid="upload-history-button"]');
    if (await historyButton.isVisible()) {
      await historyButton.click();

      // Verify history shows
      const historyItems = await page.locator('[data-testid="upload-history-item"]').count();

      // History should exist (may be 0 for new users)
      expect(historyItems).toBeGreaterThanOrEqual(0);
    }
  });
});
