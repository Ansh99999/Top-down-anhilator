const { test, expect } = require('@playwright/test');
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // 1. Navigate to Home
    console.log('Navigating to home...');
    await page.goto('http://localhost:3000');

    // Screenshot Home
    await page.screenshot({ path: 'verification/1_home.png' });
    console.log('Home screenshot taken.');

    // 2. Click Start Game (Host)
    console.log('Clicking Start Game...');
    await page.click('text=Start Game');

    // Wait for Lobby
    await page.waitForSelector('#lobby-screen:not(.hidden)');
    await page.screenshot({ path: 'verification/2_lobby.png' });
    console.log('Lobby screenshot taken.');

    // 3. Select Map and Vehicle
    await page.selectOption('#map-select', '0'); // Jungle
    await page.selectOption('#ally-count', '1'); // 1 Wingman

    // 4. Click Deploy
    console.log('Clicking Deploy...');
    await page.click('#lobby-action-btn');

    // Wait for Game UI
    await page.waitForSelector('#game-ui[style*="block"]', { timeout: 10000 });

    // Wait for canvas to render something (hard to check canvas content, but we check if UI is visible)
    await page.waitForTimeout(2000); // Wait for connection/render

    await page.screenshot({ path: 'verification/3_game.png' });
    console.log('Game screenshot taken.');

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await browser.close();
  }
})();
