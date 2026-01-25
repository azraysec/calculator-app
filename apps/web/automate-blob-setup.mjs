/**
 * Automated Vercel Blob Store Setup using Playwright
 */

import { chromium } from 'playwright';

async function setupBlobStore() {
  console.log('Launching browser automation...');

  const browser = await chromium.launch({
    headless: false,
    channel: 'chrome'
  });

  const context = await browser.newContext();

  const page = await context.newPage();

  try {
    // Navigate to project stores
    console.log('Navigating to project stores...');
    await page.goto('https://vercel.com/ray-security/calculator-app/stores');
    await page.waitForLoadState('networkidle');

    // Check if already logged in, if not wait for manual login
    const loginButton = await page.locator('text=Log in').count();
    if (loginButton > 0) {
      console.log('Please log in to Vercel in the browser window...');
      await page.waitForURL('**/calculator-app/stores', { timeout: 60000 });
      await context.storageState({ path: 'vercel-auth.json' });
      console.log('✓ Logged in and session saved');
    }

    // Create Blob store
    console.log('Creating Blob store...');

    // Click "Create Database" or "Create Store" button
    const createButton = page.locator('button:has-text("Create Database"), button:has-text("Create"), a:has-text("Create Database")').first();
    await createButton.click();
    await page.waitForTimeout(1000);

    // Select Blob store type
    const blobOption = page.locator('text=Blob, button:has-text("Blob"), [data-testid="blob"]').first();
    await blobOption.click();
    await page.waitForTimeout(1000);

    // Continue/Next
    const continueButton = page.locator('button:has-text("Continue"), button:has-text("Next")').first();
    if (await continueButton.count() > 0) {
      await continueButton.click();
      await page.waitForTimeout(1000);
    }

    // Set store name
    const nameInput = page.locator('input[name="name"], input[placeholder*="name" i]').first();
    if (await nameInput.count() > 0) {
      await nameInput.fill('calculator-app-uploads');
      await page.waitForTimeout(500);
    }

    // Create/Submit
    const submitButton = page.locator('button:has-text("Create"), button[type="submit"]').first();
    await submitButton.click();

    console.log('Waiting for store creation...');
    await page.waitForTimeout(5000);

    // Check if BLOB_READ_WRITE_TOKEN is now in env vars
    await page.goto('https://vercel.com/ray-security/calculator-app/settings/environment-variables');
    await page.waitForLoadState('networkidle');

    const blobToken = await page.locator('text=BLOB_READ_WRITE_TOKEN').count();

    if (blobToken > 0) {
      console.log('✓ Blob store created successfully!');
      console.log('✓ BLOB_READ_WRITE_TOKEN environment variable added');
      console.log('\nNow redeploying...');
    } else {
      console.log('⚠ Store may have been created but token not found in env vars');
      console.log('Check: https://vercel.com/ray-security/calculator-app/settings/environment-variables');
    }

    await page.waitForTimeout(3000);

  } catch (error) {
    console.error('Error during automation:', error.message);
    console.log('Browser will remain open for manual completion');
    await page.waitForTimeout(30000);
  } finally {
    await browser.close();
  }
}

setupBlobStore().catch(console.error);
