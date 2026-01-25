/**
 * Simple Vercel Blob Store Creation - Manual Steps Automation
 */

import { chromium } from 'playwright';

async function createBlob() {
  console.log('Launching browser...');

  const browser = await chromium.launch({
    headless: false,
    channel: 'chrome'
  });

  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // Go directly to create store page
    console.log('Opening Vercel stores page...');
    await page.goto('https://vercel.com/ray-security/calculator-app/stores', { waitUntil: 'domcontentloaded', timeout: 30000 });

    console.log('\n=================================');
    console.log('MANUAL STEPS (automation will help):');
    console.log('1. If you see "Create Database" button, I will click it');
    console.log('2. Select "Blob" option');
    console.log('3. Click Continue');
    console.log('4. Name: calculator-app-uploads');
    console.log('5. Click Create');
    console.log('=================================\n');

    // Wait a bit for page to load
    await page.waitForTimeout(3000);

    // Try to find and click Create button
    console.log('Looking for Create Database button...');
    const createButtons = [
      'button:has-text("Create Database")',
      'a:has-text("Create Database")',
      'button:has-text("Create")',
      '[data-testid="create-database"]'
    ];

    let clicked = false;
    for (const selector of createButtons) {
      try {
        const button = page.locator(selector).first();
        if (await button.count() > 0) {
          console.log(`✓ Found button with selector: ${selector}`);
          await button.click({ timeout: 5000 });
          console.log('✓ Clicked Create Database');
          clicked = true;
          break;
        }
      } catch (e) {
        // Try next selector
      }
    }

    if (!clicked) {
      console.log('⚠ Could not find Create button automatically');
      console.log('Please click "Create Database" manually in the browser');
      await page.waitForTimeout(10000);
    }

    // Wait for store type selection
    await page.waitForTimeout(2000);

    // Try to select Blob
    console.log('Looking for Blob option...');
    const blobSelectors = [
      'button:has-text("Blob")',
      '[data-testid="blob"]',
      'text=Blob',
      '[aria-label*="Blob"]'
    ];

    clicked = false;
    for (const selector of blobSelectors) {
      try {
        const option = page.locator(selector).first();
        if (await option.count() > 0) {
          console.log(`✓ Found Blob option with selector: ${selector}`);
          await option.click({ timeout: 5000 });
          console.log('✓ Clicked Blob option');
          clicked = true;
          break;
        }
      } catch (e) {
        // Try next
      }
    }

    if (!clicked) {
      console.log('⚠ Could not find Blob option automatically');
      console.log('Please select Blob manually in the browser');
      await page.waitForTimeout(10000);
    }

    await page.waitForTimeout(2000);

    // Try to click Continue/Next
    console.log('Looking for Continue button...');
    const continueSelectors = [
      'button:has-text("Continue")',
      'button:has-text("Next")',
      'button[type="submit"]'
    ];

    for (const selector of continueSelectors) {
      try {
        const button = page.locator(selector).first();
        if (await button.count() > 0) {
          console.log(`✓ Found Continue button with selector: ${selector}`);
          await button.click({ timeout: 5000 });
          console.log('✓ Clicked Continue');
          break;
        }
      } catch (e) {
        // Try next
      }
    }

    await page.waitForTimeout(2000);

    // Try to fill name
    console.log('Looking for name input...');
    const nameSelectors = [
      'input[name="name"]',
      'input[placeholder*="name"]',
      'input[type="text"]'
    ];

    for (const selector of nameSelectors) {
      try {
        const input = page.locator(selector).first();
        if (await input.count() > 0 && await input.isVisible()) {
          console.log(`✓ Found name input with selector: ${selector}`);
          await input.fill('calculator-app-uploads');
          console.log('✓ Filled name: calculator-app-uploads');
          break;
        }
      } catch (e) {
        // Try next
      }
    }

    await page.waitForTimeout(1000);

    // Try to click final Create button
    console.log('Looking for final Create button...');
    const submitSelectors = [
      'button:has-text("Create")',
      'button[type="submit"]',
      'button:has-text("Submit")'
    ];

    for (const selector of submitSelectors) {
      try {
        const button = page.locator(selector).first();
        if (await button.count() > 0) {
          console.log(`✓ Found Create button with selector: ${selector}`);
          await button.click({ timeout: 5000 });
          console.log('✓ Clicked Create');
          break;
        }
      } catch (e) {
        // Try next
      }
    }

    console.log('\nWaiting for store creation to complete...');
    await page.waitForTimeout(8000);

    // Navigate to env vars to check
    console.log('Checking environment variables...');
    await page.goto('https://vercel.com/ray-security/calculator-app/settings/environment-variables', { timeout: 30000 });
    await page.waitForTimeout(3000);

    const pageContent = await page.content();

    if (pageContent.includes('BLOB_READ_WRITE_TOKEN')) {
      console.log('\n✓✓✓ SUCCESS! ✓✓✓');
      console.log('✓ Blob store created');
      console.log('✓ BLOB_READ_WRITE_TOKEN environment variable added');
      console.log('\nClosing browser in 5 seconds...');
      await page.waitForTimeout(5000);
    } else {
      console.log('\n⚠ Store creation may need manual completion');
      console.log('Check the browser window and complete any remaining steps');
      console.log('Browser will stay open for 30 seconds...');
      await page.waitForTimeout(30000);
    }

  } catch (error) {
    console.error('\nError:', error.message);
    console.log('Browser will stay open for 30 seconds for manual completion...');
    await page.waitForTimeout(30000);
  } finally {
    await browser.close();
    console.log('Browser closed.');
  }
}

createBlob().catch(console.error);
