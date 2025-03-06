const { chromium } = require('playwright');
const { createAccessToken } = require('@/core/security');
const { createTestUser, createTestLead } = require('../helpers/test-data');

describe('Frontend and Dashboard Tests', () => {
  let browser;
  let context;
  let page;
  let testUser;
  let testToken;

  beforeAll(async () => {
    browser = await chromium.launch();
    context = await browser.newContext();
    page = await context.newPage();
    testUser = await createTestUser();
    testToken = createAccessToken(testUser);
  });

  afterAll(async () => {
    await browser.close();
  });

  beforeEach(async () => {
    await context.clearCookies();
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    await page.goto(baseUrl);
  });

  describe('Authentication Flow Tests', () => {
    test('should handle login successfully', async () => {
      await page.fill('[data-testid="email-input"]', testUser.email);
      await page.fill('[data-testid="password-input"]', 'testpassword123');
      await page.click('[data-testid="login-button"]');

      await page.waitForSelector('[data-testid="dashboard"]');
      expect(await page.isVisible('[data-testid="dashboard"]')).toBe(true);
    });

    test('should handle login errors', async () => {
      await page.fill('[data-testid="email-input"]', testUser.email);
      await page.fill('[data-testid="password-input"]', 'wrongpassword');
      await page.click('[data-testid="login-button"]');

      await page.waitForSelector('[data-testid="error-message"]');
      expect(await page.textContent('[data-testid="error-message"]')).toContain('Invalid credentials');
    });

    test('should maintain session after page refresh', async () => {
      // Login
      await page.fill('[data-testid="email-input"]', testUser.email);
      await page.fill('[data-testid="password-input"]', 'testpassword123');
      await page.click('[data-testid="login-button"]');

      // Refresh page
      await page.reload();

      // Check if still logged in
      await page.waitForSelector('[data-testid="dashboard"]');
      expect(await page.isVisible('[data-testid="dashboard"]')).toBe(true);
    });
  });

  describe('Dashboard Functionality Tests', () => {
    beforeEach(async () => {
      // Login before each test
      await page.fill('[data-testid="email-input"]', testUser.email);
      await page.fill('[data-testid="password-input"]', 'testpassword123');
      await page.click('[data-testid="login-button"]');
      await page.waitForSelector('[data-testid="dashboard"]');
    });

    test('should display user information', async () => {
      await page.waitForSelector('[data-testid="user-info"]');
      const userInfo = await page.textContent('[data-testid="user-info"]');
      expect(userInfo).toContain(testUser.full_name);
      expect(userInfo).toContain(testUser.email);
    });

    test('should display leads list', async () => {
      await page.waitForSelector('[data-testid="leads-list"]');
      const leadsList = await page.$$('[data-testid="lead-item"]');
      expect(leadsList.length).toBeGreaterThan(0);
    });

    test('should handle lead creation', async () => {
      await page.click('[data-testid="create-lead-button"]');
      await page.waitForSelector('[data-testid="lead-form"]');

      await page.fill('[data-testid="lead-name-input"]', 'New Lead');
      await page.fill('[data-testid="lead-email-input"]', 'newlead@example.com');
      await page.fill('[data-testid="lead-phone-input"]', '1234567890');
      await page.click('[data-testid="submit-lead-button"]');

      await page.waitForSelector('[data-testid="success-message"]');
      expect(await page.textContent('[data-testid="success-message"]')).toContain('Lead created successfully');
    });
  });

  describe('AI Agent Integration Tests', () => {
    beforeEach(async () => {
      // Login before each test
      await page.fill('[data-testid="email-input"]', testUser.email);
      await page.fill('[data-testid="password-input"]', 'testpassword123');
      await page.click('[data-testid="login-button"]');
      await page.waitForSelector('[data-testid="dashboard"]');
    });

    test('should interact with lead generator agent', async () => {
      await page.click('[data-testid="lead-generator-tab"]');
      await page.waitForSelector('[data-testid="agent-input"]');

      await page.fill('[data-testid="agent-input"]', 'Find leads in San Francisco');
      await page.click('[data-testid="submit-agent-button"]');

      await page.waitForSelector('[data-testid="agent-response"]');
      expect(await page.isVisible('[data-testid="agent-response"]')).toBe(true);
    });

    test('should display agent loading state', async () => {
      await page.click('[data-testid="lead-generator-tab"]');
      await page.fill('[data-testid="agent-input"]', 'Find leads');
      await page.click('[data-testid="submit-agent-button"]');

      await page.waitForSelector('[data-testid="agent-loading"]');
      expect(await page.isVisible('[data-testid="agent-loading"]')).toBe(true);
    });
  });

  describe('Error Handling Tests', () => {
    beforeEach(async () => {
      // Login before each test
      await page.fill('[data-testid="email-input"]', testUser.email);
      await page.fill('[data-testid="password-input"]', 'testpassword123');
      await page.click('[data-testid="login-button"]');
      await page.waitForSelector('[data-testid="dashboard"]');
    });

    test('should handle API errors gracefully', async () => {
      // Simulate API error
      await page.route('**/api/leads', route => {
        route.fulfill({
          status: 500,
          body: JSON.stringify({ error: 'Internal server error' })
        });
      });

      await page.click('[data-testid="leads-tab"]');
      await page.waitForSelector('[data-testid="error-message"]');
      expect(await page.textContent('[data-testid="error-message"]')).toContain('Failed to load leads');
    });

    test('should handle network errors', async () => {
      // Simulate network error
      await page.route('**/api/leads', route => {
        route.abort();
      });

      await page.click('[data-testid="leads-tab"]');
      await page.waitForSelector('[data-testid="error-message"]');
      expect(await page.textContent('[data-testid="error-message"]')).toContain('Network error');
    });
  });

  describe('UI Component Tests', () => {
    beforeEach(async () => {
      // Login before each test
      await page.fill('[data-testid="email-input"]', testUser.email);
      await page.fill('[data-testid="password-input"]', 'testpassword123');
      await page.click('[data-testid="login-button"]');
      await page.waitForSelector('[data-testid="dashboard"]');
    });

    test('should handle responsive layout', async () => {
      // Test mobile view
      await page.setViewportSize({ width: 375, height: 667 });
      await page.waitForSelector('[data-testid="mobile-menu"]');
      expect(await page.isVisible('[data-testid="mobile-menu"]')).toBe(true);

      // Test tablet view
      await page.setViewportSize({ width: 768, height: 1024 });
      await page.waitForSelector('[data-testid="sidebar"]');
      expect(await page.isVisible('[data-testid="sidebar"]')).toBe(true);

      // Test desktop view
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.waitForSelector('[data-testid="desktop-layout"]');
      expect(await page.isVisible('[data-testid="desktop-layout"]')).toBe(true);
    });

    test('should handle form validation', async () => {
      await page.click('[data-testid="create-lead-button"]');
      await page.waitForSelector('[data-testid="lead-form"]');

      // Submit empty form
      await page.click('[data-testid="submit-lead-button"]');

      // Check validation messages
      expect(await page.textContent('[data-testid="name-error"]')).toContain('Name is required');
      expect(await page.textContent('[data-testid="email-error"]')).toContain('Email is required');
    });
  });

  describe('Performance Tests', () => {
    beforeEach(async () => {
      // Login before each test
      await page.fill('[data-testid="email-input"]', testUser.email);
      await page.fill('[data-testid="password-input"]', 'testpassword123');
      await page.click('[data-testid="login-button"]');
      await page.waitForSelector('[data-testid="dashboard"]');
    });

    test('should load dashboard quickly', async () => {
      const startTime = Date.now();
      await page.goto(process.env.NEXT_PUBLIC_APP_URL);
      await page.waitForSelector('[data-testid="dashboard"]');
      const loadTime = Date.now() - startTime;

      expect(loadTime).toBeLessThan(2000); // Should load in less than 2 seconds
    });

    test('should handle large datasets efficiently', async () => {
      // Create 100 leads
      await Promise.all(Array(100).fill().map(() => createTestLead(testUser.id)));

      const startTime = Date.now();
      await page.click('[data-testid="leads-tab"]');
      await page.waitForSelector('[data-testid="leads-list"]');
      const loadTime = Date.now() - startTime;

      expect(loadTime).toBeLessThan(1000); // Should load 100 leads in less than 1 second
    });
  });
}); 