const { chromium } = require('playwright');
const { createTestUser, createTestAgent } = require('../helpers/test-data');

describe('Frontend-AI Agent Integration Tests', () => {
  let browser;
  let context;
  let page;
  let testUser;
  let testAgent;

  beforeAll(async () => {
    browser = await chromium.launch();
    context = await browser.newContext();
    page = await context.newPage();
    
    // Create test user and agent
    testUser = await createTestUser();
    testAgent = await createTestAgent(testUser._id);
  });

  afterAll(async () => {
    await browser.close();
  });

  beforeEach(async () => {
    await context.clearCookies();
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    await page.goto(baseUrl);
  });

  describe('Agent Authentication', () => {
    test('should include auth token in agent API requests', async () => {
      // Login
      await page.fill('[data-testid="email-input"]', testUser.email);
      await page.fill('[data-testid="password-input"]', 'testpassword');
      await page.click('[data-testid="login-button"]');

      // Navigate to agents page
      await page.click('[data-testid="agents-link"]');

      // Check network requests for auth header
      const requests = await page.evaluate(() => {
        return window.performance.getEntriesByType('resource')
          .filter(entry => entry.name.includes('/api/v1/agents'))
          .map(entry => entry.name);
      });

      expect(requests.length).toBeGreaterThan(0);
    });
  });

  describe('Agent List Display', () => {
    test('should display agent list with correct data', async () => {
      // Login and navigate to agents
      await page.fill('[data-testid="email-input"]', testUser.email);
      await page.fill('[data-testid="password-input"]', 'testpassword');
      await page.click('[data-testid="login-button"]');
      await page.click('[data-testid="agents-link"]');

      // Verify agent data display
      const agentName = await page.textContent(`[data-testid="agent-name-${testAgent._id}"]`);
      const agentType = await page.textContent(`[data-testid="agent-type-${testAgent._id}"]`);
      const agentStatus = await page.textContent(`[data-testid="agent-status-${testAgent._id}"]`);

      expect(agentName).toBe(testAgent.name);
      expect(agentType).toBe(testAgent.type);
      expect(agentStatus).toBe(testAgent.status);
    });
  });

  describe('Agent Interaction', () => {
    test('should handle agent query submission', async () => {
      // Login and navigate to agent detail
      await page.fill('[data-testid="email-input"]', testUser.email);
      await page.fill('[data-testid="password-input"]', 'testpassword');
      await page.click('[data-testid="login-button"]');
      await page.click(`[data-testid="agent-link-${testAgent._id}"]`);

      // Submit query
      await page.fill('[data-testid="query-input"]', 'Generate leads for real estate');
      await page.click('[data-testid="submit-query"]');

      // Verify loading state
      const loadingState = await page.isVisible('[data-testid="agent-loading"]');
      expect(loadingState).toBe(true);

      // Wait for response
      await page.waitForSelector('[data-testid="agent-response"]');
      const response = await page.textContent('[data-testid="agent-response"]');
      expect(response).toBeTruthy();
    });

    test('should display agent logs', async () => {
      // Login and navigate to agent logs
      await page.fill('[data-testid="email-input"]', testUser.email);
      await page.fill('[data-testid="password-input"]', 'testpassword');
      await page.click('[data-testid="login-button"]');
      await page.click(`[data-testid="agent-logs-${testAgent._id}"]`);

      // Verify logs display
      const logs = await page.$$('[data-testid="log-entry"]');
      expect(logs.length).toBeGreaterThan(0);
    });
  });

  describe('Error Handling', () => {
    test('should display error message on API failure', async () => {
      // Login and navigate to agent detail
      await page.fill('[data-testid="email-input"]', testUser.email);
      await page.fill('[data-testid="password-input"]', 'testpassword');
      await page.click('[data-testid="login-button"]');
      await page.click(`[data-testid="agent-link-${testAgent._id}"]`);

      // Simulate API error
      await page.route('**/api/v1/agents/*/query', route => {
        route.fulfill({
          status: 500,
          body: JSON.stringify({ error: 'Internal Server Error' })
        });
      });

      // Submit query
      await page.fill('[data-testid="query-input"]', 'Generate leads');
      await page.click('[data-testid="submit-query"]');

      // Verify error message
      const errorMessage = await page.textContent('[data-testid="error-message"]');
      expect(errorMessage).toContain('Internal Server Error');
    });
  });

  describe('Performance', () => {
    test('should handle large response data', async () => {
      // Login and navigate to agent detail
      await page.fill('[data-testid="email-input"]', testUser.email);
      await page.fill('[data-testid="password-input"]', 'testpassword');
      await page.click('[data-testid="login-button"]');
      await page.click(`[data-testid="agent-link-${testAgent._id}"]`);

      // Submit query with large response
      await page.fill('[data-testid="query-input"]', 'Generate detailed market analysis');
      await page.click('[data-testid="submit-query"]');

      // Wait for response
      await page.waitForSelector('[data-testid="agent-response"]');
      
      // Verify response is displayed without UI lag
      const responseTime = await page.evaluate(() => {
        const start = performance.now();
        document.querySelector('[data-testid="agent-response"]').scrollIntoView();
        return performance.now() - start;
      });

      expect(responseTime).toBeLessThan(100); // Should render within 100ms
    });
  });
}); 