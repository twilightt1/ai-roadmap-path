import { expect, test } from "@playwright/test";
import { getReviewerUser, signIn } from "./support/supabase-users";

const reviewer = getReviewerUser();

test("shows the bounded reviewer queue controls when P2.2 is enabled", async ({ page }) => {
  test.skip(!reviewer, "A dedicated reviewer user is required.");
  if (!reviewer) throw new Error("Reviewer user is required");

  await signIn(page, reviewer);
  await page.goto("/review/projects");

  await expect(page.getByTestId("project-review-queue")).toBeVisible();
  const pagination = page.getByTestId("project-review-pagination");
  await expect(pagination).toBeVisible();
  await expect(pagination).toContainText("Trang 1");
  await expect(pagination.getByRole("button", { name: "Trang trước" })).toBeDisabled();
  await expect(page.getByText(/snapshot mỗi trang/)).toBeVisible();
});
