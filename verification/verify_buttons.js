const { chromium } = require('playwright');

(async () => {
  console.log('Starting verification...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // 1. Navigate to Home
    await page.goto('http://localhost:3000');
    console.log('Navigated to home.');

    // 2. Start Game to see HUD
    // Use generic text selector or class to find the start button
    await page.click('button[onclick="ui.showLobby(true)"]');

    // In Lobby
    await page.waitForSelector('#lobby-screen');
    await page.click('#lobby-action-btn');

    // In Game
    await page.waitForSelector('#game-ui[style*="block"]', { timeout: 10000 });
    console.log('Game UI visible.');

    // 3. Check Buttons
    const dashBtn = await page.$('#dash-btn');
    const abilityBtn = await page.$('#ability-btn');

    if (!dashBtn || !abilityBtn) {
      throw new Error('Buttons not found!');
    }

    const dashTagName = await dashBtn.evaluate(el => el.tagName);
    const abilityTagName = await abilityBtn.evaluate(el => el.tagName);
    const dashType = await dashBtn.getAttribute('type');
    const abilityType = await abilityBtn.getAttribute('type');
    const dashLabel = await dashBtn.getAttribute('aria-label');
    const abilityLabel = await abilityBtn.getAttribute('aria-label');

    console.log(`Dash Button: <${dashTagName}> type=${dashType} label="${dashLabel}"`);
    console.log(`Ability Button: <${abilityTagName}> type=${abilityType} label="${abilityLabel}"`);

    if (dashTagName !== 'BUTTON' || abilityTagName !== 'BUTTON') {
      throw new Error('Elements are not <button> tags!');
    }
    if (dashLabel !== 'Dash' || abilityLabel !== 'Activate Ability') {
      throw new Error('Incorrect ARIA labels!');
    }

    // 4. Check Styles (Computed)
    const dashStyles = await dashBtn.evaluate(el => {
      const s = window.getComputedStyle(el);
      return { appearance: s.appearance || s.webkitAppearance, padding: s.padding, margin: s.margin };
    });
    console.log('Dash Styles:', dashStyles);

    // 5. Screenshot
    await page.screenshot({ path: 'verification/hud_buttons.png' });
    console.log('Screenshot saved to verification/hud_buttons.png');

    console.log('VERIFICATION SUCCESSFUL');

  } catch (error) {
    console.error('VERIFICATION FAILED:', error);
    process.exit(1);
  } finally {
    await browser.close();
  }
})();
