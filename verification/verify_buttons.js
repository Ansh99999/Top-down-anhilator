const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    console.log('Navigating to home...');
    await page.goto('http://localhost:3000');

    // Simulate starting a game to see the HUD
    await page.click('text=Start Game');
    await page.waitForSelector('#lobby-screen:not(.hidden)');
    await page.click('#lobby-action-btn');
    await page.waitForSelector('#game-ui[style*="block"]', { timeout: 10000 });

    // Check buttons
    const dashBtn = await page.$('#dash-btn');
    const abilityBtn = await page.$('#ability-btn');

    if (!dashBtn || !abilityBtn) {
      throw new Error('Buttons not found');
    }

    const dashTagName = await dashBtn.evaluate(el => el.tagName);
    const abilityTagName = await abilityBtn.evaluate(el => el.tagName);

    console.log(`Dash Tag: ${dashTagName}, Ability Tag: ${abilityTagName}`);

    if (dashTagName !== 'BUTTON' || abilityTagName !== 'BUTTON') {
      throw new Error('Elements are not BUTTON tags');
    }

    const dashLabel = await dashBtn.getAttribute('aria-label');
    const abilityLabel = await abilityBtn.getAttribute('aria-label');

    if (!dashLabel || !abilityLabel) {
      throw new Error('Missing aria-label');
    }

    // Take a screenshot of the buttons area
    // Just full screen for context
    await page.screenshot({ path: 'verification/buttons_verified.png' });
    console.log('✅ Verification Passed! Screenshot saved to verification/buttons_verified.png');

  } catch (error) {
    console.error('❌ Verification Failed:', error.message);
    process.exit(1);
  } finally {
    await browser.close();
  }
})();
