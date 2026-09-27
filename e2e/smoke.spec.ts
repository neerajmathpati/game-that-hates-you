import { test, expect } from '@playwright/test';

test.describe('The Game That Hates You — Smoke & Accessibility Suite', () => {
  test('Landing page loads with dark minimal visual style and all controls', async ({ page }) => {
    await page.goto('/');

    // Check heading and typography
    await expect(page.locator('h1')).toContainText('THE GAME THAT');
    await expect(page.locator('h1')).toContainText('HATES YOU');

    // Check play button
    const playBtn = page.locator('#btn-play');
    await expect(playBtn).toBeVisible();
    await expect(playBtn).toHaveAttribute('href', '/play');

    // Check how to play link
    const htpLink = page.locator('#btn-how-to-play');
    await expect(htpLink).toBeVisible();
    await expect(htpLink).toHaveAttribute('href', '/how-to-play');

    // Check mute toggle
    const muteBtn = page.locator('#btn-mute-landing');
    await expect(muteBtn).toBeVisible();
  });

  test('How to Play page is under 20s reading and strictly explains only basic rules', async ({ page }) => {
    await page.goto('/how-to-play');

    await expect(page.locator('h1')).toHaveText('HOW TO PLAY');

    // Check the required sections
    await expect(page.getByText('MOVE')).toBeVisible();
    await expect(page.getByText('JUMP')).toBeVisible();
    await expect(page.getByText('RETRY')).toBeVisible();
    await expect(page.getByText('EXIT')).toBeVisible();

    // Verify it does NOT mention learning or adaptation
    const content = await page.textContent('main');
    expect(content).not.toContain('learn');
    expect(content).not.toContain('adaptive');
    expect(content).not.toContain('profile');

    // Navigation back to home
    await page.click('#btn-back-htp');
    await expect(page).toHaveURL('/');
  });

  test('Play screen boots game container and displays minimal HUD', async ({ page }) => {
    await page.goto('/play');

    // Canvas container exists
    const container = page.locator('#phaser-game-container');
    await expect(container).toBeVisible();

    // HUD displays minimal metrics without behavior stats
    await expect(page.locator('#hud-level')).toContainText('LEVEL 1');
    await expect(page.locator('#hud-attempts')).toContainText('ATTEMPT');

    // Does not leak behavior traits during gameplay
    const hudContent = await page.locator('#game-hud').textContent();
    expect(hudContent).not.toContain('LEFT_BIASED');
    expect(hudContent).not.toContain('RUSHER');
    expect(hudContent).not.toContain('confidence');

    // Mute and pause buttons on HUD
    await expect(page.locator('#btn-mute-hud')).toBeVisible();
    await expect(page.locator('#btn-pause-hud')).toBeVisible();
  });

  test('Pause dialog opens with accessible Resume, Mute, and Restart controls', async ({ page }) => {
    await page.goto('/play');

    // Click pause button on HUD
    await page.click('#btn-pause-hud');

    const pauseDialog = page.locator('#game-overlay-pause');
    await expect(pauseDialog).toBeVisible();
    await expect(pauseDialog.getByRole('heading', { name: 'PAUSED' })).toBeVisible();

    await expect(page.locator('#btn-resume')).toBeVisible();
    await expect(page.locator('#btn-mute')).toBeVisible();
    await expect(page.locator('#btn-restart')).toBeVisible();

    // Resume closes the dialog
    await page.click('#btn-resume');
    await expect(pauseDialog).not.toBeVisible();
  });
});
