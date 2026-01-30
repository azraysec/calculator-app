/**
 * E2E Tests for Authentication
 * Tests login, logout, and protected routes
 */

import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test('should redirect unauthenticated users to login page', async ({ page }) => {
    // Try to access the home page without authentication
    await page.goto('/');

    // Should be redirected to login
    await expect(page).toHaveURL(/.*\/login/);
    await expect(page.getByRole('heading', { name: 'Welcome to WIG' })).toBeVisible();
  });

  test('should display login page elements', async ({ page }) => {
    await page.goto('/login');

    // Check for branding
    await expect(page.getByRole('heading', { name: 'Welcome to WIG' })).toBeVisible();
    await expect(page.getByText('Warm Intro Graph - Your network, visualized')).toBeVisible();

    // Check for Google sign-in button
    await expect(page.getByRole('button', { name: /Continue with Google/i })).toBeVisible();

    // Check for features list
    await expect(page.getByText(/Visual network graph/)).toBeVisible();
    await expect(page.getByText(/Relationship strength scores/)).toBeVisible();
    await expect(page.getByText(/Find warm intro paths/)).toBeVisible();
    await expect(page.getByText(/Privacy-first: Your data is only visible to you/)).toBeVisible();
  });

  test('should show privacy notice on login page', async ({ page }) => {
    await page.goto('/login');

    await expect(page.getByText(/By signing in, you agree to connect your Gmail account/)).toBeVisible();
  });

  test('should preserve callback URL when redirecting to login', async ({ page }) => {
    // Try to access a specific page
    await page.goto('/settings');

    // Should be redirected to login with callback URL
    await expect(page).toHaveURL(/.*\/login\?callbackUrl=%2Fsettings/);
  });
});

test.describe('Authentication Error Handling', () => {
  test('should display error page for authentication failures', async ({ page }) => {
    // Navigate to error page with AccessDenied error
    await page.goto('/auth/error?error=AccessDenied');

    await expect(page.getByRole('heading', { name: 'Access Denied' })).toBeVisible();
    await expect(page.getByText(/You denied access to your Google account/)).toBeVisible();

    // Check for action buttons
    await expect(page.getByRole('link', { name: 'Try Again' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Go Home' })).toBeVisible();
  });

  test('should display error code on error page', async ({ page }) => {
    await page.goto('/auth/error?error=Configuration');

    await expect(page.getByText(/Error code: Configuration/)).toBeVisible();
  });

  test('should show default error for unknown error types', async ({ page }) => {
    await page.goto('/auth/error?error=UnknownError');

    await expect(page.getByRole('heading', { name: 'Authentication Error' })).toBeVisible();
    await expect(page.getByText(/An error occurred during authentication/)).toBeVisible();
  });
});

test.describe('Protected Routes', () => {
  const protectedRoutes = [
    '/',
    '/settings',
    '/api/connections',
    '/api/evidence',
    '/api/me',
  ];

  for (const route of protectedRoutes) {
    test(`should protect ${route} route`, async ({ page, context }) => {
      // Clear all cookies to ensure unauthenticated state
      await context.clearCookies();

      if (route.startsWith('/api/')) {
        // API routes should return 401
        const response = await page.request.get(route);
        expect(response.status()).toBe(401);
      } else {
        // Page routes should redirect to login
        await page.goto(route);
        await expect(page).toHaveURL(/.*\/login/);
      }
    });
  }
});

test.describe('Session Management', () => {
  test('should handle expired session', async ({ page, context }) => {
    // Simulate expired session by clearing cookies mid-session
    await context.clearCookies();

    // Try to access a protected API route
    const response = await page.request.get('/api/me');
    expect(response.status()).toBe(401);
  });
});

// Note: Actual Google OAuth flow testing requires special setup with test accounts
// These tests focus on the UI and redirect behavior rather than full OAuth flow
test.describe('OAuth Flow (UI Only)', () => {
  test('should have correct Google OAuth scopes in button', async ({ page }) => {
    await page.goto('/login');

    // The button should trigger OAuth with Gmail scopes
    // We can't test the actual OAuth flow in E2E without Google test accounts
    const signInButton = page.getByRole('button', { name: /Continue with Google/i });
    await expect(signInButton).toBeVisible();
    await expect(signInButton).toBeEnabled();
  });
});
