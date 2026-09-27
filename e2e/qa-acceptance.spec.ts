import { test, expect } from '@playwright/test';

type WindowGlobals = Record<string, unknown>;

test.describe('Phase 9 QA: End-to-End Acceptance Test Suite', () => {
  test('Performance & Architecture: Phaser is NOT loaded on landing page', async ({ page }) => {
    await page.goto('/');

    // Verify Phaser canvas does not exist on landing
    const canvas = page.locator('canvas');
    await expect(canvas).toHaveCount(0);

    // Verify window.__PHASER_GAME__ is undefined on landing page
    const hasPhaser = await page.evaluate(() => typeof (window as unknown as WindowGlobals).__PHASER_GAME__ !== 'undefined');
    expect(hasPhaser).toBe(false);
  });

  test('QA Criteria 1 & 2: Landing → Play navigation and canvas rendering', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('pageerror', err => consoleErrors.push(err.message));

    await page.goto('/');
    await page.click('#btn-play');
    await expect(page).toHaveURL(/\/play/);

    // Canvas must be visible inside game container
    const container = page.locator('#phaser-game-container');
    await expect(container).toBeVisible();

    const canvas = container.locator('canvas').first();
    await expect(canvas).toBeVisible();

    // Verify game instance initialized on window
    await page.waitForFunction(() => {
      const g = (window as unknown as WindowGlobals).__PHASER_GAME__;
      return g !== null && typeof g !== 'undefined';
    }, { timeout: 15_000 });

    expect(consoleErrors).toHaveLength(0);
  });

  test('QA Criteria 3 & 4: Player movement and jump controls', async ({ page }) => {
    await page.goto('/play');

    // Wait for active scene and player ready
    await page.waitForFunction(() => {
      const s = (window as unknown as WindowGlobals).__ACTIVE_LEVEL_SCENE__ as { player?: { x: number; y: number } } | null;
      return s?.player?.x !== undefined;
    }, { timeout: 15_000 });

    const initialPos = await page.evaluate(() => {
      const s = (window as unknown as WindowGlobals).__ACTIVE_LEVEL_SCENE__ as { player: { x: number; y: number } };
      return { x: s.player.x, y: s.player.y };
    });

    // 3. Movement right
    await page.evaluate(() => {
      const s = (window as unknown as WindowGlobals).__ACTIVE_LEVEL_SCENE__ as {
        player: { isMovingRight: boolean };
      };
      s.player.isMovingRight = true;
    });

    await page.waitForTimeout(300);

    await page.evaluate(() => {
      const s = (window as unknown as WindowGlobals).__ACTIVE_LEVEL_SCENE__ as {
        player: { isMovingRight: boolean };
      };
      s.player.isMovingRight = false;
    });

    const movedPos = await page.evaluate(() => {
      const s = (window as unknown as WindowGlobals).__ACTIVE_LEVEL_SCENE__ as { player: { x: number; y: number } };
      return { x: s.player.x, y: s.player.y };
    });
    expect(movedPos.x).toBeGreaterThan(initialPos.x);

    // 4. Jump
    const jumpVelocity = await page.evaluate(() => {
      const s = (window as unknown as WindowGlobals).__ACTIVE_LEVEL_SCENE__ as {
        player: { jump: () => void; body: { velocity: { y: number } } };
      };
      s.player.jump();
      return s.player.body.velocity.y;
    });

    // Upward velocity is negative in Arcade Physics
    expect(jumpVelocity).toBeLessThan(0);
  });

  test('QA Criteria 5, 6 & 7: Hazard collision, death, and retry flow', async ({ page }) => {
    await page.goto('/play');

    await page.waitForFunction(() => {
      const s = (window as unknown as WindowGlobals).__ACTIVE_LEVEL_SCENE__ as { player?: { x: number } } | null;
      return s?.player?.x !== undefined;
    }, { timeout: 15_000 });

    // 5. Collision & 6. Death
    const deathTriggered = await page.evaluate(() => {
      const s = (window as unknown as WindowGlobals).__ACTIVE_LEVEL_SCENE__ as {
        handleHazardHit?: () => void;
        player: { isDead: boolean };
      };
      s.handleHazardHit?.();
      return s.player.isDead;
    });
    expect(deathTriggered).toBe(true);

    // 7. Manual retry via 'R' key
    await page.evaluate(() => {
      const evt = new KeyboardEvent('keydown', { code: 'KeyR', key: 'r', bubbles: true });
      Object.defineProperty(evt, 'keyCode', { value: 82 });
      Object.defineProperty(evt, 'which', { value: 82 });
      window.dispatchEvent(evt);
    });

    // Wait for player to revive
    await page.waitForFunction(() => {
      const s = (window as unknown as WindowGlobals).__ACTIVE_LEVEL_SCENE__ as { player?: { isDead: boolean } } | null;
      return s?.player && !s.player.isDead;
    }, { timeout: 15_000 });

    // Verify attempts counter increased
    const attempts = await page.evaluate(() => {
      const s = (window as unknown as WindowGlobals).__ACTIVE_LEVEL_SCENE__ as { attempts: number };
      return s.attempts;
    });
    expect(attempts).toBeGreaterThanOrEqual(1);
  });

  test('QA Criteria 8 & 9: Level completion and behavior reveal toast', async ({ page }) => {
    await page.goto('/play');

    await page.waitForFunction(() => {
      const b = (window as unknown as WindowGlobals).__TRIGGER_BRIDGE__;
      return typeof b === 'function';
    }, { timeout: 15_000 });

    // 8. Level completion
    await page.evaluate(() => {
      const bridge = (window as unknown as WindowGlobals).__TRIGGER_BRIDGE__ as (evt: {
        type: string;
        payload?: Record<string, unknown>;
      }) => void;
      bridge({ type: 'level_complete', payload: { level: 1 } });
    });

    // Check HUD shows LEVEL 2
    await expect(page.locator('#hud-level')).toContainText('LEVEL 2');

    // 9. Behavior reveal toast
    await page.evaluate(() => {
      const bridge = (window as unknown as WindowGlobals).__TRIGGER_BRIDGE__ as (evt: {
        type: string;
        payload?: Record<string, unknown>;
      }) => void;
      bridge({
        type: 'observation',
        payload: { message: 'You chose left 8 times.' },
      });
    });

    const toast = page.locator('#observation-toast');
    await expect(toast).toBeVisible();
    await expect(toast).toContainText('You chose left 8 times.');
  });

  test('QA Criteria 10, 11, 12 & 13: Level 5, Ending Screen, Play Again, and Clean Reset', async ({ page }) => {
    await page.goto('/play');

    // Wait for both SESSION_MANAGER and TRIGGER_BRIDGE to mount
    await page.waitForFunction(() => {
      const w = window as unknown as WindowGlobals;
      return typeof w.__SESSION_MANAGER__ !== 'undefined' && typeof w.__TRIGGER_BRIDGE__ === 'function';
    }, { timeout: 15_000 });

    // Populate mock session behavior to test summary display
    await page.evaluate(() => {
      const sm = (window as unknown as WindowGlobals).__SESSION_MANAGER__ as {
        record: (evt: { type: string; level: number }) => void;
        updateProfile: (partial: Record<string, unknown>) => void;
      };
      sm.record({ type: 'jump', level: 1 });
      sm.record({ type: 'move', level: 1 });
      sm.updateProfile({
        attempts: 7,
        jumps: 42,
        leftChoices: 12,
        rightChoices: 2,
        avgHesitationMs: 250,
      });
    });

    // 10. Level 5 transition
    await page.evaluate(() => {
      const bridge = (window as unknown as WindowGlobals).__TRIGGER_BRIDGE__ as (evt: {
        type: string;
        payload?: Record<string, unknown>;
      }) => void;
      bridge({ type: 'level_complete', payload: { level: 4 } });
    });
    await expect(page.locator('#hud-level')).toContainText('LEVEL 5');

    // 11. Ending Screen trigger
    await page.evaluate(() => {
      const bridge = (window as unknown as WindowGlobals).__TRIGGER_BRIDGE__ as (evt: {
        type: string;
      }) => void;
      bridge({ type: 'game_over' });
    });

    const ending = page.locator('#ending-screen');
    await expect(ending).toBeVisible();

    // Verify narrative typography
    await expect(ending).toContainText('THE GAME THAT HATES YOU');
    await expect(ending).toContainText("I don't hate you.");
    await expect(ending).toContainText('I just know you.');

    // Verify concise session summary based on behavior
    await expect(ending).toContainText('Left-favored');
    await expect(ending).toContainText('High aerial frequency');
    await expect(ending).toContainText('Fast & decisive entry');

    // 12. Play Again button
    const playAgainBtn = page.locator('#btn-play-again');
    await expect(playAgainBtn).toBeVisible();
    await playAgainBtn.click();

    // Ending screen should dismiss
    await expect(ending).not.toBeVisible();

    // 13. Complete clean session reset verification
    const isReset = await page.evaluate(() => {
      const sm = (window as unknown as WindowGlobals).__SESSION_MANAGER__ as {
        eventCount: number;
        profile: { attempts: number; jumps: number; traits: unknown[] };
      };
      return (
        sm.profile.attempts === 0 &&
        sm.profile.jumps === 0 &&
        sm.profile.traits.length === 0 &&
        sm.eventCount <= 2
      );
    });
    expect(isReset).toBe(true);

    // Verify game returned to Level 1
    await expect(page.locator('#hud-level')).toContainText('LEVEL 1');
  });
});
