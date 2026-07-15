import { expect, test } from "@playwright/test";

test("keeps P2 drafts usable while the P2.1 review workflow is rolled back", async ({ page }) => {
  await page.goto("/projects/p3-easy");

  await expect(page.getByTestId("feature-checklist")).toBeVisible();
  await expect(page.getByTestId("project-evidence-panel")).toBeVisible();
  await expect(page.getByTestId("project-submission-card")).toHaveCount(0);

  const response = await page.goto("/review/projects");
  expect(response?.status()).toBe(404);
});
