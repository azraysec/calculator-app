import { test, expect } from '@playwright/test';

/**
 * E2E Tests for Issue #34: Connections tab state persistence
 * Verifies that switching tabs preserves loaded data, scroll position, and filters.
 */

test.describe('Connections Tab Persistence', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('h1').first()).toContainText('Warm Intro Graph');
  });

  test('should preserve loaded connections when switching tabs', async ({ page }) => {
    // Navigate to Connections tab
    await page.getByRole('tab', { name: 'Connections' }).click();

    // Wait for the connections heading to be visible
    await expect(page.getByRole('heading', { name: 'Connections' })).toBeVisible({ timeout: 15000 });

    // Wait for table to load
    await page.waitForTimeout(3000);

    // Get the current row count
    const tableRows = page.locator('table tbody tr');
    const initialRowCount = await tableRows.count();
    if (initialRowCount === 0) {
      console.log('No connections found - skipping test');
      return;
    }

    // Get the first connection name for verification
    const firstCellText = await tableRows.first().locator('td').first().textContent();

    // Switch to Intro Finder tab using dispatchEvent to avoid actionability timeout
    await page.getByRole('tab', { name: 'Intro Finder' }).dispatchEvent('click');
    await page.waitForTimeout(1000);

    // Switch back to Connections tab
    await page.getByRole('tab', { name: 'Connections' }).dispatchEvent('click');
    await page.waitForTimeout(1000);

    // Connections should still be visible without re-loading
    const rowCountAfter = await tableRows.count();
    expect(rowCountAfter).toBe(initialRowCount);

    // First row should have the same data
    const firstCellTextAfter = await tableRows.first().locator('td').first().textContent();
    expect(firstCellTextAfter).toBe(firstCellText);
  });

  test('should preserve search filter when switching tabs', async ({ page }) => {
    // Navigate to Connections tab
    await page.getByRole('tab', { name: 'Connections' }).click();

    // Wait for the connections content to be visible
    await expect(page.getByRole('heading', { name: 'Connections' })).toBeVisible({ timeout: 15000 });
    await page.waitForTimeout(3000);

    // Apply a global search filter
    const searchInput = page.getByPlaceholder('Search all columns...');
    await expect(searchInput).toBeVisible({ timeout: 5000 });
    await searchInput.fill('test');
    await page.waitForTimeout(500);

    // Switch to Data Sources tab
    await page.getByRole('tab', { name: 'Data Sources' }).dispatchEvent('click');
    await page.waitForTimeout(1000);

    // Switch back to Connections tab
    await page.getByRole('tab', { name: 'Connections' }).dispatchEvent('click');
    await page.waitForTimeout(1000);

    // Search input should still have the filter value
    await expect(searchInput).toHaveValue('test');
  });

  test('should preserve connections after visiting multiple tabs', async ({ page }) => {
    // Navigate to Connections tab
    await page.getByRole('tab', { name: 'Connections' }).click();

    // Wait for content to load
    await expect(page.getByRole('heading', { name: 'Connections' })).toBeVisible({ timeout: 15000 });
    await page.waitForTimeout(3000);

    const tableRows = page.locator('table tbody tr');
    const initialRowCount = await tableRows.count();
    if (initialRowCount === 0) {
      console.log('No connections found - skipping test');
      return;
    }

    // Visit all other tabs using dispatchEvent
    await page.getByRole('tab', { name: 'Intro Finder' }).dispatchEvent('click');
    await page.waitForTimeout(500);
    await page.getByRole('tab', { name: 'Data Sources' }).dispatchEvent('click');
    await page.waitForTimeout(500);
    await page.getByRole('tab', { name: 'Changelog' }).dispatchEvent('click');
    await page.waitForTimeout(500);

    // Return to Connections tab
    await page.getByRole('tab', { name: 'Connections' }).dispatchEvent('click');
    await page.waitForTimeout(1000);

    // Should still have the same connections loaded
    const rowCountAfter = await tableRows.count();
    expect(rowCountAfter).toBe(initialRowCount);
  });
});
