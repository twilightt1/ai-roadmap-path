import { expect, test } from "@playwright/test";
import { getReviewerUser, signIn } from "./support/supabase-users";

const reviewer = getReviewerUser();

test("keeps the P2.1 queue usable while P2.2 pagination is rolled back", async ({ page }) => {
  test.skip(!reviewer, "A dedicated reviewer user is required.");
  if (!reviewer) throw new Error("Reviewer user is required");

  await signIn(page, reviewer);
  await page.goto("/review/projects");

  await expect(page.getByTestId("project-review-queue")).toBeVisible();
  await expect(page.getByTestId("project-review-pagination")).toHaveCount(0);
  await expect(page.getByText(/Tối đa 50 snapshot/)).toBeVisible();
});
