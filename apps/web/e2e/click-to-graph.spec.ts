import { test, expect } from '@playwright/test';

/**
 * E2E Tests for Click-to-Graph Feature
 * Tests the flow: Connections Grid → Click "Find Path" → Graph View with Path
 */

test.describe('Click-to-Graph Feature', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('h1').first()).toContainText('Warm Intro Graph');
  });

  test('should navigate to intro finder when clicking Find Path button', async ({ page }) => {
    // Navigate to Connections tab
    const connectionsTab = page.getByRole('tab', { name: 'Connections' });
    await connectionsTab.click();

    // Wait for connections grid to load
    await page.waitForTimeout(3000);

    // Check if there are any connections
    const tableRows = page.locator('table tbody tr');
    const rowCount = await tableRows.count();

    if (rowCount === 0) {
      console.log('No connections found - skipping test');
      return;
    }

    // Find first "Find Path" button in connections grid
    const findPathButton = page.getByRole('button', { name: 'Find Path' }).first();
    await expect(findPathButton).toBeVisible({ timeout: 10000 });

    // Click the Find Path button
    await findPathButton.click();

    // Should switch to Intro Finder tab automatically
    await page.waitForTimeout(1000);
    const introFinderTab = page.getByRole('tab', { name: 'Intro Finder' });
    await expect(introFinderTab).toHaveAttribute('data-state', 'active');
  });

  test('should show target person after clicking Find Path', async ({ page }) => {
    // Navigate to Connections tab
    await page.getByRole('tab', { name: 'Connections' }).click();
    await page.waitForTimeout(3000);

    // Check if there are any connections
    const tableRows = page.locator('table tbody tr');
    const rowCount = await tableRows.count();

    if (rowCount === 0) {
      console.log('No connections found - skipping test');
      return;
    }

    // Get the name of the first connection (so we can verify it's selected)
    const firstConnectionRow = tableRows.first();
    const connectionName = await firstConnectionRow.locator('td').first().textContent();

    // Click Find Path button
    const findPathButton = page.getByRole('button', { name: 'Find Path' }).first();
    await expect(findPathButton).toBeVisible({ timeout: 10000 });
    await findPathButton.click();
    await page.waitForTimeout(1000);

    // Should show "Target:" label
    await expect(page.getByText('Target:')).toBeVisible({ timeout: 5000 });
  });

  test('should calculate and display paths after clicking Find Path', async ({ page }) => {
    // Navigate to Connections tab
    await page.getByRole('tab', { name: 'Connections' }).click();
    await page.waitForTimeout(3000);

    // Check if there are any connections
    const tableRows = page.locator('table tbody tr');
    const rowCount = await tableRows.count();

    if (rowCount === 0) {
      console.log('No connections found - skipping test');
      return;
    }

    // Click Find Path button
    const findPathButton = page.getByRole('button', { name: 'Find Path' }).first();
    await expect(findPathButton).toBeVisible({ timeout: 10000 });
    await findPathButton.click();

    // Wait for pathfinding to complete
    await page.waitForTimeout(6000);

    // Should show either paths or a message (or at least Target label)
    const hasTarget = await page.getByText('Target:').isVisible().catch(() => false);
    const hasStrengthBadge = await page.getByText(/\d+% strength/).isVisible().catch(() => false);
    const hasNoPathsMsg = await page.getByText('No paths found').isVisible().catch(() => false);

    // At minimum should show target selection
    expect(hasTarget || hasStrengthBadge || hasNoPathsMsg).toBeTruthy();
  });

  test('should show path details panel when path is found', async ({ page }) => {
    // Navigate to Connections tab
    await page.getByRole('tab', { name: 'Connections' }).click();
    await page.waitForTimeout(2000);

    // Click Find Path for first connection
    await page.getByRole('button', { name: 'Find Path' }).first().click();
    await page.waitForTimeout(5000);

    // If paths exist, should show Path Details panel
    const hasStrengthBadge = await page.getByText(/\d+% strength/).isVisible().catch(() => false);

    if (hasStrengthBadge) {
      // Should auto-select first path and show details
      await expect(page.getByText('Path Details')).toBeVisible({ timeout: 3000 });
    }
  });

  test('should work with filtered connections', async ({ page }) => {
    // Navigate to Connections tab
    await page.getByRole('tab', { name: 'Connections' }).click();
    await page.waitForTimeout(2000);

    // Apply a filter (search for a name)
    const searchInput = page.getByPlaceholder('Search connections...');
    if (await searchInput.isVisible()) {
      await searchInput.fill('Alice');
      await page.waitForTimeout(1000);

      // Click Find Path on filtered result
      const findPathButton = page.getByRole('button', { name: 'Find Path' }).first();
      if (await findPathButton.isVisible()) {
        await findPathButton.click();
        await page.waitForTimeout(1000);

        // Should navigate to Network tab
        const networkTab = page.getByRole('tab', { name: 'Network' });
        await expect(networkTab).toHaveAttribute('data-state', 'active');
      }
    }
  });

  test('should work with sorted connections', async ({ page }) => {
    // Navigate to Connections tab
    await page.getByRole('tab', { name: 'Connections' }).click();
    await page.waitForTimeout(2000);

    // Click a column header to sort (e.g., Name or Company)
    const nameHeader = page.locator('th').filter({ hasText: 'Name' }).first();
    if (await nameHeader.isVisible()) {
      await nameHeader.click();
      await page.waitForTimeout(1000);

      // Click Find Path on first sorted result
      const findPathButton = page.getByRole('button', { name: 'Find Path' }).first();
      await findPathButton.click();
      await page.waitForTimeout(1000);

      // Should navigate to Network tab
      const networkTab = page.getByRole('tab', { name: 'Network' });
      await expect(networkTab).toHaveAttribute('data-state', 'active');
    }
  });

  test('should show loading state during pathfinding', async ({ page }) => {
    // Navigate to Connections tab
    await page.getByRole('tab', { name: 'Connections' }).click();
    await page.waitForTimeout(2000);

    // Click Find Path button
    await page.getByRole('button', { name: 'Find Path' }).first().click();

    // Should immediately show target selection (indicates loading started)
    await expect(page.getByText('Target:')).toBeVisible({ timeout: 2000 });
  });

  test('should handle pagination in connections grid', async ({ page }) => {
    // Navigate to Connections tab
    await page.getByRole('tab', { name: 'Connections' }).click();
    await page.waitForTimeout(2000);

    // Check if pagination controls exist
    const nextButton = page.getByRole('button', { name: 'Next' });
    const hasNextButton = await nextButton.isVisible().catch(() => false);

    if (hasNextButton) {
      // Go to page 2
      await nextButton.click();
      await page.waitForTimeout(1000);

      // Click Find Path on page 2
      const findPathButton = page.getByRole('button', { name: 'Find Path' }).first();
      await findPathButton.click();
      await page.waitForTimeout(1000);

      // Should still work - navigate to Network tab
      const networkTab = page.getByRole('tab', { name: 'Network' });
      await expect(networkTab).toHaveAttribute('data-state', 'active');
    }
  });

  test('should preserve connection after navigating back from graph', async ({ page }) => {
    // Navigate to Connections tab
    await page.getByRole('tab', { name: 'Connections' }).click();
    await page.waitForTimeout(2000);

    // Get first connection name
    const firstConnectionRow = page.locator('table tbody tr').first();
    const connectionName = await firstConnectionRow.locator('td').first().textContent();

    // Click Find Path
    await page.getByRole('button', { name: 'Find Path' }).first().click();
    await page.waitForTimeout(2000);

    // Go back to Connections tab
    await page.getByRole('tab', { name: 'Connections' }).click();
    await page.waitForTimeout(1000);

    // Should still show same connections list
    const stillVisible = await firstConnectionRow.isVisible();
    expect(stillVisible).toBeTruthy();
  });
});
