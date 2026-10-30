import { expect, test } from '@playwright/test';

type ExpectedState = 'online' | 'offline';

const EXPECTED: ExpectedState = process.env.E2E_EXPECT === 'offline' ? 'offline' : 'online';

test(`FR-SYS-002: home page shows API: ${EXPECTED}`, async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('status')).toHaveText(`API: ${EXPECTED}`);
  await page.screenshot({
    path: `docs/evidence/DEV-1/web-api-${EXPECTED}.png`,
    fullPage: true,
  });
});
