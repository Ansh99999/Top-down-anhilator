const { test, expect } = require('@playwright/test');

test('Screenshot UX improvements', async ({ page }) => {
  await page.goto('http://localhost:3000');

  // Go to Lobby
  await page.click('text=Start Game');
  await expect(page.locator('#lobby-screen')).toBeVisible();

  // Click Deploy to trigger loading state
  const deployBtn = page.locator('#lobby-action-btn');
  await deployBtn.click();

  await expect(deployBtn).toHaveText('DEPLOYING...');

  // Take screenshot
  await page.screenshot({ path: 'verification/loading_state.png' });
});
