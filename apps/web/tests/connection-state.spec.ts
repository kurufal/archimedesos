import { expect, test } from '@playwright/test';

test('a failed live connection is explicit and never uses demo inventory', async ({ page }) => {
  await page.goto('http://127.0.0.1:4176/');
  await expect(page.getByRole('alert')).toContainText('Live inventory unavailable');
  await expect(page.getByRole('alert')).toContainText('Demo data was not substituted');
  await expect(page.getByText('Local inventory', { exact: true })).toBeVisible();
  await expect(page.locator('.metric strong')).toHaveText(['00', '00', '00', '00', '00', '00']);
  await expect(page.locator('.host-card')).toHaveCount(0);
});
