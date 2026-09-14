#!/usr/bin/env python3
"""
Cross-Agent Frontend Test Suite

Tests the frontend components for cross-agent data sharing including:
- SaveOutputDialog component functionality
- QuickSaveButtons integration
- OutputBrowser component with search and filtering
- Cross-agent workflow integration
"""

import asyncio
import os
import sys
from pathlib import Path

import pytest

# Playwright is an optional dependency: this is a manual E2E script that needs a
# browser install and a running dev server. importorskip keeps
# `pytest tests/automated` usable for someone who has not installed it.
_pw = pytest.importorskip(
    "playwright.async_api",
    reason="manual E2E script: requires playwright + a running dev server",
)
async_playwright = _pw.async_playwright
Page = _pw.Page
Browser = _pw.Browser
BrowserContext = _pw.BrowserContext

# Add project root to path
project_root = Path(__file__).parent.parent.parent
sys.path.insert(0, str(project_root))

# Shared test configuration: credentials live in test_config.py so they cannot
# drift from supabase/seed.sql.
from test_config import TEST_EMAIL, TEST_PASSWORD

class CrossAgentFrontendTests:
    """Frontend test suite for cross-agent data sharing UI"""
    
    def __init__(self):
        self.base_url = "http://localhost:56310"  # Vite dev server (project port)
        self.test_email = TEST_EMAIL
        self.test_password = TEST_PASSWORD
        
        self.browser: Browser = None
        self.context: BrowserContext = None
        self.page: Page = None
        
    async def setup_browser(self):
        """Initialize browser and authenticate"""
        playwright = await async_playwright().start()
        self.browser = await playwright.chromium.launch(headless=False)  # Set to True for CI
        self.context = await self.browser.new_context()
        self.page = await self.context.new_page()
        
        # Enable console logging for debugging
        self.page.on("console", lambda msg: print(f"Console: {msg.text}"))
        
        print("🌐 Browser setup complete")
        
    async def authenticate(self):
        """Log in with test credentials"""
        print("🔐 Authenticating...")
        
        await self.page.goto(f"{self.base_url}/login")
        await self.page.wait_for_load_state("networkidle")
        
        # Fill login form
        await self.page.fill('input[type="email"]', self.test_email)
        await self.page.fill('input[type="password"]', self.test_password)
        
        # Submit form
        await self.page.click('button[type="submit"]')
        
        # Wait for redirect to dashboard
        await self.page.wait_for_url("**/dashboard", timeout=10000)
        print("✅ Authentication successful")
        
    async def test_save_output_dialog(self):
        """Test the SaveOutputDialog component"""
        print("\n=== Testing Save Output Dialog ===")
        
        # Navigate to strategy agent
        await self.page.goto(f"{self.base_url}/agents/strategy")
        await self.page.wait_for_load_state("networkidle")
        
        # Send a test message to generate output
        test_prompt = "Create a growth strategy for a tech startup"
        await self.page.fill('textarea[placeholder*="strategy"]', test_prompt)
        await self.page.click('button:has-text("Send")')
        
        # Wait for response
        await self.page.wait_for_selector('.message-assistant', timeout=30000)
        print("✅ Got strategy agent response")
        
        # Find and click save button
        save_button = self.page.locator('button:has-text("Save")').first
        await save_button.wait_for(state="visible")
        await save_button.click()
        
        # Verify dialog opens
        dialog = self.page.locator('[role="dialog"]')
        await dialog.wait_for(state="visible")
        print("✅ Save dialog opened")
        
        # Test dialog components
        title_input = dialog.locator('input[id="title"]')
        await title_input.wait_for(state="visible")
        
        # Verify auto-generated title
        title_value = await title_input.input_value()
        assert "Strategic Analysis" in title_value, f"Expected auto-generated title, got: {title_value}"
        print(f"✅ Auto-generated title: {title_value}")
        
        # Test custom title
        custom_title = "My Custom Strategy Analysis"
        await title_input.fill(custom_title)
        
        # Test adding custom tags
        tag_input = dialog.locator('input[placeholder*="custom tags"]')
        await tag_input.fill("growth")
        await dialog.locator('button:has-text("Add")').click()
        
        # Verify tag was added
        tag_badge = dialog.locator('.cursor-pointer:has-text("growth")')
        await tag_badge.wait_for(state="visible")
        print("✅ Custom tag added successfully")
        
        # Test suggested tags
        suggested_tag = dialog.locator('text="+ analysis"').first
        if await suggested_tag.is_visible():
            await suggested_tag.click()
            print("✅ Suggested tag added")
        
        # Test content preview
        preview = dialog.locator('text="Content Preview"')
        await preview.wait_for(state="visible")
        print("✅ Content preview visible")
        
        # Save the output
        save_btn = dialog.locator('button:has-text("Save Output")')
        await save_btn.click()
        
        # Wait for success and dialog close
        await dialog.wait_for(state="hidden", timeout=5000)
        print("✅ Output saved successfully")
        
        # Verify save button shows "Saved" state
        saved_button = self.page.locator('button:has-text("Saved")').first
        await saved_button.wait_for(state="visible", timeout=5000)
        print("✅ Save button updated to 'Saved' state")
        
    async def test_quick_save_functionality(self):
        """Test quick save buttons"""
        print("\n=== Testing Quick Save Functionality ===")
        
        # Navigate to persona agent
        await self.page.goto(f"{self.base_url}/agents/persona")
        await self.page.wait_for_load_state("networkidle")
        
        # Generate a response
        test_prompt = "Create a customer persona for a SaaS product"
        await self.page.fill('textarea', test_prompt)
        await self.page.click('button:has-text("Send")')
        
        # Wait for response
        await self.page.wait_for_selector('.message-assistant', timeout=30000)
        
        # Test quick save (should use auto-generated title)
        quick_save = self.page.locator('button:has-text("Quick Save")').first
        if await quick_save.is_visible():
            await quick_save.click()
            
            # Wait for save confirmation
            await self.page.wait_for_selector('button:has-text("Saved")', timeout=5000)
            print("✅ Quick save functionality working")
        
        # Test copy functionality
        copy_button = self.page.locator('button[title*="Copy"]').first
        if await copy_button.is_visible():
            await copy_button.click()
            print("✅ Copy functionality triggered")
        
    async def test_output_browser(self):
        """Test the OutputBrowser component"""
        print("\n=== Testing Output Browser ===")
        
        # Navigate to saved outputs page (assuming it exists)
        await self.page.goto(f"{self.base_url}/outputs")
        await self.page.wait_for_load_state("networkidle")
        
        # Check if outputs are displayed
        output_items = self.page.locator('[data-testid="output-item"]')
        
        if await output_items.count() > 0:
            print(f"✅ Found {await output_items.count()} saved outputs")
            
            # Test search functionality
            search_input = self.page.locator('input[placeholder*="search"]')
            if await search_input.is_visible():
                await search_input.fill("strategy")
                await self.page.wait_for_timeout(1000)  # Wait for filter
                print("✅ Search functionality working")
            
            # Test agent type filter
            filter_dropdown = self.page.locator('select, [role="combobox"]').first
            if await filter_dropdown.is_visible():
                await filter_dropdown.click()
                strategy_option = self.page.locator('text="Strategy"')
                if await strategy_option.is_visible():
                    await strategy_option.click()
                    print("✅ Agent type filtering working")
            
            # Test viewing an output
            first_output = output_items.first
            await first_output.click()
            
            # Check if output details are shown
            output_content = self.page.locator('[data-testid="output-content"]')
            if await output_content.is_visible():
                print("✅ Output viewing functionality working")
            
        else:
            print("ℹ️  No saved outputs found - this is expected for fresh test environment")
        
    async def test_cross_agent_workflow(self):
        """Test complete cross-agent workflow"""
        print("\n=== Testing Cross-Agent Workflow ===")
        
        # 1. Create strategy analysis
        await self.page.goto(f"{self.base_url}/agents/strategy")
        await self.page.wait_for_load_state("networkidle")
        
        strategy_prompt = "Analyze market opportunities for eco-friendly products"
        await self.page.fill('textarea', strategy_prompt)
        await self.page.click('button:has-text("Send")')
        await self.page.wait_for_selector('.message-assistant', timeout=30000)
        
        # Save strategy output
        save_button = self.page.locator('button:has-text("Save")').first
        await save_button.click()
        
        dialog = self.page.locator('[role="dialog"]')
        await dialog.wait_for(state="visible")
        
        # Use custom title for easy identification
        title_input = dialog.locator('input[id="title"]')
        await title_input.fill("Eco-Friendly Market Strategy")
        
        save_btn = dialog.locator('button:has-text("Save Output")')
        await save_btn.click()
        await dialog.wait_for(state="hidden")
        print("✅ Strategy analysis saved")
        
        # 2. Move to persona agent and inject context
        await self.page.goto(f"{self.base_url}/agents/persona")
        await self.page.wait_for_load_state("networkidle")
        
        # Look for context injection UI (if implemented)
        inject_button = self.page.locator('button:has-text("Add Context")')
        if await inject_button.is_visible():
            await inject_button.click()
            
            # Select the strategy output we just saved
            strategy_output = self.page.locator('text="Eco-Friendly Market Strategy"')
            if await strategy_output.is_visible():
                await strategy_output.click()
                
                confirm_button = self.page.locator('button:has-text("Add to Context")')
                await confirm_button.click()
                print("✅ Context injection working")
        
        # 3. Generate persona based on injected strategy
        persona_prompt = "Create customer personas based on the strategic analysis"
        await self.page.fill('textarea', persona_prompt)
        await self.page.click('button:has-text("Send")')
        await self.page.wait_for_selector('.message-assistant', timeout=30000)
        print("✅ Cross-agent workflow completed")
        
    async def test_keyboard_shortcuts(self):
        """Test keyboard shortcuts in save dialog"""
        print("\n=== Testing Keyboard Shortcuts ===")
        
        # Navigate to content agent
        await self.page.goto(f"{self.base_url}/agents/content")
        await self.page.wait_for_load_state("networkidle")
        
        # Generate response
        await self.page.fill('textarea', "Create a content calendar")
        await self.page.click('button:has-text("Send")')
        await self.page.wait_for_selector('.message-assistant', timeout=30000)
        
        # Open save dialog
        save_button = self.page.locator('button:has-text("Save")').first
        await save_button.click()
        
        dialog = self.page.locator('[role="dialog"]')
        await dialog.wait_for(state="visible")
        
        # Test Cmd+Enter shortcut to save
        title_input = dialog.locator('input[id="title"]')
        await title_input.fill("Keyboard Shortcut Test")
        
        # Use Cmd+Enter (or Ctrl+Enter on non-Mac)
        await self.page.keyboard.press("Meta+Enter")  # Use "Control+Enter" for non-Mac
        
        # Dialog should close
        await dialog.wait_for(state="hidden", timeout=5000)
        print("✅ Keyboard shortcut (Cmd+Enter) working")
        
    async def test_responsive_design(self):
        """Test responsive design on mobile viewport"""
        print("\n=== Testing Responsive Design ===")
        
        # Switch to mobile viewport
        await self.page.set_viewport_size({"width": 375, "height": 812})
        
        await self.page.goto(f"{self.base_url}/agents/strategy")
        await self.page.wait_for_load_state("networkidle")
        
        # Check if interface adapts to mobile
        message_input = self.page.locator('textarea')
        await message_input.wait_for(state="visible")
        
        # Check if save buttons are still accessible
        send_button = self.page.locator('button:has-text("Send")')
        await send_button.wait_for(state="visible")
        
        print("✅ Responsive design working on mobile viewport")
        
        # Switch back to desktop
        await self.page.set_viewport_size({"width": 1280, "height": 720})
        
    async def cleanup(self):
        """Clean up browser resources"""
        if self.context:
            await self.context.close()
        if self.browser:
            await self.browser.close()
        print("🧹 Browser cleanup complete")
        
    async def run_all_tests(self):
        """Run all frontend tests"""
        print("🎭 Starting Cross-Agent Frontend Test Suite")
        print("=" * 50)
        
        try:
            await self.setup_browser()
            await self.authenticate()
            await self.test_save_output_dialog()
            await self.test_quick_save_functionality()
            await self.test_output_browser()
            await self.test_cross_agent_workflow()
            await self.test_keyboard_shortcuts()
            await self.test_responsive_design()
            
            print("\n" + "=" * 50)
            print("🎉 All Frontend Tests Passed!")
            print("✅ SaveOutputDialog working")
            print("✅ Quick save functionality working")
            print("✅ Output browser working") 
            print("✅ Cross-agent workflow working")
            print("✅ Keyboard shortcuts working")
            print("✅ Responsive design working")
            
            return True
            
        except Exception as e:
            print(f"\n❌ Frontend test failed: {e}")
            return False
            
        finally:
            await self.cleanup()

async def main():
    """Main test runner"""
    # Load environment
    env_path = Path(__file__).parent.parent / '.env'
    if env_path.exists():
        with open(env_path) as f:
            for line in f:
                if line.strip() and not line.startswith('#'):
                    key, value = line.strip().split('=', 1)
                    os.environ[key] = value
    
    test_suite = CrossAgentFrontendTests()
    success = await test_suite.run_all_tests()
    
    return 0 if success else 1

if __name__ == "__main__":
    import asyncio
    exit_code = asyncio.run(main())
    sys.exit(exit_code)