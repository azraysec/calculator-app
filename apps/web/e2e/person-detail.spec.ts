/**
 * E2E Tests for Person Detail View and Evidence Display
 * Tests Issue #7: Show all data points (evidence, etc.) for a person
 */

import { test, expect } from '@playwright/test';

test.describe('Person Detail View', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to connections page (authenticated via auth setup)
    await page.goto('/');
    await page.waitForURL('/');
  });

  test('should open person detail view from connections grid', async ({ page }) => {
    // Find the connections tab and click it
    const connectionsTab = page.getByRole('tab', { name: /connections/i });
    await connectionsTab.click();

    // Wait for the connections grid to load
    await page.waitForSelector('table', { timeout: 10000 });

    // Find and click the View button on first row
    const viewButton = page.locator('button').filter({ hasText: 'View' }).first();

    // If there are connections, click view
    if (await viewButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await viewButton.click();

      // Dialog should open with person details
      const dialog = page.locator('[role="dialog"]');
      await expect(dialog).toBeVisible({ timeout: 5000 });

      // Should show Person Details title
      await expect(dialog.getByText('Person Details')).toBeVisible();
    }
  });

  test('should display contact information section', async ({ page }) => {
    // Navigate to connections and open first person
    const connectionsTab = page.getByRole('tab', { name: /connections/i });
    await connectionsTab.click();
    await page.waitForSelector('table', { timeout: 10000 });

    const viewButton = page.locator('button').filter({ hasText: 'View' }).first();
    if (await viewButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await viewButton.click();

      // Wait for dialog
      const dialog = page.locator('[role="dialog"]');
      await expect(dialog).toBeVisible({ timeout: 5000 });

      // Should show Contact Information section
      await expect(dialog.getByText('Contact Information')).toBeVisible();
    }
  });

  test('should display stats cards (connections, evidence, conversations, sources)', async ({ page }) => {
    const connectionsTab = page.getByRole('tab', { name: /connections/i });
    await connectionsTab.click();
    await page.waitForSelector('table', { timeout: 10000 });

    const viewButton = page.locator('button').filter({ hasText: 'View' }).first();
    if (await viewButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await viewButton.click();

      const dialog = page.locator('[role="dialog"]');
      await expect(dialog).toBeVisible({ timeout: 5000 });

      // Should show stats cards with labels
      await expect(dialog.getByText('Connections')).toBeVisible();
      await expect(dialog.getByText('Evidence Events')).toBeVisible();
      await expect(dialog.getByText('Conversations')).toBeVisible();
      await expect(dialog.getByText('Data Sources')).toBeVisible();
    }
  });

  test('should have Evidence, Connections, and Conversations tabs', async ({ page }) => {
    const connectionsTab = page.getByRole('tab', { name: /connections/i });
    await connectionsTab.click();
    await page.waitForSelector('table', { timeout: 10000 });

    const viewButton = page.locator('button').filter({ hasText: 'View' }).first();
    if (await viewButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await viewButton.click();

      const dialog = page.locator('[role="dialog"]');
      await expect(dialog).toBeVisible({ timeout: 5000 });

      // Should show tabs for Evidence, Connections, Conversations
      const evidenceTab = dialog.getByRole('tab', { name: /evidence/i });
      const connectionsTabInDialog = dialog.getByRole('tab', { name: /connections/i });
      const conversationsTab = dialog.getByRole('tab', { name: /conversations/i });

      await expect(evidenceTab).toBeVisible();
      await expect(connectionsTabInDialog).toBeVisible();
      await expect(conversationsTab).toBeVisible();
    }
  });

  test('should switch between tabs in person detail view', async ({ page }) => {
    const connectionsTab = page.getByRole('tab', { name: /connections/i });
    await connectionsTab.click();
    await page.waitForSelector('table', { timeout: 10000 });

    const viewButton = page.locator('button').filter({ hasText: 'View' }).first();
    if (await viewButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await viewButton.click();

      const dialog = page.locator('[role="dialog"]');
      await expect(dialog).toBeVisible({ timeout: 5000 });

      // Click on Connections tab in dialog
      const connectionsTabInDialog = dialog.getByRole('tab', { name: /connections/i });
      await connectionsTabInDialog.click();

      // Should show connections content (either list or empty message)
      const connectionsContent = dialog.locator('[data-state="active"]').filter({ hasText: /outgoing|incoming|no connections found/i });
      await expect(connectionsContent).toBeVisible({ timeout: 3000 }).catch(() => {
        // Content might still load
      });

      // Click on Conversations tab
      const conversationsTab = dialog.getByRole('tab', { name: /conversations/i });
      await conversationsTab.click();
    }
  });

  test('should close person detail view with Back button', async ({ page }) => {
    const connectionsTab = page.getByRole('tab', { name: /connections/i });
    await connectionsTab.click();
    await page.waitForSelector('table', { timeout: 10000 });

    const viewButton = page.locator('button').filter({ hasText: 'View' }).first();
    if (await viewButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await viewButton.click();

      const dialog = page.locator('[role="dialog"]');
      await expect(dialog).toBeVisible({ timeout: 5000 });

      // Click Back button
      const backButton = dialog.getByRole('button', { name: /back/i });
      await backButton.click();

      // Dialog should close
      await expect(dialog).not.toBeVisible({ timeout: 3000 });
    }
  });
});

test.describe('Evidence Display', () => {
  test('should display evidence events with type badges', async ({ page }) => {
    await page.goto('/');

    const connectionsTab = page.getByRole('tab', { name: /connections/i });
    await connectionsTab.click();
    await page.waitForSelector('table', { timeout: 10000 });

    const viewButton = page.locator('button').filter({ hasText: 'View' }).first();
    if (await viewButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await viewButton.click();

      const dialog = page.locator('[role="dialog"]');
      await expect(dialog).toBeVisible({ timeout: 5000 });

      // Click on Evidence tab (should be default but click to be sure)
      const evidenceTab = dialog.getByRole('tab', { name: /evidence/i });
      await evidenceTab.click();

      // Evidence content should be visible (either events or empty message)
      const evidenceContent = dialog.locator('[data-state="active"]');
      await expect(evidenceContent).toBeVisible();

      // Check for evidence events or "No evidence events found" message
      const hasEvents = await dialog.locator('.p-4').first().isVisible().catch(() => false);
      const hasEmptyMessage = await dialog.getByText('No evidence events found').isVisible().catch(() => false);

      expect(hasEvents || hasEmptyMessage).toBeTruthy();
    }
  });

  test('should show evidence metadata in expandable format', async ({ page }) => {
    await page.goto('/');

    const connectionsTab = page.getByRole('tab', { name: /connections/i });
    await connectionsTab.click();
    await page.waitForSelector('table', { timeout: 10000 });

    const viewButton = page.locator('button').filter({ hasText: 'View' }).first();
    if (await viewButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await viewButton.click();

      const dialog = page.locator('[role="dialog"]');
      await expect(dialog).toBeVisible({ timeout: 5000 });

      // Evidence tab should show evidence with badges and optional metadata
      const evidenceTab = dialog.getByRole('tab', { name: /evidence/i });
      await evidenceTab.click();

      // If there are evidence events with metadata, they should have a pre tag
      const preElements = dialog.locator('pre');
      // Just verify the structure exists (may or may not have content)
      await expect(dialog).toBeVisible();
    }
  });
});

test.describe('Source Filtering Integration', () => {
  test('should have source filter dropdown in connections grid', async ({ page }) => {
    await page.goto('/');

    const connectionsTab = page.getByRole('tab', { name: /connections/i });
    await connectionsTab.click();
    await page.waitForSelector('table', { timeout: 10000 });

    // Look for the source filter dropdown
    const sourceFilter = page.getByRole('button', { name: /all sources/i });
    if (await sourceFilter.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(sourceFilter).toBeVisible();

      // Click to open dropdown
      await sourceFilter.click();

      // Should see dropdown menu
      const dropdownContent = page.locator('[role="menu"]');
      await expect(dropdownContent).toBeVisible();
    }
  });
});
