const { test, expect } = require('@playwright/test');

test('Verify UX improvements', async ({ page }) => {
  // Go to the game
  await page.goto('http://localhost:3000');

  // 1. Verify HUD Buttons are semantic <button> and have ARIA labels
  // Note: HUD is initially hidden, but elements exist in DOM.
  // Playwright might complain if we try to click them if they are hidden,
  // but we can check their attributes.

  const dashBtn = page.locator('#dash-btn');
  const abilityBtn = page.locator('#ability-btn');

  await expect(dashBtn).toHaveAttribute('type', 'button');
  await expect(dashBtn).toHaveAttribute('aria-label', 'Dash');

  // Verify it is actually a button tag
  const dashTagName = await dashBtn.evaluate(el => el.tagName.toLowerCase());
  expect(dashTagName).toBe('button');

  await expect(abilityBtn).toHaveAttribute('type', 'button');
  await expect(abilityBtn).toHaveAttribute('aria-label', 'Activate Ability');

  const abilityTagName = await abilityBtn.evaluate(el => el.tagName.toLowerCase());
  expect(abilityTagName).toBe('button');

  console.log('✅ HUD buttons are semantic and have ARIA labels');

  // 2. Verify Loading State on Deploy
  // Click "Start Game" to go to Lobby (Host)
  await page.click('text=Start Game');

  // Wait for lobby screen
  await expect(page.locator('#lobby-screen')).toBeVisible();

  const deployBtn = page.locator('#lobby-action-btn');
  await expect(deployBtn).toHaveText('DEPLOY');
  await expect(deployBtn).not.toHaveClass(/loading/);

  // Click Deploy and check immediate state change
  // We don't want to actually start the game fully, just check the immediate reaction
  await deployBtn.click();

  await expect(deployBtn).toHaveText('DEPLOYING...');
  await expect(deployBtn).toHaveClass(/loading/);

  console.log('✅ Deploy button shows loading state');
});
