/*
 * Copyright (c) 2026 Casual Office. All rights reserved.
 */

/**
 * `w:lineRule="exact"` below the text's natural line height.
 *
 * Word does not push the overflow into the neighbouring lines — it clips the
 * glyphs to the line box. Without the clip the ascenders of one line and the
 * descenders of the line above read as overlapping text (FD-DOCS-0001's
 * "叠字" class).
 *
 * Fixture: 24pt text on a 16px (240-twip) exact line, plus an auto-spacing
 * control paragraph that must not be clipped.
 */

import { test, expect, type Page } from '@playwright/test';

async function openFixture(page: Page): Promise<void> {
  await page.goto('/?e2e=1');
  await page.waitForSelector('[data-testid="docx-editor"]');
  await page
    .locator('input[type="file"][accept*=".docx"]')
    .setInputFiles('e2e/fixtures/exact-line-clip.docx');
  await page.waitForSelector('.paged-editor__pages');
  await page.waitForTimeout(1200);
}

async function lineStyles(page: Page) {
  return page.evaluate(() => {
    return Array.from(document.querySelectorAll('.paged-editor__pages .layout-paragraph')).map(
      (para) => {
        const line = para.querySelector('.layout-line') as HTMLElement | null;
        return {
          text: (para.textContent || '').trim().slice(0, 16),
          height: line ? Math.round(line.getBoundingClientRect().height * 100) / 100 : null,
          clipPath: line ? getComputedStyle(line).clipPath : null,
          overflow: line ? getComputedStyle(line).overflow : null,
        };
      }
    );
  });
}

test.describe('exact line spacing — glyph clipping', () => {
  test('an exact line box shorter than the glyphs clips them', async ({ page }) => {
    await openFixture(page);
    const lines = await lineStyles(page);

    const exactLine = lines[0];
    expect(exactLine.height).toBeCloseTo(16, 1); // 240 twips = 16px
    // Vertical-only clip; not `none`, and not a horizontal `overflow: hidden`.
    expect(exactLine.clipPath).not.toBe('none');
    expect(exactLine.clipPath).toContain('inset(');
  });

  test('auto-spaced paragraphs are not clipped', async ({ page }) => {
    await openFixture(page);
    const lines = await lineStyles(page);

    const control = lines.find((l) => l.text.includes('正常行距'));
    expect(control).toBeTruthy();
    expect(control!.clipPath).toBe('none');
  });
});
