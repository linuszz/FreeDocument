/*
 * Copyright (c) 2026 Casual Office. All rights reserved.
 */

/**
 * FD-DOCS-0002 — a numbered CJK heading (`第%1条`) whose marker has no hanging
 * indent slot used to be painted on a row the paginator never charged, so the
 * next paragraph landed on top of it.
 *
 * Fixtures (same document, only the paragraph tab stop differs):
 *   list-marker-overlap.docx  tab=480  — the marker overshoots the tab stop
 *   list-marker-fit.docx      tab=1200 — the marker fits before it
 *
 * Contract under test: painted paragraph boxes never intersect, and a marker
 * that fits keeps sharing the first line with the text.
 */

import { test, expect, type Page } from '@playwright/test';

const FIXTURES = ['list-marker-overlap.docx', 'list-marker-fit.docx'] as const;

interface Box {
  top: number;
  bottom: number;
  text: string;
}

/** Painted paragraph boxes, excluding table cells (side-by-side ≠ overlap). */
async function paragraphBoxes(page: Page): Promise<Box[]> {
  return page.evaluate(() => {
    return Array.from(document.querySelectorAll('.paged-editor__pages .layout-paragraph'))
      .filter((el) => !el.closest('.layout-table'))
      .map((el) => {
        const r = el.getBoundingClientRect();
        return {
          top: r.top,
          bottom: r.bottom,
          text: (el.textContent || '').trim(),
        };
      })
      .filter((b) => b.text.length > 0 && b.bottom - b.top > 0);
  });
}

async function openFixture(page: Page, name: string): Promise<void> {
  await page.goto('/?e2e=1');
  await page.waitForSelector('[data-testid="docx-editor"]');
  await page
    .locator('input[type="file"][accept*=".docx"]')
    .setInputFiles(`e2e/fixtures/${name}`);
  await page.waitForSelector('.paged-editor__pages');
  await page.waitForTimeout(1200);
}

test.describe('FD-DOCS-0002 — list-marker heading does not overlap the next paragraph', () => {
  for (const fixture of FIXTURES) {
    test(`${fixture}: paragraph boxes never intersect`, async ({ page }) => {
      await openFixture(page, fixture);

      const boxes = await paragraphBoxes(page);
      expect(boxes.length).toBeGreaterThan(1);

      const violations = boxes
        .slice(1)
        .map((b, i) => ({ prev: boxes[i], next: b }))
        .filter(({ prev, next }) => next.top < prev.bottom - 0.5)
        .map(({ prev, next }) => ({
          prev: prev.text.slice(0, 24),
          next: next.text.slice(0, 24),
          overlap: Math.round((prev.bottom - next.top) * 10) / 10,
        }));

      expect(violations).toEqual([]);
    });
  }

  test('a marker that fits shares the heading line with its text', async ({ page }) => {
    await openFixture(page, 'list-marker-fit.docx');

    const heading = page
      .locator('.paged-editor__pages .layout-paragraph')
      .filter({ hasText: '标的物信息、租金支付' })
      .first();

    // No marker-only row, and the marker lives inside the text line.
    await expect(heading.locator('.layout-list-marker-line')).toHaveCount(0);
    await expect(heading.locator('.layout-line .layout-list-marker')).toHaveCount(1);
  });
});