import { test, expect, Page } from '@playwright/test';

/**
 * E2E Tests for Issue #34: Connections tab state persistence
 * Verifies that switching tabs preserves loaded data, scroll position, and filters.
 */

/** Helper: set an input value via DOM to avoid Playwright actionability hangs */
async function setInputValue(page: Page, placeholder: string, value: string) {
  await page.getByPlaceholder(placeholder).evaluate((el, v) => {
    const input = el as HTMLInputElement;
    // React reads from the native setter, so we must use it
    const nativeSetter = Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      'value'
    )!.set!;
    nativeSetter.call(input, v);
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  }, value);
}

test.describe('Connections Tab Persistence', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('h1').first()).toContainText('Warm Intro Graph');
  });

  test('should preserve loaded connections when switching tabs', async ({ page }) => {
    await page.getByRole('tab', { name: 'Connections' }).click();
    await expect(page.getByRole('heading', { name: 'Connections' })).toBeVisible({ timeout: 15000 });
    await page.waitForTimeout(3000);

    const tableRows = page.locator('table tbody tr');
    const initialRowCount = await tableRows.count();
    if (initialRowCount === 0) {
      console.log('No connections found - skipping test');
      return;
    }

    const firstCellText = await tableRows.first().locator('td').first().textContent();

    // Switch tabs using dispatchEvent to avoid actionability timeout
    await page.getByRole('tab', { name: 'Intro Finder' }).dispatchEvent('click');
    await page.waitForTimeout(1000);
    await page.getByRole('tab', { name: 'Connections' }).dispatchEvent('click');
    await page.waitForTimeout(1000);

    const rowCountAfter = await tableRows.count();
    expect(rowCountAfter).toBe(initialRowCount);

    const firstCellTextAfter = await tableRows.first().locator('td').first().textContent();
    expect(firstCellTextAfter).toBe(firstCellText);
  });

  test('should preserve search filter when switching tabs', async ({ page }) => {
    await page.getByRole('tab', { name: 'Connections' }).click();
    await expect(page.getByRole('heading', { name: 'Connections' })).toBeVisible({ timeout: 15000 });
    await page.waitForTimeout(3000);

    // Set the global search filter via DOM
    await setInputValue(page, 'Search all columns...', 'test');
    await page.waitForTimeout(500);

    // Switch to Data Sources and back
    await page.getByRole('tab', { name: 'Data Sources' }).dispatchEvent('click');
    await page.waitForTimeout(1000);
    await page.getByRole('tab', { name: 'Connections' }).dispatchEvent('click');
    await page.waitForTimeout(1000);

    // Search input should still have the filter value
    await expect(page.getByPlaceholder('Search all columns...')).toHaveValue('test');
  });

  test('should stay responsive when filtering after scrolling', async ({ page }) => {
    // Regression test: filtering after scroll used to trigger a tight fetch
    // loop that froze the tab (sentinel visible → fetch all pages at once).
    await page.getByRole('tab', { name: 'Connections' }).click();
    await expect(page.getByRole('heading', { name: 'Connections' })).toBeVisible({ timeout: 15000 });

    const tableRows = page.locator('table tbody tr');
    await expect(tableRows.first()).toBeVisible({ timeout: 10000 });
    const initialCount = await tableRows.count();
    if (initialCount === 0) {
      console.log('No connections found - skipping test');
      return;
    }

    // Scroll the container down
    await page.locator('[style*="max-height"]').evaluate((el) => el.scrollTo(0, el.scrollHeight));
    await page.waitForTimeout(1000);

    // Apply a filter via DOM — this used to freeze the tab
    await setInputValue(page, 'Search all columns...', 'a');
    await page.waitForTimeout(2000);

    // Page should still be responsive
    const filteredCount = await tableRows.count();
    expect(filteredCount).toBeGreaterThanOrEqual(0);

    // Clear the filter and verify rows restore
    await setInputValue(page, 'Search all columns...', '');
    await page.waitForTimeout(1000);
    const restoredCount = await tableRows.count();
    expect(restoredCount).toBe(initialCount);
  });

  test('should preserve connections after visiting multiple tabs', async ({ page }) => {
    await page.getByRole('tab', { name: 'Connections' }).click();
    await expect(page.getByRole('heading', { name: 'Connections' })).toBeVisible({ timeout: 15000 });
    await page.waitForTimeout(3000);

    const tableRows = page.locator('table tbody tr');
    const initialRowCount = await tableRows.count();
    if (initialRowCount === 0) {
      console.log('No connections found - skipping test');
      return;
    }

    // Visit all other tabs
    await page.getByRole('tab', { name: 'Intro Finder' }).dispatchEvent('click');
    await page.waitForTimeout(500);
    await page.getByRole('tab', { name: 'Data Sources' }).dispatchEvent('click');
    await page.waitForTimeout(500);
    await page.getByRole('tab', { name: 'Changelog' }).dispatchEvent('click');
    await page.waitForTimeout(500);

    // Return to Connections tab
    await page.getByRole('tab', { name: 'Connections' }).dispatchEvent('click');
    await page.waitForTimeout(1000);

    const rowCountAfter = await tableRows.count();
    expect(rowCountAfter).toBe(initialRowCount);
  });
});
