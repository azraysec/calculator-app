/**
 * E2E Tests for Version Display
 * Verifies the app version is displayed correctly on the home page
 */

import { test, expect } from '@playwright/test';

test.describe('Version Display', () => {
  test('should display version badge on home page', async ({ page }) => {
    await page.goto('/');

    // Version badge should be visible with format "vX.Y.Z"
    const versionBadge = page.locator('text=/v\\d+\\.\\d+\\.\\d+/');
    await expect(versionBadge).toBeVisible({ timeout: 10000 });
  });

  test('should display git commit hash badge', async ({ page }) => {
    await page.goto('/');

    // Git commit badge should be visible (7 character hash or "local")
    const commitBadge = page.locator('text=/^[a-f0-9]{7}$|^local$/');
    await expect(commitBadge).toBeVisible({ timeout: 10000 });
  });

  test('should display build timestamp on larger screens', async ({ page }) => {
    // Set viewport to desktop size
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto('/');

    // Build timestamp should be visible
    const buildTimestamp = page.locator('text=/Built:/');
    await expect(buildTimestamp).toBeVisible({ timeout: 10000 });
  });

  test('version should match expected format', async ({ page }) => {
    await page.goto('/');

    // Get the version text
    const versionBadge = page.locator('text=/v\\d+\\.\\d+\\.\\d+/');
    const versionText = await versionBadge.textContent();

    // Verify it matches semantic versioning format
    expect(versionText).toMatch(/^v\d+\.\d+\.\d+$/);
  });
});
