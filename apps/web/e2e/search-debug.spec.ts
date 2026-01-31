import { test, expect } from '@playwright/test';

test('debug search - check what renders', async ({ page }) => {
  await page.goto('/');

  // Wait for page to load
  await page.waitForLoadState('networkidle');

  const searchInput = page.getByPlaceholder('Who do you want to meet?');
  await expect(searchInput).toBeVisible();

  // Type in search
  await searchInput.fill('Alice');

  // Wait a bit for React Query
  await page.waitForTimeout(2000);

  // Take a screenshot
  await page.screenshot({ path: 'search-debug.png', fullPage: true });

  // Log all cmdk elements
  const cmdkElements = await page.locator('[class*="cmdk"]').all();
  console.log(`Found ${cmdkElements.length} cmdk elements`);

  for (const el of cmdkElements) {
    const attrs = await el.evaluate((node) => {
      const result: Record<string, string> = {};
      for (const attr of node.attributes) {
        result[attr.name] = attr.value;
      }
      return result;
    });
    console.log('Element:', attrs);
  }

  // Check if CommandItem elements exist
  const items = page.locator('[cmdk-item]');
  const count = await items.count();
  console.log(`Found ${count} [cmdk-item] elements`);

  // Log the HTML
  const html = await page.content();
  console.log('Page HTML length:', html.length);
});
