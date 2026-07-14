import { expect, test } from "@playwright/test";

const lessonPath = "/phase/phase-1-programming/python-fundamentals";
const completionKey = "ai-roadmap:progress:v3";

test.describe("anonymous learning", () => {
  test("loads a lesson without login and retains local completion after reload", async ({ page }) => {
    await page.goto(lessonPath);

    await expect(page.getByRole("heading", { name: "Python Fundamentals" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Đăng nhập", exact: true })).toBeVisible();

    const completion = page.getByRole("button", { name: "Đánh dấu hoàn thành" });
    await expect(completion).toBeEnabled({ timeout: 15_000 });
    await completion.click();
    await expect(page.getByRole("button", { name: "Đã hoàn thành" })).toBeVisible();

    await expect
      .poll(() => page.evaluate((key) => localStorage.getItem(key), completionKey))
      .toContain("python-fundamentals");

    await page.reload();
    await expect(page.getByRole("button", { name: "Đã hoàn thành" })).toBeVisible();
  });
});
