import { Page, Locator, expect } from '@playwright/test';

/**
 * Page Object Model for AgentChat component
 */
export class AgentChatPage {
  readonly page: Page;
  readonly input: Locator;
  readonly sendButton: Locator;
  readonly hintsSection: Locator;
  readonly expertiseLevelSelect: Locator;
  readonly messagesContainer: Locator;
  readonly loadingIndicator: Locator;
  readonly errorMessage: Locator;

  constructor(page: Page) {
    this.page = page;
    this.input = page.locator('input[type="text"]').first();
    this.sendButton = page.locator('button[type="submit"]');
    this.hintsSection = page.locator('.bg-gray-50').filter({ hasText: 'Suggestions' });
    this.expertiseLevelSelect = page.locator('select');
    this.messagesContainer = page.locator('.overflow-y-auto').first();
    this.loadingIndicator = page.locator('.animate-pulse').filter({ hasText: 'Running' });
    this.errorMessage = page.locator('.bg-red-100');
  }

  // Navigation
  async goto(agentType: string) {
    await this.page.goto(`/agents/${agentType}`);
    await this.page.waitForLoadState('networkidle');
  }

  // Send a message
  async sendMessage(text: string) {
    await this.input.fill(text);
    await this.sendButton.click();
  }

  // Click a hint
  async clickHint(hintText: string) {
    const hint = this.page.locator('button').filter({ hasText: hintText });
    await hint.click();
  }

  // Set expertise level
  async setExpertiseLevel(level: 'beginner' | 'intermediate' | 'expert') {
    await this.expertiseLevelSelect.selectOption(level);
  }

  // Get all hints
  async getHints(): Promise<string[]> {
    const hints = await this.page.locator('button.group').allTextContents();
    return hints.filter(h => h.length > 0);
  }

  // Wait for response
  async waitForResponse() {
    // Wait for loading to appear and disappear
    await this.loadingIndicator.waitFor({ state: 'visible', timeout: 2000 }).catch(() => {});
    await this.loadingIndicator.waitFor({ state: 'hidden', timeout: 15000 });
  }

  // Get last message
  async getLastMessage(): Promise<string | null> {
    const messages = this.page.locator('.p-4.rounded-2xl');
    const count = await messages.count();
    if (count === 0) return null;
    return await messages.nth(count - 1).textContent();
  }

  // Check if tool output is visible
  async isToolOutputVisible(toolType: string): Promise<boolean> {
    const toolSelectors: Record<string, string> = {
      swot: '.swot-grid',
      porters: '.porters-forces',
      canvas: '.business-canvas',
      persona: '.persona-card',
      journey: '.buyer-journey',
      content: '.content-ideas',
      report: '.analysis-report',
      optimization: '.optimization-list',
      forecast: '.forecast-chart'
    };

    const selector = toolSelectors[toolType] || `.tool-output`;
    return await this.page.locator(selector).isVisible();
  }

  // Get greeting message
  async getGreeting(): Promise<string | null> {
    const greeting = this.page.locator('.p-4.rounded-2xl').first();
    return await greeting.textContent();
  }

  // Check if hints are visible
  async areHintsVisible(): Promise<boolean> {
    return await this.hintsSection.isVisible();
  }

  // Hide hints
  async hideHints() {
    const closeButton = this.page.locator('button').filter({ hasText: '×' });
    if (await closeButton.isVisible()) {
      await closeButton.click();
    }
  }

  // Check if error is displayed
  async hasError(): Promise<boolean> {
    return await this.errorMessage.isVisible();
  }

  // Get error text
  async getErrorText(): Promise<string | null> {
    if (await this.hasError()) {
      return await this.errorMessage.textContent();
    }
    return null;
  }

  // Count messages
  async getMessageCount(): Promise<number> {
    return await this.page.locator('.p-4.rounded-2xl').count();
  }

  // Check if input is populated with hint
  async isInputPopulatedWith(text: string): Promise<boolean> {
    const value = await this.input.inputValue();
    return value === text;
  }

  // Clear conversation (if there's a clear button)
  async clearConversation() {
    const clearButton = this.page.locator('button').filter({ hasText: 'Clear' });
    if (await clearButton.isVisible()) {
      await clearButton.click();
    }
  }

  // Check if copy button is visible on tool output
  async hasCopyButton(): Promise<boolean> {
    return await this.page.locator('button[aria-label="Copy options"]').isVisible();
  }

  // Copy tool output
  async copyOutput(format: 'text' | 'markdown' | 'json' = 'text') {
    await this.page.click('button[aria-label="Copy options"]');
    
    const formatMap = {
      text: 'Copy as Text',
      markdown: 'Copy as Markdown',
      json: 'Copy as JSON'
    };
    
    await this.page.click(`text=${formatMap[format]}`);
  }

  // Check if copy was successful
  async isCopySuccessful(): Promise<boolean> {
    // Check for checkmark icon
    return await this.page.locator('.text-green-500').isVisible();
  }

  // Get agent icon element
  async getAgentIcon() {
    return this.page.locator('.w-5.h-5').first();
  }

  // Check loading state
  async isLoading(): Promise<boolean> {
    return await this.loadingIndicator.isVisible();
  }

  // Get loading message
  async getLoadingMessage(): Promise<string | null> {
    if (await this.isLoading()) {
      return await this.loadingIndicator.textContent();
    }
    return null;
  }

  // Scroll to bottom
  async scrollToBottom() {
    await this.page.evaluate(() => {
      const container = document.querySelector('.overflow-y-auto');
      if (container) {
        container.scrollTop = container.scrollHeight;
      }
    });
  }

  // Check if Expert Mode affects tool display
  async isToolExpanded(toolType: string): Promise<boolean> {
    const tool = await this.getToolElement(toolType);
    if (!tool) return false;
    
    // Check if the expand/collapse button shows collapse icon (ChevronUp)
    const collapseIcon = tool.locator('svg').filter({ hasText: 'ChevronUp' });
    return await collapseIcon.isVisible();
  }

  // Get tool element
  private async getToolElement(toolType: string): Promise<Locator | null> {
    const toolSelectors: Record<string, string> = {
      swot: '[data-agent="strategy"]',
      porters: '[data-agent="strategy"]',
      canvas: '[data-agent="strategy"]',
      persona: '[data-agent="persona"]',
      content: '[data-agent="content"]',
      analytics: '[data-agent="analytics"]'
    };

    const selector = toolSelectors[toolType];
    if (!selector) return null;

    const element = this.page.locator(selector);
    if (await element.count() > 0) {
      return element;
    }
    return null;
  }
}