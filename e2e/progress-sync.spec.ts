import { expect, test } from "@playwright/test";
import { getSmokeUser, signIn } from "./support/supabase-users";

const lessonPath = "/phase/phase-1-programming/python-fundamentals";
const anonymousMergeLessonPath = "/phase/phase-1-programming/functions";
const user = getSmokeUser();
const isProgressMutationResponse = (response: { url(): string; ok(): boolean }) =>
  response.url().includes("/rest/v1/rpc/apply_progress_item_mutations") && response.ok();

test.describe("authenticated progress sync", () => {
  test.skip(!user, "Set PLAYWRIGHT_SMOKE_USER_EMAIL and PLAYWRIGHT_SMOKE_USER_PASSWORD for Supabase progress smoke.");

  test("merges an anonymous completion into the authenticated outbox after sign-in", async ({ page }) => {
    if (!user) throw new Error("Smoke user is required");

    await page.goto(anonymousMergeLessonPath);
    const incomplete = page.getByRole("button", { name: "Đánh dấu hoàn thành" });
    await expect(incomplete).toBeEnabled();
    await incomplete.click();
    await expect(page.getByRole("button", { name: "Đã hoàn thành" })).toBeVisible();

    const mergeSync = page.waitForResponse(isProgressMutationResponse);
    await signIn(page, user);
    await mergeSync;

    await page.goto(anonymousMergeLessonPath);
    const completed = page.getByRole("button", { name: "Đã hoàn thành" });
    await expect(completed).toBeEnabled();

    const cleanupSync = page.waitForResponse(isProgressMutationResponse);
    await completed.click();
    await expect(page.getByRole("button", { name: "Đánh dấu hoàn thành" })).toBeVisible();
    await cleanupSync;
  });

  test("syncs a completion across contexts and preserves an offline mutation", async ({ browser }) => {
    test.setTimeout(60_000);
    if (!user) throw new Error("Smoke user is required");

    const contextA = await browser.newContext();
    const contextB = await browser.newContext();
    const pageA = await contextA.newPage();
    const pageB = await contextB.newPage();

    try {
      await Promise.all([signIn(pageA, user), signIn(pageB, user)]);
      await Promise.all([pageA.goto(lessonPath), pageB.goto(lessonPath)]);

      const completeA = pageA.getByRole("button", { name: "Đánh dấu hoàn thành" });
      await expect(completeA).toBeEnabled();
      const initialSync = pageA.waitForResponse(isProgressMutationResponse);
      await completeA.click();
      await expect(pageA.getByRole("button", { name: "Đã hoàn thành" })).toBeVisible();
      await initialSync;

      await pageB.reload();
      await expect(pageB.getByRole("button", { name: "Đã hoàn thành" })).toBeVisible();

      const uncompleteSync = pageB.waitForResponse(isProgressMutationResponse);
      await pageB.getByRole("button", { name: "Đã hoàn thành" }).click();
      await expect(pageB.getByRole("button", { name: "Đánh dấu hoàn thành" })).toBeVisible();
      await uncompleteSync;

      await pageA.reload();
      const incompleteA = pageA.getByRole("button", { name: "Đánh dấu hoàn thành" });
      await expect(incompleteA).toBeVisible();
      await expect(incompleteA).toBeEnabled();

      await pageA.context().setOffline(true);
      await incompleteA.click();
      await expect(pageA.getByRole("button", { name: "Đã hoàn thành" })).toBeVisible();
      const retrySync = pageA.waitForResponse(isProgressMutationResponse);
      await pageA.context().setOffline(false);
      await retrySync;
      await pageA.reload();
      await expect(pageA.getByRole("button", { name: "Đã hoàn thành" })).toBeVisible();
    } finally {
      await Promise.all([contextA.close(), contextB.close()]);
    }
  });
});
