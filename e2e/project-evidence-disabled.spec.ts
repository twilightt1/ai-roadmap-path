import { expect, test } from "@playwright/test";

test("keeps project tracking available while P2 evidence is rolled back", async ({ page }) => {
  await page.goto("/projects/p1-easy");

  await expect(page.getByTestId("feature-checklist")).toBeVisible();
  await expect(page.getByTestId("project-evidence-panel")).toHaveCount(0);
});
