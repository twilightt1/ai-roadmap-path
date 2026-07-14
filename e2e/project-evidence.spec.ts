import { expect, test } from "@playwright/test";
import { getSmokeUser, signIn } from "./support/supabase-users";

const user = getSmokeUser();
const isProjectEvidenceMerge = (response: { url(): string; ok(): boolean }) =>
  response.url().includes("/rest/v1/rpc/merge_project_evidence") && response.ok();

test.describe("P2 project evidence", () => {
  test("persists a validated anonymous draft and derives manual-review readiness", async ({ page }) => {
    await page.goto("/projects/p1-easy");

    const panel = page.getByTestId("project-evidence-panel");
    await expect(panel).toBeVisible();

    const repository = page.getByLabel("Repository URL");
    const repositoryError = page.locator("#project-evidence-repository-error");
    await repository.fill("javascript:alert(1)");
    await repository.press("Tab");
    await expect(repositoryError).toContainText("HTTPS hợp lệ");

    await repository.fill("https://github.com/smoke-user/python-ai-toolkit");
    await repository.press("Tab");
    await expect(repositoryError).toHaveCount(0);

    const reflection = page.getByLabel("Reflection");
    const reflectionText =
      "Tôi tách CLI khỏi lớp gọi API để có thể test deterministic, thay provider dễ hơn và xử lý retry tập trung.";
    await reflection.fill(reflectionText);
    await reflection.press("Tab");

    const featureButtons = page.getByTestId("feature-checklist").getByRole("button");
    await expect(featureButtons).toHaveCount(3);
    for (let index = 0; index < 3; index += 1) {
      const button = featureButtons.nth(index);
      if (await button.getAttribute("aria-pressed") !== "true") await button.click();
    }

    await expect(page.getByTestId("evidence-ready-status"))
      .toContainText("Sẵn sàng cho review thủ công");
    await page.reload();
    await expect(page.getByLabel("Repository URL"))
      .toHaveValue("https://github.com/smoke-user/python-ai-toolkit");
    await expect(page.getByLabel("Reflection")).toHaveValue(reflectionText);
    await expect(page.getByTestId("evidence-ready-status"))
      .toContainText("Sẵn sàng cho review thủ công");
  });

  test("merges an anonymous draft on sign-in and loads it in another context", async ({ browser, page }) => {
    test.skip(!user, "A disposable Supabase smoke user is required for project evidence sync.");
    if (!user) throw new Error("Smoke user is required");

    const repositoryUrl = "https://codeberg.org/smoke-user/async-multi-api-caller";
    const reflectionText =
      "Smoke evidence verifies that a private project draft survives sign-in and synchronizes without exposing its content to telemetry.";

    await page.goto("/projects/p1-medium");
    await page.getByLabel("Repository URL").fill(repositoryUrl);
    await page.getByLabel("Repository URL").press("Tab");
    await page.getByLabel("Reflection").fill(reflectionText);
    await page.getByLabel("Reflection").press("Tab");

    await signIn(page, user);
    const mergeResponse = page.waitForResponse(isProjectEvidenceMerge);
    await page.goto("/projects/p1-medium");
    await mergeResponse;
    await expect(page.getByLabel("Repository URL")).toHaveValue(repositoryUrl);
    await expect(page.getByLabel("Reflection")).toHaveValue(reflectionText);
    await expect(page.getByText("Đồng bộ: đã đồng bộ")).toBeVisible();

    const secondContext = await browser.newContext();
    const secondPage = await secondContext.newPage();
    try {
      await signIn(secondPage, user);
      await secondPage.goto("/projects/p1-medium");
      await expect(secondPage.getByLabel("Repository URL")).toHaveValue(repositoryUrl);
      await expect(secondPage.getByLabel("Reflection")).toHaveValue(reflectionText);
    } finally {
      await secondContext.close();
    }
  });
});
