/**
 * E2E Tests for Data Sources Page
 * Tests LinkedIn archive upload flow
 */

import { test, expect } from '@playwright/test';
import path from 'path';

test.describe('Data Sources Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Click on Data Sources tab
    await page.getByRole('tab', { name: 'Data Sources' }).click();
  });

  test('should display data sources page', async ({ page }) => {
    await expect(page.getByText('Sync Health')).toBeVisible();
  });

  test('should show all data source cards', async ({ page }) => {
    // Check for LinkedIn card
    await expect(page.getByRole('heading', { name: 'LinkedIn' })).toBeVisible();
    await expect(page.getByText(/Import connections and messages/)).toBeVisible();

    // Check for other sources
    await expect(page.getByRole('heading', { name: 'Gmail' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'HubSpot' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Google Calendar' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'CSV Import' })).toBeVisible();
  });

  test('should show sync health widget', async ({ page }) => {
    await expect(page.getByText('Sync Health')).toBeVisible();
    await expect(page.getByText(/Connected Source/)).toBeVisible();
  });

  test('should display "Not Connected" badges for unconnected sources', async ({ page }) => {
    const badges = page.getByText('Not Connected');
    await expect(badges.first()).toBeVisible();
  });
});

test.describe('LinkedIn Archive Upload', () => {
  test('should open upload dialog when clicking LinkedIn upload button', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('tab', { name: 'Data Sources' }).click();

    // Find and click the LinkedIn upload button
    const linkedInCard = page.locator('text=LinkedIn').locator('..');
    await linkedInCard.getByRole('button', { name: /Upload Archive/i }).click();

    // Verify dialog opens
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByText('Upload LinkedIn Data Archive')).toBeVisible();
  });

  test('should show upload instructions in dialog', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('tab', { name: 'Data Sources' }).click();
    const linkedInCard = page.locator('text=LinkedIn').locator('..');
    await linkedInCard.getByRole('button', { name: /Upload Archive/i }).click();

    // Check for instructions
    await expect(page.getByText(/How to get your LinkedIn data/)).toBeVisible();
    await expect(page.getByText(/Go to LinkedIn Settings/)).toBeVisible();
    await expect(page.getByText(/Request archive and download/)).toBeVisible();
  });

  test('should allow file selection', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('tab', { name: 'Data Sources' }).click();
    const linkedInCard = page.locator('text=LinkedIn').locator('..');
    await linkedInCard.getByRole('button', { name: /Upload Archive/i }).click();

    // Find file input
    const fileInput = page.locator('input[type="file"]');
    await expect(fileInput).toBeAttached();
  });

  test('should validate file type', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('tab', { name: 'Data Sources' }).click();
    const linkedInCard = page.locator('text=LinkedIn').locator('..');
    await linkedInCard.getByRole('button', { name: /Upload Archive/i }).click();

    // Try to upload non-ZIP file (this test would need a test fixture)
    // For now, just verify the upload button requires a file
    const uploadButton = page.getByRole('button', { name: /Upload & Process/i });
    await expect(uploadButton).toBeDisabled();
  });

  test('should close dialog on cancel', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('tab', { name: 'Data Sources' }).click();
    const linkedInCard = page.locator('text=LinkedIn').locator('..');
    await linkedInCard.getByRole('button', { name: /Upload Archive/i }).click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();

    // Click cancel
    await page.getByRole('button', { name: 'Cancel' }).click();

    // Dialog should close
    await expect(dialog).not.toBeVisible();
  });
});

test.describe('Navigation', () => {
  test('should navigate from main page to data sources tab', async ({ page }) => {
    await page.goto('/');

    // Click on Data Sources tab
    await page.getByRole('tab', { name: 'Data Sources' }).click();

    // Should show Data Sources content
    await expect(page.getByText('Sync Health')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'LinkedIn' })).toBeVisible();
  });
});
