import { expect, test } from "@playwright/test";
import { getReviewerUser, getSmokeUser, signIn } from "./support/supabase-users";

const learner = getSmokeUser();
const reviewer = getReviewerUser();

test("creates an immutable snapshot and completes an allow-listed change-request cycle", async ({ browser, page }) => {
  test.skip(!learner || !reviewer, "Dedicated learner and reviewer users are required.");
  if (!learner || !reviewer) throw new Error("Learner and reviewer users are required");

  await signIn(page, learner);
  await page.goto("/projects/p3-easy");

  await page.getByLabel("Repository URL").fill("https://github.com/smoke-user/linear-regression");
  await page.getByLabel("Repository URL").press("Tab");
  await page.getByLabel("Reflection").fill(
    "Tôi tách phần chuẩn hóa dữ liệu khỏi mô hình để kiểm tra deterministic, so sánh metric rõ ràng và xử lý failure path mà không thay đổi domain contract."
  );
  await page.getByLabel("Reflection").press("Tab");

  const feature = page.getByTestId("feature-checklist").getByRole("button").first();
  if (await feature.getAttribute("aria-pressed") !== "true") await feature.click();
  await expect(page.getByTestId("evidence-ready-status"))
    .toContainText("Sẵn sàng cho review thủ công");

  const existingStatus = page.getByTestId("project-submission-status");
  if (await existingStatus.count()) {
    await expect(existingStatus).not.toContainText("Đã được reviewer chấp thuận");
  }

  const submitButton = page.getByRole("button", { name: /Gửi (review|snapshot mới)/ });
  if (await submitButton.count()) {
    await expect(submitButton).toBeEnabled({ timeout: 15_000 });
    const submitResponse = page.waitForResponse((response) =>
      response.url().includes("/rest/v1/rpc/submit_project_evidence") && response.ok()
    );
    await submitButton.click();
    await submitResponse;
  }
  await expect(page.getByTestId("project-submission-status"))
    .toContainText(/Đang chờ reviewer|Đang được review/);

  const reviewerContext = await browser.newContext();
  const reviewerPage = await reviewerContext.newPage();
  const feedback = "Bổ sung một failure-path test và ghi rõ retry boundary trước khi gửi lại.";
  try {
    await signIn(reviewerPage, reviewer);
    await reviewerPage.goto("/review/projects");
    await expect(reviewerPage.getByTestId("project-review-queue")).toBeVisible();
    const item = reviewerPage.getByTestId("project-review-item")
      .filter({ hasText: "Project p3-easy" })
      .first();
    await expect(item).toBeVisible();

    const claimButton = item.getByRole("button", { name: "Nhận review" });
    if (await claimButton.count()) await claimButton.click();
    await expect(item.getByLabel("Phản hồi reviewer")).toBeVisible();
    await item.getByLabel("Phản hồi reviewer").fill(feedback);
    await item.getByRole("button", { name: "Yêu cầu chỉnh sửa" }).click();
    await expect(item).toHaveCount(0);
  } finally {
    await reviewerContext.close();
  }

  await page.reload();
  await expect(page.getByTestId("project-submission-status")).toContainText("Cần chỉnh sửa");
  await expect(page.getByTestId("project-review-feedback")).toContainText(feedback);
  await expect(page.getByRole("button", { name: "Gửi snapshot mới" })).toBeEnabled();
});
