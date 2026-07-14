import { expect, test } from "@playwright/test";
import { getSmokeUser, signIn } from "./support/supabase-users";

const user = getSmokeUser();
const isLearningProfileResponse = (response: { url(): string; ok(): boolean }) =>
  response.url().includes("/rest/v1/rpc/merge_learning_profile") && response.ok();

test.describe("P1 learning loop", () => {
  test("completes an anonymous diagnostic and persists a weekly goal without answers", async ({ page }) => {
    await page.goto("/diagnostic");

    const questions = page.getByTestId("diagnostic-question");
    await expect(questions).toHaveCount(8);
    for (let index = 0; index < 8; index += 1) {
      await page.getByTestId(`diagnostic-option-${index}-0`).click();
    }

    await page.getByRole("button", { name: "Hoàn thành đánh giá" }).click();
    await expect(page.getByTestId("diagnostic-result")).toContainText("Đã hoàn thành đánh giá");

    const storedProfile = await page.evaluate(() =>
      window.localStorage.getItem("ai-roadmap:learning-profile:v1")
    );
    expect(storedProfile).not.toBeNull();
    expect(storedProfile).not.toContain("selectedAnswers");
    expect(storedProfile).not.toContain('"answers"');
    const parsed = JSON.parse(storedProfile!) as {
      diagnostic: { value: { topicScores: Record<string, { correct: number; total: number }> } };
    };
    expect(Object.keys(parsed.diagnostic.value.topicScores)).toHaveLength(8);

    await page.getByRole("link", { name: /Xem learning loop/i }).click();
    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(page.getByTestId("learning-loop-dashboard")).toBeVisible();

    await page.getByRole("button", { name: "5 bài" }).click();
    await expect(page.getByRole("button", { name: "5 bài" })).toHaveAttribute("aria-pressed", "true");
    await page.reload();
    await expect(page.getByRole("button", { name: "5 bài" })).toHaveAttribute("aria-pressed", "true");
  });

  test("merges an anonymous goal on sign-in and loads it in another context", async ({ browser, page }) => {
    test.skip(!user, "A disposable Supabase smoke user is required for learning profile sync.");
    if (!user) throw new Error("Smoke user is required");

    await page.goto("/dashboard");
    await page.getByRole("button", { name: "7 bài" }).click();
    await expect(page.getByRole("button", { name: "7 bài" })).toHaveAttribute("aria-pressed", "true");

    const mergeResponse = page.waitForResponse(isLearningProfileResponse);
    await signIn(page, user);
    await mergeResponse;
    await expect(page.getByRole("button", { name: "7 bài" })).toHaveAttribute("aria-pressed", "true");

    const secondContext = await browser.newContext();
    const secondPage = await secondContext.newPage();
    try {
      await signIn(secondPage, user);
      await expect(secondPage.getByRole("button", { name: "7 bài" })).toHaveAttribute("aria-pressed", "true");
    } finally {
      await secondContext.close();
    }
  });
});
