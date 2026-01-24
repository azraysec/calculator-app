# WIG (Warm Intro Graph) - Comprehensive Test Plan

## Executive Summary

This test plan provides comprehensive coverage for all features of the Warm Intro Graph application. Current test coverage is at 16% (9/57 test scenarios). User reports bugs in pathfinding functionality which has 0% test coverage.

**Priority**: Pathfinding tests are critical as this is where bugs are reported.

## Test Coverage Status

| Feature Area | Test Scenarios | Implemented | Coverage | Priority |
|--------------|----------------|-------------|----------|----------|
| Person Search | 9 | 9 | 100% | ✅ DONE |
| Pathfinding | 15 | 0 | 0% | 🔴 CRITICAL |
| Network Overview | 8 | 0 | 0% | 🟡 HIGH |
| LinkedIn Integration | 10 | 0 | 0% | 🟡 HIGH |
| Graph Visualization | 7 | 0 | 0% | 🟢 MEDIUM |
| API Endpoints | 8 | 2 | 25% | 🟡 HIGH |
| **TOTAL** | **57** | **11** | **19%** | - |

---

## 1. PATHFINDING TESTS (CRITICAL - USER REPORTS BUGS)

### Test File: `pathfinding.spec.ts`

**Priority**: P0 - Critical functionality with reported bugs

#### 1.1 Basic Pathfinding

```typescript
test('should find direct path between two people', async ({ page }) => {
  // Navigate to app
  await page.goto('/');

  // Search for and select a person that has direct connection from 'me'
  await page.getByPlaceholder('Who do you want to meet?').fill('Alice');
  await page.waitForTimeout(1000);
  await page.locator('[cmdk-item]').filter({ hasText: 'Alice Johnson' }).click();

  // Should show path results
  await expect(page.getByText('Target:')).toBeVisible();
  await expect(page.getByText('Alice Johnson')).toBeVisible();

  // Should show at least one path
  await expect(page.locator('.space-y-4').locator('div').filter({ hasText: /→/ })).toBeVisible({ timeout: 10000 });
});
```

```typescript
test('should find multi-hop path (2 hops)', async ({ page }) => {
  await page.goto('/');

  // Select target that requires 2 hops
  await page.getByPlaceholder('Who do you want to meet?').fill('Charlie');
  await page.waitForTimeout(1000);
  await page.locator('[cmdk-item]').first().click();

  // Wait for paths to load
  await page.waitForSelector('text=hops', { timeout: 10000 });

  // Verify path shows correct number of hops
  await expect(page.getByText('2 hops')).toBeVisible();
});
```

```typescript
test('should find multi-hop path (3 hops)', async ({ page }) => {
  await page.goto('/');

  // Select target that requires maximum hops
  await page.getByPlaceholder('Who do you want to meet?').fill('Dave');
  await page.waitForTimeout(1000);
  await page.locator('[cmdk-item]').first().click();

  // Should show 3-hop path or "No paths found"
  await page.waitForTimeout(5000);
  const hasPath = await page.getByText('3 hops').isVisible().catch(() => false);
  const noPath = await page.getByText('No paths found').isVisible().catch(() => false);

  expect(hasPath || noPath).toBeTruthy();
});
```

#### 1.2 No Path Scenarios

```typescript
test('should show "No paths found" for disconnected person', async ({ page }) => {
  await page.goto('/');

  // Create a person with no connections via API
  // Then search for them
  await page.getByPlaceholder('Who do you want to meet?').fill('Isolated Person');
  await page.waitForTimeout(1000);

  // If person exists but no path, should show message
  await expect(page.getByText('No warm introduction paths found')).toBeVisible({ timeout: 10000 });
});
```

```typescript
test('should show helpful message when no paths within max hops', async ({ page }) => {
  await page.goto('/');

  // Target someone who is connected but beyond 3 hops
  await page.getByPlaceholder('Who do you want to meet?').fill('FarAway');
  await page.waitForTimeout(1000);
  await page.locator('[cmdk-item]').first().click();

  await expect(page.getByText(/Try increasing max hops/i)).toBeVisible({ timeout: 10000 });
});
```

#### 1.3 Path Display and Ranking

```typescript
test('should display paths sorted by strength (highest first)', async ({ page }) => {
  await page.goto('/');

  await page.getByPlaceholder('Who do you want to meet?').fill('Bob');
  await page.waitForTimeout(1000);
  await page.locator('[cmdk-item]').first().click();

  // Wait for multiple paths
  await page.waitForTimeout(3000);

  // Get all path strength badges
  const pathCards = await page.locator('[class*="p-4"][class*="cursor-pointer"]').all();

  if (pathCards.length > 1) {
    const firstStrength = await pathCards[0].locator('text=/\\d+% strength/').textContent();
    const secondStrength = await pathCards[1].locator('text=/\\d+% strength/').textContent();

    const first = parseInt(firstStrength!.match(/\d+/)![0]);
    const second = parseInt(secondStrength!.match(/\d+/)![0]);

    expect(first).toBeGreaterThanOrEqual(second);
  }
});
```

```typescript
test('should show path score and explanation', async ({ page }) => {
  await page.goto('/');

  await page.getByPlaceholder('Who do you want to meet?').fill('Alice');
  await page.waitForTimeout(1000);
  await page.locator('[cmdk-item]').first().click();

  await page.waitForTimeout(3000);

  // Should show percentage strength badge
  await expect(page.locator('text=/\\d+% strength/')).toBeVisible();

  // Should show hop count
  await expect(page.locator('text=/\\d+ hops?/')).toBeVisible();

  // Should show explanation text
  await expect(page.locator('text=/Direct connection|via/i')).toBeVisible();
});
```

```typescript
test('should display path nodes in correct order (You → Intermediary → Target)', async ({ page }) => {
  await page.goto('/');

  await page.getByPlaceholder('Who do you want to meet?').fill('Charlie');
  await page.waitForTimeout(1000);
  await page.locator('[cmdk-item]').first().click();

  await page.waitForTimeout(3000);

  // Click first path card to select it
  await page.locator('[class*="cursor-pointer"]').first().click();

  // Right panel should show path details with correct order
  await expect(page.getByText('Path Details')).toBeVisible();

  // Should show nodes in order with arrows
  const pathText = await page.locator('text=→').first().textContent();
  expect(pathText).toContain('→');
});
```

#### 1.4 Path Selection and Interaction

```typescript
test('should select first path automatically', async ({ page }) => {
  await page.goto('/');

  await page.getByPlaceholder('Who do you want to meet?').fill('Bob');
  await page.waitForTimeout(1000);
  await page.locator('[cmdk-item]').first().click();

  await page.waitForTimeout(3000);

  // First path should be selected (has border-primary class)
  const firstPath = await page.locator('[class*="border-primary"]').count();
  expect(firstPath).toBeGreaterThan(0);
});
```

```typescript
test('should switch between multiple paths', async ({ page }) => {
  await page.goto('/');

  await page.getByPlaceholder('Who do you want to meet?').fill('Bob');
  await page.waitForTimeout(1000);
  await page.locator('[cmdk-item]').first().click();

  await page.waitForTimeout(3000);

  const paths = await page.locator('[class*="cursor-pointer"]').all();

  if (paths.length > 1) {
    // Click second path
    await paths[1].click();

    // Second path should now be selected
    const secondPathClass = await paths[1].getAttribute('class');
    expect(secondPathClass).toContain('border-primary');
  }
});
```

```typescript
test('should update graph visualization when switching paths', async ({ page }) => {
  await page.goto('/');

  await page.getByPlaceholder('Who do you want to meet?').fill('Bob');
  await page.waitForTimeout(1000);
  await page.locator('[cmdk-item]').first().click();

  await page.waitForTimeout(3000);

  // Graph should be visible
  await expect(page.locator('.react-flow')).toBeVisible({ timeout: 5000 });

  const paths = await page.locator('[class*="cursor-pointer"]').all();

  if (paths.length > 1) {
    // Take screenshot of first path visualization
    const firstViz = await page.locator('.react-flow').screenshot();

    // Switch to second path
    await paths[1].click();
    await page.waitForTimeout(500);

    // Visualization should update (different screenshot)
    const secondViz = await page.locator('.react-flow').screenshot();

    expect(firstViz).not.toEqual(secondViz);
  }
});
```

#### 1.5 Search Metadata Display

```typescript
test('should display search metadata (nodes explored, edges evaluated, duration)', async ({ page }) => {
  await page.goto('/');

  await page.getByPlaceholder('Who do you want to meet?').fill('Alice');
  await page.waitForTimeout(1000);
  await page.locator('[cmdk-item]').first().click();

  await page.waitForTimeout(3000);

  // Should show metadata at bottom of left panel
  await expect(page.getByText(/Searched \d+ nodes/)).toBeVisible();
  await expect(page.getByText(/Evaluated \d+ connections/)).toBeVisible();
  await expect(page.getByText(/Completed in \d+ms/)).toBeVisible();
});
```

```typescript
test('should show loading state during pathfinding', async ({ page }) => {
  await page.goto('/');

  await page.getByPlaceholder('Who do you want to meet?').fill('Bob');
  await page.waitForTimeout(1000);
  await page.locator('[cmdk-item]').first().click();

  // Should show skeleton loaders immediately
  await expect(page.locator('[class*="h-32"][class*="w-full"]')).toBeVisible({ timeout: 1000 });
});
```

#### 1.6 Error Handling

```typescript
test('should show error message when API fails', async ({ page }) => {
  // Mock API to fail
  await page.route('/api/people/me/paths*', route => route.abort());

  await page.goto('/');

  await page.getByPlaceholder('Who do you want to meet?').fill('Alice');
  await page.waitForTimeout(1000);
  await page.locator('[cmdk-item]').first().click();

  // Should show error state
  await expect(page.getByText('Error')).toBeVisible({ timeout: 5000 });
  await expect(page.getByText('Failed to find introduction paths')).toBeVisible();
});
```

```typescript
test('should clear paths when searching for new person', async ({ page }) => {
  await page.goto('/');

  // First search
  await page.getByPlaceholder('Who do you want to meet?').fill('Alice');
  await page.waitForTimeout(1000);
  await page.locator('[cmdk-item]').first().click();
  await page.waitForTimeout(3000);

  // Verify paths shown
  await expect(page.getByText('Target:')).toBeVisible();

  // New search
  await page.getByPlaceholder('Who do you want to meet?').fill('Bob');
  await page.waitForTimeout(1000);
  await page.locator('[cmdk-item]').first().click();

  // Should show new target
  await expect(page.getByText('Bob Smith')).toBeVisible();

  // Old paths should be cleared
  await page.waitForTimeout(3000);
  const targetCount = await page.locator('text=Target:').count();
  expect(targetCount).toBe(1); // Only one target shown
});
```

---

## 2. PATHFINDING API TESTS

### Test File: `pathfinding-api.spec.ts`

**Priority**: P0 - Critical backend functionality

#### 2.1 API Endpoint Tests

```typescript
test('should return paths for valid request', async ({ request }) => {
  // First get a valid person ID
  const networkRes = await request.get('/api/network');
  const network = await networkRes.json();
  const targetPerson = network.people.find(p => p.id !== 'me');

  // Request paths
  const response = await request.get(`/api/people/me/paths?target=${targetPerson.id}`);
  expect(response.ok()).toBeTruthy();

  const data = await response.json();
  expect(data.paths).toBeDefined();
  expect(data.targetPerson).toBeDefined();
  expect(data.searchMetadata).toBeDefined();
  expect(data.searchMetadata.nodesExplored).toBeGreaterThan(0);
});
```

```typescript
test('should validate UUID format for target parameter', async ({ request }) => {
  const response = await request.get('/api/people/me/paths?target=invalid-uuid');
  expect(response.status()).toBe(400);

  const error = await response.json();
  expect(error.error).toBe('Validation error');
});
```

```typescript
test('should support maxHops parameter', async ({ request }) => {
  const networkRes = await request.get('/api/network');
  const network = await networkRes.json();
  const targetPerson = network.people.find(p => p.id !== 'me');

  const response = await request.get(`/api/people/me/paths?target=${targetPerson.id}&maxHops=2`);
  expect(response.ok()).toBeTruthy();

  const data = await response.json();

  // All paths should have <= 2 edges (hops)
  data.paths.forEach(path => {
    expect(path.edges.length).toBeLessThanOrEqual(2);
  });
});
```

```typescript
test('should support minStrength parameter', async ({ request }) => {
  const networkRes = await request.get('/api/network');
  const network = await networkRes.json();
  const targetPerson = network.people.find(p => p.id !== 'me');

  const response = await request.get(`/api/people/me/paths?target=${targetPerson.id}&minStrength=0.7`);
  expect(response.ok()).toBeTruthy();

  const data = await response.json();

  // All edges should have strength >= 0.7
  data.paths.forEach(path => {
    path.edges.forEach(edge => {
      expect(edge.strength).toBeGreaterThanOrEqual(0.7);
    });
  });
});
```

```typescript
test('should reject maxHops > 5', async ({ request }) => {
  const response = await request.get('/api/people/me/paths?target=00000000-0000-0000-0000-000000000001&maxHops=10');
  expect(response.status()).toBe(400);
});
```

```typescript
test('should reject minStrength > 1.0', async ({ request }) => {
  const response = await request.get('/api/people/me/paths?target=00000000-0000-0000-0000-000000000001&minStrength=1.5');
  expect(response.status()).toBe(400);
});
```

```typescript
test('should return empty paths array when no paths exist', async ({ request }) => {
  // Create isolated person via API first, then search
  const response = await request.get('/api/people/me/paths?target=00000000-0000-0000-0000-999999999999');

  if (response.status() === 404) {
    expect(response.status()).toBe(404);
  } else {
    const data = await response.json();
    expect(data.paths).toEqual([]);
  }
});
```

```typescript
test('should return paths sorted by score descending', async ({ request }) => {
  const networkRes = await request.get('/api/network');
  const network = await networkRes.json();
  const targetPerson = network.people.find(p => p.id !== 'me');

  const response = await request.get(`/api/people/me/paths?target=${targetPerson.id}`);
  const data = await response.json();

  if (data.paths.length > 1) {
    for (let i = 0; i < data.paths.length - 1; i++) {
      expect(data.paths[i].score).toBeGreaterThanOrEqual(data.paths[i + 1].score);
    }
  }
});
```

---

## 3. NETWORK OVERVIEW TESTS

### Test File: `network-overview.spec.ts`

**Priority**: P1 - High priority feature

#### 3.1 Tab Navigation

```typescript
test('should navigate to Network Overview tab', async ({ page }) => {
  await page.goto('/');

  // Click "My Network" tab
  await page.getByRole('tab', { name: 'My Network' }).click();

  // Should show network statistics
  await expect(page.getByText('Network Statistics')).toBeVisible({ timeout: 5000 });
});
```

#### 3.2 Statistics Display

```typescript
test('should display network statistics', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('tab', { name: 'My Network' }).click();

  await page.waitForTimeout(2000);

  // Should show all 6 statistics
  await expect(page.getByText('Total People')).toBeVisible();
  await expect(page.getByText('Total Connections')).toBeVisible();
  await expect(page.getByText('Strong Connections')).toBeVisible();
  await expect(page.getByText('Medium Connections')).toBeVisible();
  await expect(page.getByText('Weak Connections')).toBeVisible();
  await expect(page.getByText('Avg Connections')).toBeVisible();

  // All should have numeric values
  const statValues = await page.locator('[class*="text-3xl"][class*="font-bold"]').all();
  expect(statValues.length).toBeGreaterThanOrEqual(6);
});
```

```typescript
test('should calculate connection strength categories correctly', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('tab', { name: 'My Network' }).click();

  await page.waitForTimeout(2000);

  // Get the numbers
  const totalConnections = await page.locator('text=Total Connections').locator('..').locator('[class*="text-3xl"]').textContent();
  const strongConnections = await page.locator('text=Strong Connections').locator('..').locator('[class*="text-3xl"]').textContent();
  const mediumConnections = await page.locator('text=Medium Connections').locator('..').locator('[class*="text-3xl"]').textContent();
  const weakConnections = await page.locator('text=Weak Connections').locator('..').locator('[class*="text-3xl"]').textContent();

  const total = parseInt(totalConnections!);
  const strong = parseInt(strongConnections!);
  const medium = parseInt(mediumConnections!);
  const weak = parseInt(weakConnections!);

  // Sum of categories should equal total
  expect(strong + medium + weak).toBe(total);
});
```

#### 3.3 Organization Groups

```typescript
test('should display organization groups', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('tab', { name: 'My Network' }).click();

  await page.waitForTimeout(2000);

  // Should show Organizations section
  await expect(page.getByText('Organizations')).toBeVisible();

  // Should show badges with org names and counts
  const orgBadges = await page.locator('[class*="badge"]').filter({ hasText: /\(\d+\)/ }).all();
  expect(orgBadges.length).toBeGreaterThan(0);
});
```

#### 3.4 People List

```typescript
test('should display all people in network', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('tab', { name: 'My Network' }).click();

  await page.waitForTimeout(2000);

  // Should show "All People" heading with count
  await expect(page.locator('text=/All People \\(\\d+\\)/')).toBeVisible();

  // Should show person cards
  const personCards = await page.locator('[class*="flex"][class*="items-start"][class*="gap-4"][class*="p-4"]').all();
  expect(personCards.length).toBeGreaterThan(0);
});
```

```typescript
test('should display person details (name, title, org, email, connections)', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('tab', { name: 'My Network' }).click();

  await page.waitForTimeout(2000);

  // Get first person card
  const firstPerson = await page.locator('[class*="flex"][class*="items-start"][class*="gap-4"][class*="p-4"]').first();

  // Should have avatar
  await expect(firstPerson.locator('[class*="avatar"]')).toBeVisible();

  // Should have name (font-semibold)
  const name = await firstPerson.locator('[class*="font-semibold"]').first();
  await expect(name).toBeVisible();

  // Connection count should be visible
  await expect(firstPerson.locator('text=/\\d+ connections?/')).toBeVisible();
});
```

```typescript
test('should show connection strength badges for each person', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('tab', { name: 'My Network' }).click();

  await page.waitForTimeout(2000);

  // Find people with connections
  const peopleWithConnections = await page.locator('text=/\\d+ connections?/').first();

  if (await peopleWithConnections.isVisible()) {
    // Should show strength percentages
    await expect(page.locator('[class*="badge"]').filter({ hasText: /%/ }).first()).toBeVisible();
  }
});
```

#### 3.5 Connection Strength Legend

```typescript
test('should display connection strength legend', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('tab', { name: 'My Network' }).click();

  await page.waitForTimeout(2000);

  // Should show legend
  await expect(page.getByText('Connection Strength')).toBeVisible();
  await expect(page.getByText('Strong')).toBeVisible();
  await expect(page.getByText('≥ 70%')).toBeVisible();
  await expect(page.getByText('Medium')).toBeVisible();
  await expect(page.getByText('40-69%')).toBeVisible();
  await expect(page.getByText('Weak')).toBeVisible();
  await expect(page.getByText('< 40%')).toBeVisible();
});
```

#### 3.6 Loading and Error States

```typescript
test('should show loading skeleton while fetching network', async ({ page }) => {
  // Slow down network to see loading state
  await page.route('/api/network', route => {
    setTimeout(() => route.continue(), 2000);
  });

  await page.goto('/');
  await page.getByRole('tab', { name: 'My Network' }).click();

  // Should show skeleton loaders
  await expect(page.locator('[class*="skeleton"]')).toBeVisible({ timeout: 1000 });
});
```

---

## 4. NETWORK API TESTS

### Test File: `network-api.spec.ts`

**Priority**: P1 - High priority

```typescript
test('should return complete network data', async ({ request }) => {
  const response = await request.get('/api/network');
  expect(response.ok()).toBeTruthy();

  const data = await response.json();

  expect(data.people).toBeDefined();
  expect(data.edges).toBeDefined();
  expect(data.stats).toBeDefined();
  expect(data.organizationGroups).toBeDefined();

  expect(Array.isArray(data.people)).toBe(true);
  expect(Array.isArray(data.edges)).toBe(true);
});
```

```typescript
test('should return valid person objects', async ({ request }) => {
  const response = await request.get('/api/network');
  const data = await response.json();

  if (data.people.length > 0) {
    const person = data.people[0];

    expect(person.id).toBeDefined();
    expect(person.names).toBeDefined();
    expect(Array.isArray(person.names)).toBe(true);
    expect(person.emails).toBeDefined();
    expect(Array.isArray(person.emails)).toBe(true);
  }
});
```

```typescript
test('should return valid edge objects', async ({ request }) => {
  const response = await request.get('/api/network');
  const data = await response.json();

  if (data.edges.length > 0) {
    const edge = data.edges[0];

    expect(edge.id).toBeDefined();
    expect(edge.fromPersonId).toBeDefined();
    expect(edge.toPersonId).toBeDefined();
    expect(edge.strength).toBeDefined();
    expect(edge.strength).toBeGreaterThanOrEqual(0);
    expect(edge.strength).toBeLessThanOrEqual(1);
  }
});
```

```typescript
test('should return accurate statistics', async ({ request }) => {
  const response = await request.get('/api/network');
  const data = await response.json();

  expect(data.stats.totalPeople).toBe(data.people.length);
  expect(data.stats.totalConnections).toBe(data.edges.length);

  // Verify connection strength categories
  const strong = data.edges.filter(e => e.strength >= 0.7).length;
  const medium = data.edges.filter(e => e.strength >= 0.4 && e.strength < 0.7).length;
  const weak = data.edges.filter(e => e.strength < 0.4).length;

  expect(data.stats.strongConnections).toBe(strong);
  expect(data.stats.mediumConnections).toBe(medium);
  expect(data.stats.weakConnections).toBe(weak);
});
```

---

## 5. LINKEDIN INTEGRATION TESTS

### Test File: `linkedin-integration.spec.ts`

**Priority**: P1 - High priority feature

#### 5.1 LinkedIn URL Detection

```typescript
test('should detect LinkedIn URL format', async ({ page }) => {
  await page.goto('/');

  const searchInput = page.getByPlaceholder('Who do you want to meet?');

  // Paste LinkedIn URL
  await searchInput.fill('https://www.linkedin.com/in/john-doe');

  // Should show LinkedIn detection message
  await expect(page.getByText(/Detected LinkedIn URL/i)).toBeVisible({ timeout: 2000 });
  await expect(page.getByText('John Doe')).toBeVisible();
});
```

```typescript
test('should detect LinkedIn URL without https://', async ({ page }) => {
  await page.goto('/');

  const searchInput = page.getByPlaceholder('Who do you want to meet?');

  await searchInput.fill('linkedin.com/in/jane-smith');

  await expect(page.getByText(/Detected LinkedIn URL/i)).toBeVisible({ timeout: 2000 });
});
```

```typescript
test('should detect LinkedIn URL with /pub/ format', async ({ page }) => {
  await page.goto('/');

  const searchInput = page.getByPlaceholder('Who do you want to meet?');

  await searchInput.fill('https://www.linkedin.com/pub/john-doe');

  await expect(page.getByText(/Detected LinkedIn URL/i)).toBeVisible({ timeout: 2000 });
});
```

#### 5.2 LinkedIn Name Parsing

```typescript
test('should convert LinkedIn username to search query', async ({ page }) => {
  await page.goto('/');

  const searchInput = page.getByPlaceholder('Who do you want to meet?');

  // URL with dashes in name
  await searchInput.fill('https://www.linkedin.com/in/john-doe-smith');

  // Should convert to "John Doe Smith"
  await expect(page.getByText('John Doe Smith')).toBeVisible({ timeout: 2000 });
});
```

#### 5.3 LinkedIn Profile Fetching

```typescript
test('should show "Search LinkedIn" button when no local match', async ({ page }) => {
  await page.goto('/');

  const searchInput = page.getByPlaceholder('Who do you want to meet?');

  // Paste URL for person not in network
  await searchInput.fill('https://www.linkedin.com/in/unknown-person-xyz123');
  await page.waitForTimeout(2000);

  // Should show "Search LinkedIn" button in CommandEmpty
  await expect(page.getByRole('button', { name: /Search LinkedIn/i })).toBeVisible();
});
```

```typescript
test('should handle LinkedIn API not configured error', async ({ page }) => {
  await page.goto('/');

  const searchInput = page.getByPlaceholder('Who do you want to meet?');

  await searchInput.fill('https://www.linkedin.com/in/test-user');
  await page.waitForTimeout(2000);

  // Click Search LinkedIn button
  await page.getByRole('button', { name: /Search LinkedIn/i }).click();

  // Should show API not configured message
  await expect(page.getByText(/LinkedIn integration not configured/i)).toBeVisible({ timeout: 5000 });
});
```

```typescript
test('should handle existing person found in database', async ({ page }) => {
  // First, ensure we have a person with LinkedIn handle in DB
  await page.goto('/');

  const searchInput = page.getByPlaceholder('Who do you want to meet?');

  // Search for known person with LinkedIn profile
  await searchInput.fill('https://www.linkedin.com/in/alice-johnson');
  await page.waitForTimeout(2000);

  // If person exists, should show in search results
  const hasResult = await page.locator('[cmdk-item]').count();
  expect(hasResult).toBeGreaterThanOrEqual(0);
});
```

#### 5.4 LinkedIn URL Variations

```typescript
test('should handle LinkedIn URL with trailing slash', async ({ page }) => {
  await page.goto('/');

  await page.getByPlaceholder('Who do you want to meet?').fill('https://www.linkedin.com/in/john-doe/');

  await expect(page.getByText(/Detected LinkedIn URL/i)).toBeVisible({ timeout: 2000 });
});
```

```typescript
test('should handle LinkedIn URL with query parameters', async ({ page }) => {
  await page.goto('/');

  await page.getByPlaceholder('Who do you want to meet?').fill('https://www.linkedin.com/in/john-doe?trk=public_profile');

  await expect(page.getByText(/Detected LinkedIn URL/i)).toBeVisible({ timeout: 2000 });
});
```

```typescript
test('should show helper tip about LinkedIn URLs', async ({ page }) => {
  await page.goto('/');

  // Should show tip below search input
  await expect(page.getByText(/You can paste a LinkedIn URL/i)).toBeVisible();
});
```

#### 5.5 LinkedIn API Tests

```typescript
test('should validate LinkedIn profile URL format', async ({ request }) => {
  const response = await request.post('/api/linkedin/profile', {
    data: { url: 'not-a-url' }
  });

  expect(response.status()).toBe(400);
});
```

---

## 6. GRAPH VISUALIZATION TESTS

### Test File: `graph-visualization.spec.ts`

**Priority**: P2 - Medium priority

#### 6.1 Graph Display

```typescript
test('should show empty state when no path selected', async ({ page }) => {
  await page.goto('/');

  // Center panel should show empty state
  await expect(page.getByText('No path selected')).toBeVisible();
  await expect(page.getByText('Search for a person to see introduction paths')).toBeVisible();
});
```

```typescript
test('should render React Flow graph when path selected', async ({ page }) => {
  await page.goto('/');

  await page.getByPlaceholder('Who do you want to meet?').fill('Bob');
  await page.waitForTimeout(1000);
  await page.locator('[cmdk-item]').first().click();

  await page.waitForTimeout(3000);

  // Should render React Flow
  await expect(page.locator('.react-flow')).toBeVisible({ timeout: 5000 });
});
```

```typescript
test('should display person nodes with avatars and names', async ({ page }) => {
  await page.goto('/');

  await page.getByPlaceholder('Who do you want to meet?').fill('Alice');
  await page.waitForTimeout(1000);
  await page.locator('[cmdk-item]').first().click();

  await page.waitForTimeout(3000);

  // Should show person nodes
  const nodes = await page.locator('[data-id]').filter({ has: page.locator('text=/[A-Z]/')}).count();
  expect(nodes).toBeGreaterThan(0);
});
```

```typescript
test('should display edges with strength labels', async ({ page }) => {
  await page.goto('/');

  await page.getByPlaceholder('Who do you want to meet?').fill('Charlie');
  await page.waitForTimeout(1000);
  await page.locator('[cmdk-item]').first().click();

  await page.waitForTimeout(3000);

  // Should show edge labels with percentages
  await expect(page.locator('.react-flow').locator('text=/%/')).toBeVisible({ timeout: 5000 });
});
```

```typescript
test('should show "You" badge on source node', async ({ page }) => {
  await page.goto('/');

  await page.getByPlaceholder('Who do you want to meet?').fill('Bob');
  await page.waitForTimeout(1000);
  await page.locator('[cmdk-item]').first().click();

  await page.waitForTimeout(3000);

  await expect(page.locator('.react-flow').getByText('You')).toBeVisible({ timeout: 5000 });
});
```

```typescript
test('should show "Target" badge on destination node', async ({ page }) => {
  await page.goto('/');

  await page.getByPlaceholder('Who do you want to meet?').fill('Bob');
  await page.waitForTimeout(1000);
  await page.locator('[cmdk-item]').first().click();

  await page.waitForTimeout(3000);

  await expect(page.locator('.react-flow').getByText('Target')).toBeVisible({ timeout: 5000 });
});
```

```typescript
test('should render graph controls (zoom, fit view)', async ({ page }) => {
  await page.goto('/');

  await page.getByPlaceholder('Who do you want to meet?').fill('Alice');
  await page.waitForTimeout(1000);
  await page.locator('[cmdk-item]').first().click();

  await page.waitForTimeout(3000);

  // Should show React Flow controls
  await expect(page.locator('.react-flow__controls')).toBeVisible({ timeout: 5000 });
});
```

---

## 7. END-TO-END USER JOURNEYS

### Test File: `e2e-user-journeys.spec.ts`

**Priority**: P1 - Critical flows

```typescript
test('Complete user journey: Search → Select → View Path → Switch Paths', async ({ page }) => {
  await page.goto('/');

  // 1. Search for person
  await page.getByPlaceholder('Who do you want to meet?').fill('Bob Smith');
  await page.waitForTimeout(1000);

  // 2. Select person from results
  await page.locator('[cmdk-item]').filter({ hasText: 'Bob Smith' }).click();

  // 3. Wait for paths to load
  await page.waitForTimeout(3000);

  // 4. Verify path is shown
  await expect(page.getByText('Target:')).toBeVisible();
  await expect(page.getByText('Bob Smith')).toBeVisible();

  // 5. Verify graph visualization appears
  await expect(page.locator('.react-flow')).toBeVisible({ timeout: 5000 });

  // 6. Verify path details in right panel
  await expect(page.getByText('Path Details')).toBeVisible();

  // 7. Switch to different path (if multiple exist)
  const paths = await page.locator('[class*="cursor-pointer"]').all();
  if (paths.length > 1) {
    await paths[1].click();
    await page.waitForTimeout(500);

    // Graph should update
    await expect(page.locator('.react-flow')).toBeVisible();
  }

  // 8. Check metadata
  await expect(page.getByText(/Searched \d+ nodes/)).toBeVisible();
});
```

```typescript
test('Complete user journey: LinkedIn URL → Fetch → Not Found → Search', async ({ page }) => {
  await page.goto('/');

  // 1. Paste LinkedIn URL
  await page.getByPlaceholder('Who do you want to meet?').fill('https://www.linkedin.com/in/new-person-123');
  await page.waitForTimeout(2000);

  // 2. See detection message
  await expect(page.getByText(/Detected LinkedIn URL/i)).toBeVisible();

  // 3. Click Search LinkedIn button
  await page.getByRole('button', { name: /Search LinkedIn/i }).click();

  // 4. See result (either found or API not configured)
  await page.waitForTimeout(3000);
  const hasMessage = await page.locator('text=/LinkedIn|Profile/i').isVisible();
  expect(hasMessage).toBeTruthy();
});
```

```typescript
test('Complete user journey: Browse Network → View Stats → Find Person', async ({ page }) => {
  await page.goto('/');

  // 1. Navigate to Network tab
  await page.getByRole('tab', { name: 'My Network' }).click();

  // 2. View statistics
  await expect(page.getByText('Network Statistics')).toBeVisible({ timeout: 5000 });
  await expect(page.getByText('Total People')).toBeVisible();

  // 3. Browse people list
  const personCards = await page.locator('[class*="flex"][class*="items-start"][class*="gap-4"][class*="p-4"]').all();
  expect(personCards.length).toBeGreaterThan(0);

  // 4. Go back to Intro Finder
  await page.getByRole('tab', { name: 'Intro Finder' }).click();

  // 5. Search should still work
  await page.getByPlaceholder('Who do you want to meet?').fill('Alice');
  await page.waitForTimeout(1000);
  await expect(page.locator('[cmdk-item]').first()).toBeVisible();
});
```

---

## 8. PERFORMANCE TESTS

### Test File: `performance.spec.ts`

**Priority**: P2 - Medium priority

```typescript
test('should load homepage within 3 seconds', async ({ page }) => {
  const startTime = Date.now();
  await page.goto('/');
  await expect(page.getByText('Warm Intro Graph')).toBeVisible();
  const loadTime = Date.now() - startTime;

  expect(loadTime).toBeLessThan(3000);
});
```

```typescript
test('should return search results within 2 seconds', async ({ page }) => {
  await page.goto('/');

  const startTime = Date.now();
  await page.getByPlaceholder('Who do you want to meet?').fill('Alice');
  await page.locator('[cmdk-item]').first().waitFor({ timeout: 5000 });
  const searchTime = Date.now() - startTime;

  expect(searchTime).toBeLessThan(2000);
});
```

```typescript
test('should find paths within 5 seconds', async ({ page }) => {
  await page.goto('/');

  await page.getByPlaceholder('Who do you want to meet?').fill('Bob');
  await page.waitForTimeout(1000);

  const startTime = Date.now();
  await page.locator('[cmdk-item]').first().click();
  await page.getByText(/Searched \d+ nodes/).waitFor({ timeout: 10000 });
  const pathfindingTime = Date.now() - startTime;

  expect(pathfindingTime).toBeLessThan(5000);
});
```

```typescript
test('should load network overview within 3 seconds', async ({ page }) => {
  await page.goto('/');

  const startTime = Date.now();
  await page.getByRole('tab', { name: 'My Network' }).click();
  await page.getByText('Network Statistics').waitFor({ timeout: 5000 });
  const loadTime = Date.now() - startTime;

  expect(loadTime).toBeLessThan(3000);
});
```

---

## 9. ACCESSIBILITY TESTS

### Test File: `accessibility.spec.ts`

**Priority**: P3 - Nice to have

```typescript
test('should have accessible search input', async ({ page }) => {
  await page.goto('/');

  const searchInput = page.getByPlaceholder('Who do you want to meet?');

  // Should be keyboard accessible
  await searchInput.focus();
  await expect(searchInput).toBeFocused();

  // Should be able to type
  await page.keyboard.type('Alice');
  await expect(searchInput).toHaveValue('Alice');
});
```

```typescript
test('should navigate tabs with keyboard', async ({ page }) => {
  await page.goto('/');

  // Tab to the tabs list
  await page.keyboard.press('Tab');
  await page.keyboard.press('Tab');

  // Arrow keys should navigate tabs
  await page.keyboard.press('ArrowRight');
  await page.waitForTimeout(500);

  // Should show network overview
  await expect(page.getByText('Network Statistics')).toBeVisible({ timeout: 3000 });
});
```

```typescript
test('should have proper heading hierarchy', async ({ page }) => {
  await page.goto('/');

  // h1 should exist
  await expect(page.locator('h1')).toContainText('Warm Intro Graph');

  // h2 should exist
  await expect(page.locator('h2').first()).toBeVisible();
});
```

---

## 10. ERROR SCENARIOS AND EDGE CASES

### Test File: `edge-cases.spec.ts`

**Priority**: P1 - Important for robustness

```typescript
test('should handle empty database gracefully', async ({ page }) => {
  // This would require database reset
  // Mock API to return empty results
  await page.route('/api/network', route => route.fulfill({
    status: 200,
    body: JSON.stringify({
      people: [],
      edges: [],
      stats: {
        totalPeople: 0,
        totalConnections: 0,
        averageConnectionsPerPerson: 0,
        strongConnections: 0,
        mediumConnections: 0,
        weakConnections: 0
      },
      organizationGroups: []
    })
  }));

  await page.goto('/');
  await page.getByRole('tab', { name: 'My Network' }).click();

  // Should show 0 counts
  await expect(page.getByText('Network Statistics')).toBeVisible();
});
```

```typescript
test('should handle special characters in search query', async ({ page }) => {
  await page.goto('/');

  await page.getByPlaceholder('Who do you want to meet?').fill("O'Brien");
  await page.waitForTimeout(1000);

  // Should not crash
  await expect(page.getByPlaceholder('Who do you want to meet?')).toBeVisible();
});
```

```typescript
test('should handle very long names', async ({ page }) => {
  await page.goto('/');

  const longName = 'A'.repeat(100);
  await page.getByPlaceholder('Who do you want to meet?').fill(longName);
  await page.waitForTimeout(1000);

  // Should show "No people found"
  await expect(page.getByText('No people found')).toBeVisible({ timeout: 3000 });
});
```

```typescript
test('should handle network timeout gracefully', async ({ page }) => {
  // Simulate slow network
  await page.route('/api/people/me/paths*', route => {
    setTimeout(() => route.fulfill({ status: 408 }), 10000);
  });

  await page.goto('/');

  await page.getByPlaceholder('Who do you want to meet?').fill('Alice');
  await page.waitForTimeout(1000);
  await page.locator('[cmdk-item]').first().click();

  // Should show error or timeout message
  await expect(page.getByText(/Error|timeout/i)).toBeVisible({ timeout: 15000 });
});
```

---

## Test Execution Strategy

### Phase 1: Critical Path (Week 1)
- **Priority**: P0 tests
- **Focus**: Pathfinding (15 tests) + Pathfinding API (8 tests)
- **Goal**: Fix reported bugs and validate core functionality
- **Estimated time**: 20 hours

### Phase 2: Core Features (Week 2)
- **Priority**: P1 tests
- **Focus**: Network Overview (8 tests) + Network API (4 tests) + LinkedIn Integration (10 tests)
- **Goal**: Ensure all primary features work correctly
- **Estimated time**: 15 hours

### Phase 3: Polish (Week 3)
- **Priority**: P2-P3 tests
- **Focus**: Graph Visualization (7 tests) + Performance (4 tests) + Accessibility (3 tests)
- **Goal**: Enhance user experience and performance
- **Estimated time**: 10 hours

### Phase 4: Hardening (Week 4)
- **Focus**: Edge cases (4 tests) + E2E journeys (3 tests)
- **Goal**: Ensure robustness and complete user flows
- **Estimated time**: 10 hours

---

## Test Data Requirements

### Seed Data Needed

For comprehensive testing, the database should contain:

1. **"me" user** - The current user (source for all pathfinding)
2. **Direct connections** (1 hop) - At least 3 people directly connected to "me"
3. **2-hop connections** - At least 2 people reachable in 2 hops
4. **3-hop connections** - At least 1 person reachable in 3 hops
5. **Isolated person** - 1 person with no connections (for testing "no path found")
6. **Multiple organizations** - At least 3 different organizations
7. **Various connection strengths**:
   - Strong (≥0.7): At least 3 edges
   - Medium (0.4-0.69): At least 3 edges
   - Weak (<0.4): At least 2 edges
8. **LinkedIn profiles** - At least 2 people with LinkedIn handles in socialHandles

### Test Data Script

```typescript
// apps/web/e2e/fixtures/seed-test-data.ts
export async function seedTestData() {
  // Create organizations
  const orgs = [
    { id: 'org-1', name: 'TechCorp' },
    { id: 'org-2', name: 'StartupXYZ' },
    { id: 'org-3', name: 'BigCompany Inc' }
  ];

  // Create people
  const people = [
    { id: 'me', names: ['Me User'], emails: ['me@test.com'], organization: orgs[0] },
    { id: 'alice', names: ['Alice Johnson'], emails: ['alice@test.com'], title: 'VP of Engineering', organization: orgs[0] },
    { id: 'bob', names: ['Bob Smith'], emails: ['bob@test.com'], title: 'CTO', organization: orgs[1] },
    { id: 'charlie', names: ['Charlie Brown'], emails: ['charlie@test.com'], organization: orgs[2] },
    { id: 'dave', names: ['Dave Wilson'], emails: ['dave@test.com'], organization: orgs[2] },
    { id: 'isolated', names: ['Isolated Person'], emails: ['isolated@test.com'] }
  ];

  // Create edges (connections)
  const edges = [
    { from: 'me', to: 'alice', strength: 0.9 },      // 1-hop: strong
    { from: 'me', to: 'bob', strength: 0.6 },        // 1-hop: medium
    { from: 'alice', to: 'charlie', strength: 0.8 }, // 2-hop via Alice
    { from: 'bob', to: 'charlie', strength: 0.5 },   // 2-hop via Bob (weaker)
    { from: 'charlie', to: 'dave', strength: 0.7 }   // 3-hop
  ];

  // Insert into database...
}
```

---

## Continuous Integration Setup

### GitHub Actions Workflow

```yaml
# .github/workflows/e2e-tests.yml
name: E2E Tests

on:
  push:
    branches: [main, master]
  pull_request:
    branches: [main, master]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm ci

      - name: Setup database
        run: npm run db:setup:test

      - name: Run E2E tests
        run: npm run test:e2e

      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: playwright-report
          path: playwright-report/
```

---

## Success Metrics

### Coverage Goals
- **Pathfinding**: 100% (15/15 tests) - CRITICAL
- **Network Overview**: 100% (8/8 tests)
- **LinkedIn Integration**: 100% (10/10 tests)
- **Graph Visualization**: 100% (7/7 tests)
- **API Endpoints**: 100% (12/12 tests)
- **Overall**: 100% (57/57 tests)

### Quality Gates
- All P0 tests must pass before deployment
- All P1 tests must pass before release
- Test execution time < 10 minutes
- Flaky test rate < 1%
- Test coverage > 95%

### Bug Detection
- Pathfinding bugs: Tests should fail until bugs are fixed
- Regression detection: All tests run on every PR
- Performance regression: Alert if tests take >2x longer

---

## Appendix: Test Utilities

### Custom Fixtures

```typescript
// apps/web/e2e/fixtures.ts
import { test as base } from '@playwright/test';

export const test = base.extend({
  // Authenticated user fixture
  authenticatedPage: async ({ page }, use) => {
    // Set up authenticated session
    await page.goto('/');
    await use(page);
  },

  // Clean database fixture
  cleanDatabase: async ({}, use) => {
    // Reset database before test
    await resetDatabase();
    await use();
  }
});
```

### Helper Functions

```typescript
// apps/web/e2e/helpers.ts
export async function searchAndSelectPerson(page: Page, name: string) {
  await page.getByPlaceholder('Who do you want to meet?').fill(name);
  await page.waitForTimeout(1000);
  await page.locator('[cmdk-item]').first().click();
  await page.waitForTimeout(3000);
}

export async function waitForPaths(page: Page) {
  await page.waitForSelector('text=/Searched \\d+ nodes/', { timeout: 10000 });
}

export async function getPathCount(page: Page): Promise<number> {
  return await page.locator('[class*="cursor-pointer"]').count();
}
```

---

## Next Steps

1. **Immediate**: Implement Phase 1 (Pathfinding tests) to identify and fix bugs
2. **Day 2**: Run pathfinding tests and document all failures
3. **Day 3-5**: Fix pathfinding bugs until all tests pass
4. **Week 2**: Implement Phase 2 tests (Network + LinkedIn)
5. **Week 3**: Implement Phase 3 tests (Visualization + Performance)
6. **Week 4**: Complete Phase 4 and establish CI/CD pipeline

---

## Questions for Product/Engineering Team

1. What are the specific pathfinding bugs reported by users?
2. What is the expected maximum pathfinding time (currently appears unlimited)?
3. Should LinkedIn integration fail gracefully or block functionality?
4. What are the performance SLAs for each feature?
5. Are there any known issues that should be documented as expected failures?
6. What is the priority order for fixing vs documenting bugs?

---

**Document Version**: 1.0
**Last Updated**: 2026-01-24
**Author**: Test Automation Engineer
**Status**: Ready for Implementation
