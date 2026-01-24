const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    console.log('Navigating to home...');
    await page.goto('http://localhost:3000');

    // 1. Enter Game (similar to test_flow.js)
    console.log('Starting Game...');
    await page.click('text=Start Game');
    await page.waitForSelector('#lobby-screen:not(.hidden)');
    await page.click('#lobby-action-btn'); // Deploy

    // Wait for Game UI
    await page.waitForSelector('#game-ui[style*="block"]', { timeout: 10000 });
    console.log('Game UI loaded.');

    // 2. Verify HUD Buttons
    console.log('Verifying HUD Buttons...');

    // Dash Button
    const dashBtn = await page.waitForSelector('#dash-btn');
    const dashTagName = await dashBtn.evaluate(el => el.tagName.toLowerCase());
    const dashType = await dashBtn.getAttribute('type');
    const dashLabel = await dashBtn.getAttribute('aria-label');

    console.log(`Dash Button: <${dashTagName} type="${dashType}" aria-label="${dashLabel}">`);

    if (dashTagName !== 'button') throw new Error('#dash-btn is not a <button>');
    if (dashType !== 'button') throw new Error('#dash-btn missing type="button"');
    if (!dashLabel) throw new Error('#dash-btn missing aria-label');

    // Ability Button
    const abilityBtn = await page.waitForSelector('#ability-btn');
    const abilityTagName = await abilityBtn.evaluate(el => el.tagName.toLowerCase());
    const abilityType = await abilityBtn.getAttribute('type');
    const abilityLabel = await abilityBtn.getAttribute('aria-label');

    console.log(`Ability Button: <${abilityTagName} type="${abilityType}" aria-label="${abilityLabel}">`);

    if (abilityTagName !== 'button') throw new Error('#ability-btn is not a <button>');
    if (abilityType !== 'button') throw new Error('#ability-btn missing type="button"');
    if (!abilityLabel) throw new Error('#ability-btn missing aria-label');

    console.log('✅ Semantic Verification Passed');

    // 3. Screenshot
    await page.screenshot({ path: 'verification/hud_buttons.png' });
    console.log('Screenshot taken: verification/hud_buttons.png');

  } catch (error) {
    console.error('❌ Verification Failed:', error);
    process.exit(1);
  } finally {
    await browser.close();
  }
})();
