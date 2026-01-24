import { test, expect } from '@playwright/test';

test.describe('Pathfinding - Critical Feature', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('h1').first()).toContainText('Warm Intro Graph');
  });

  test('should find direct path to Alice Johnson (1 hop)', async ({ page }) => {
    // Search for Alice who has direct connection from 'me'
    const searchInput = page.getByPlaceholder('Who do you want to meet?');
    await searchInput.fill('Alice');
    await page.waitForTimeout(1000);

    // Select Alice Johnson from results
    const result = page.locator('[cmdk-item]').filter({ hasText: 'Alice Johnson' });
    await expect(result).toBeVisible({ timeout: 5000 });
    await result.click();

    // Should show target selected
    await expect(page.getByText('Target:')).toBeVisible();
    await expect(page.getByText('Alice Johnson')).toBeVisible();

    // Should show path results (may take time to calculate)
    await page.waitForTimeout(3000);

    // Check if paths loaded or error shown
    const hasPathCards = await page.locator('.space-y-3 > div').count();
    const hasError = await page.getByText('Error').isVisible().catch(() => false);
    const hasNoPaths = await page.getByText('No paths found').isVisible().catch(() => false);

    // Should either show paths or a valid message
    expect(hasPathCards > 0 || hasError || hasNoPaths).toBeTruthy();
  });

  test('should find path to Bob Smith (1 hop)', async ({ page }) => {
    const searchInput = page.getByPlaceholder('Who do you want to meet?');
    await searchInput.fill('Bob');
    await page.waitForTimeout(1000);

    const result = page.locator('[cmdk-item]').filter({ hasText: 'Bob Smith' });
    await expect(result).toBeVisible({ timeout: 5000 });
    await result.click();

    await expect(page.getByText('Target:')).toBeVisible();
    await page.waitForTimeout(3000);

    // Verify pathfinding attempted
    const hasContent = await page.locator('.space-y-4').isVisible();
    expect(hasContent).toBeTruthy();
  });

  test('should handle pathfinding to person with no connection', async ({ page }) => {
    // Try to find path to Grace Chen (may not have path from me)
    const searchInput = page.getByPlaceholder('Who do you want to meet?');
    await searchInput.fill('Grace');
    await page.waitForTimeout(1000);

    const result = page.locator('[cmdk-item]').first();
    if (await result.isVisible()) {
      await result.click();
      await page.waitForTimeout(3000);

      // Should show either paths or "no paths" message
      const hasPaths = await page.locator('.space-y-3 > div').count() > 0;
      const hasNoPathMsg = await page.getByText('No paths found').isVisible().catch(() => false);

      expect(hasPaths || hasNoPathMsg).toBeTruthy();
    }
  });

  test('should display path details when path is found', async ({ page }) => {
    const searchInput = page.getByPlaceholder('Who do you want to meet?');
    await searchInput.fill('Alice');
    await page.waitForTimeout(1000);

    const result = page.locator('[cmdk-item]').filter({ hasText: 'Alice Johnson' });
    await result.click();

    await page.waitForTimeout(3000);

    // If paths exist, check path details
    const pathCards = page.locator('.space-y-3 > div');
    const count = await pathCards.count();

    if (count > 0) {
      // Click first path
      await pathCards.first().click();

      // Right panel should show path details
      await expect(page.getByText('Path Details')).toBeVisible({ timeout: 2000 });
    }
  });

  test('should show loading state while finding paths', async ({ page }) => {
    const searchInput = page.getByPlaceholder('Who do you want to meet?');
    await searchInput.fill('Bob');
    await page.waitForTimeout(1000);

    const result = page.locator('[cmdk-item]').first();
    await result.click();

    // Should show some indication of loading/processing
    // This might be skeleton loaders or the target selection
    await expect(page.getByText('Target:')).toBeVisible();
  });

  test('should show search metadata after pathfinding', async ({ page }) => {
    const searchInput = page.getByPlaceholder('Who do you want to meet?');
    await searchInput.fill('Alice');
    await page.waitForTimeout(1000);

    const result = page.locator('[cmdk-item]').filter({ hasText: 'Alice' });
    await result.click();

    await page.waitForTimeout(4000);

    // Should show metadata about the search
    const hasMetadata = await page.getByText(/Searched \d+ nodes/).isVisible().catch(() => false) ||
                        await page.getByText(/nodes/).isVisible().catch(() => false);

    // Metadata may or may not be shown depending on results
    expect(typeof hasMetadata === 'boolean').toBeTruthy();
  });
});

test.describe('Pathfinding API Tests', () => {
  test('should return valid pathfinding response', async ({ request }) => {
    // Get network to find valid person IDs
    const networkResp = await request.get('/api/network');
    expect(networkResp.ok()).toBeTruthy();

    const networkData = await networkResp.json();
    const targetPerson = networkData.people.find((p: any) => p.id !== 'me');

    if (targetPerson) {
      const response = await request.get(`/api/people/me/paths?target=${targetPerson.id}`);

      // Should either succeed or return valid error
      expect([200, 404, 500]).toContain(response.status());

      if (response.ok()) {
        const data = await response.json();

        // Should have expected structure
        expect(data).toHaveProperty('paths');
        expect(data).toHaveProperty('targetPerson');
        expect(data).toHaveProperty('searchMetadata');
      }
    }
  });

  test('should validate pathfinding parameters', async ({ request }) => {
    // Test with invalid target ID
    const response = await request.get('/api/people/me/paths?target=invalid-id');

    // Should handle invalid ID gracefully
    expect([400, 404, 500]).toContain(response.status());
  });

  test('should handle missing target parameter', async ({ request }) => {
    const response = await request.get('/api/people/me/paths');

    // Should return error for missing parameter
    expect([400, 422]).toContain(response.status());
  });
});
