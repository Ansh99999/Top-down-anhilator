const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // 1. Navigate to Home
    console.log('Navigating to home...');
    await page.goto('http://localhost:3000');

    // 2. Click Start Game (Host)
    console.log('Clicking Start Game...');
    await page.click('text=Start Game');

    // Wait for Lobby
    await page.waitForSelector('#lobby-screen:not(.hidden)');

    // 3. Click Deploy
    console.log('Clicking Deploy...');
    await page.click('#lobby-action-btn');

    // Wait for Game UI
    await page.waitForSelector('#game-ui[style*="block"]', { timeout: 10000 });

    // Wait for UI to stabilize
    await page.waitForTimeout(1000);

    // Take screenshot of the HUD area where buttons are
    await page.screenshot({ path: 'verification/semantic_buttons.png' });
    console.log('Screenshot taken: verification/semantic_buttons.png');

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await browser.close();
  }
})();
