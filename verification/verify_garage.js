const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    console.log('Navigating to home...');
    await page.goto('http://localhost:3000');

    // 1. Open Garage
    console.log('Opening Garage...');
    await page.click('text=Garage');

    // Wait for Garage rendering
    await page.waitForSelector('#garage-screen:not(.hidden)');
    await page.waitForSelector('.vehicle-card');

    console.log('Garage opened. Checking accessibility...');

    // 2. Check Roles and TabIndex
    const cards = await page.$$('.vehicle-card');
    if (cards.length === 0) throw new Error('No vehicle cards found');

    for (let i = 0; i < cards.length; i++) {
        const tagName = await cards[i].evaluate(el => el.tagName.toLowerCase());
        const role = await cards[i].getAttribute('role');
        const tabIndex = await cards[i].getAttribute('tabindex');
        const label = await cards[i].getAttribute('aria-label');

        if (tagName !== 'button' && role !== 'button') console.error(`Card ${i} missing role="button" or not a <button>`);
        // Buttons don't strictly need tabindex="0", but we'll check it if it's not a button
        if (tagName !== 'button' && tabIndex !== '0') console.error(`Card ${i} missing tabindex="0"`);
        if (!label) console.error(`Card ${i} missing aria-label`);
    }
    console.log('Roles/Attributes checked.');

    // 3. Test Keyboard Navigation
    console.log('Testing keyboard navigation...');

    // Focus first card
    await cards[0].focus();

    // Check focus style (visual verification via screenshot later, but let's check class if any)
    // We expect outline in CSS, hard to check via JS but we can check active element
    const isFocused = await page.evaluate(() => document.activeElement.classList.contains('vehicle-card'));
    if (!isFocused) console.error('Focus failed');
    else console.log('Focus successful');

    // Press Enter to select
    console.log('Pressing Enter on first card...');
    await page.keyboard.press('Enter');

    // Check if selected
    // Note: The click/enter handler triggers renderGarage() which rebuilds or updates
    // Our new logic updates in place, preserving element identity if children exist.
    // Let's verify aria-pressed="true" on first card

    // Re-fetch elements just in case, though our goal was to not need to
    const card0 = (await page.$$('.vehicle-card'))[0];
    const ariaPressed = await card0.getAttribute('aria-pressed');
    const classList = await card0.getAttribute('class');

    if (ariaPressed !== 'true') console.error('Selection failed: aria-pressed not true');
    if (!classList.includes('selected')) console.error('Selection failed: class not selected');

    console.log(`Card 0 status: selected=${classList.includes('selected')}, aria-pressed=${ariaPressed}`);

    // Try selecting second card via keyboard
    console.log('Tab to next card and Select...');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Space'); // Test Space key as well

    const card1 = (await page.$$('.vehicle-card'))[1];
    const ariaPressed1 = await card1.getAttribute('aria-pressed');
    console.log(`Card 1 status: aria-pressed=${ariaPressed1}`);

    if (ariaPressed1 !== 'true') console.error('Space key selection failed');

    // Screenshot
    await page.screenshot({ path: 'verification/garage_access.png' });
    console.log('Screenshot saved to verification/garage_access.png');

  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  } finally {
    await browser.close();
  }
})();
