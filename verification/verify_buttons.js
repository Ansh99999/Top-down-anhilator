const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    console.log('Navigating to home...');
    await page.goto('http://localhost:3000');

    // Start game to see the HUD
    console.log('Clicking Start Game...');
    await page.click('text=Start Game');

    // Wait for Lobby
    await page.waitForSelector('#lobby-screen:not(.hidden)');

    // Click Deploy
    console.log('Clicking Deploy...');
    await page.click('#lobby-action-btn');

    // Wait for Game UI
    await page.waitForSelector('#game-ui[style*="block"]', { timeout: 10000 });

    console.log('Checking HUD buttons...');

    // Check Dash Button
    const dashBtn = await page.$('#dash-btn');
    const dashTag = await dashBtn.evaluate(el => el.tagName);
    console.log(`Dash Button Tag: ${dashTag}`);

    // Check Ability Button
    const abilityBtn = await page.$('#ability-btn');
    const abilityTag = await abilityBtn.evaluate(el => el.tagName);
    console.log(`Ability Button Tag: ${abilityTag}`);

    if (dashTag === 'BUTTON' && abilityTag === 'BUTTON') {
        console.log('SUCCESS: Buttons are semantic!');
    } else {
        console.log('FAILURE: Buttons are NOT semantic.');
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await browser.close();
  }
})();
