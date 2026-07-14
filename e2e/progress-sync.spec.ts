import { expect, test, type Page } from "@playwright/test";
import { getSmokeUser, signIn } from "./support/supabase-users";

const lessonPath = "/phase/phase-1-programming/python-fundamentals";
const anonymousMergeLessonPath = "/phase/phase-1-programming/functions";
const user = getSmokeUser();
const isProgressMutationResponse = (response: { url(): string; ok(): boolean }) =>
  response.url().includes("/rest/v1/rpc/apply_progress_item_mutations") && response.ok();
type ProgressLabel = "Đánh dấu hoàn thành" | "Đã hoàn thành";

async function expectRemoteProgress(page: Page, label: ProgressLabel) {
  await expect(async () => {
    await page.reload();
    await expect(page.getByRole("button", { name: label, exact: true })).toBeEnabled({
      timeout: 5_000,
    });
  }).toPass({
    intervals: [500, 1_000, 2_000],
    timeout: 30_000,
  });
}

function observeProgressRpc(
  page: Page,
  label: string,
  diagnostics: string[],
  pendingDiagnostics: Promise<void>[]
) {
  page.on("response", (response) => {
    if (!response.url().includes("/rest/v1/rpc/apply_progress_item_mutations")) return;
    pendingDiagnostics.push(
      response
        .text()
        .then((body) => {
          diagnostics.push(
            `${label} RPC ${response.status()} request=${response.request().postData() ?? ""} response=${body}`
          );
        })
        .catch(() => {
          diagnostics.push(`${label} RPC ${response.status()} (response body unavailable)`);
        })
    );
  });
  page.on("requestfailed", (request) => {
    if (!request.url().includes("/rest/v1/rpc/apply_progress_item_mutations")) return;
    diagnostics.push(`${label} RPC failed: ${request.failure()?.errorText ?? "unknown error"}`);
  });
  page.on("console", (message) => {
    if (message.text().includes("[progress]")) {
      diagnostics.push(`${label} console ${message.type()}: ${message.text()}`);
    }
  });
}

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

  test("syncs a completion across contexts and preserves an offline mutation", async ({ browser }, testInfo) => {
    test.setTimeout(120_000);
    if (!user) throw new Error("Smoke user is required");

    const contextA = await browser.newContext();
    const contextB = await browser.newContext();
    // Keep the verification context independent from the app's cross-tab
    // BroadcastChannel so every observed state transition must come from the
    // authoritative Supabase document after a reload.
    await contextB.addInitScript(() => {
      Object.defineProperty(window, "BroadcastChannel", {
        configurable: true,
        value: undefined,
      });
    });
    const pageA = await contextA.newPage();
    const pageB = await contextB.newPage();
    const diagnostics: string[] = [];
    const pendingDiagnostics: Promise<void>[] = [];
    observeProgressRpc(pageA, "pageA", diagnostics, pendingDiagnostics);
    observeProgressRpc(pageB, "pageB", diagnostics, pendingDiagnostics);

    try {
      await Promise.all([signIn(pageA, user), signIn(pageB, user)]);
      await Promise.all([pageA.goto(lessonPath), pageB.goto(lessonPath)]);

      const completeA = pageA.getByRole("button", { name: "Đánh dấu hoàn thành", exact: true });
      const completedA = pageA.getByRole("button", { name: "Đã hoàn thành", exact: true });
      const progressToggleA = pageA.getByRole("button", {
        name: /^(Đánh dấu hoàn thành|Đã hoàn thành)$/,
      });
      await expect(progressToggleA).toBeEnabled({ timeout: 15_000 });

      if (await completedA.isVisible()) {
        await completedA.click();
        await expect(completeA).toBeEnabled({ timeout: 15_000 });
        await expectRemoteProgress(pageB, "Đánh dấu hoàn thành");
      }

      await completeA.click();
      await expect(completedA).toBeVisible({ timeout: 15_000 });
      await expectRemoteProgress(pageB, "Đã hoàn thành");
      const completeB = pageB.getByRole("button", { name: "Đánh dấu hoàn thành", exact: true });
      const completedB = pageB.getByRole("button", { name: "Đã hoàn thành", exact: true });
      await expect(completedB).toBeEnabled({ timeout: 15_000 });

      await completedB.click();
      await expect(completeB).toBeVisible({ timeout: 15_000 });
      await expectRemoteProgress(pageA, "Đánh dấu hoàn thành");
      const incompleteA = pageA.getByRole("button", { name: "Đánh dấu hoàn thành", exact: true });
      await expect(incompleteA).toBeVisible();
      await expect(incompleteA).toBeEnabled({ timeout: 15_000 });

      await pageA.context().setOffline(true);
      await incompleteA.click();
      await expect(pageA.getByRole("button", { name: "Đã hoàn thành" })).toBeVisible();
      await pageA.context().setOffline(false);
      await expectRemoteProgress(pageB, "Đã hoàn thành");
    } catch (error) {
      await Promise.allSettled(pendingDiagnostics);
      for (const [label, page] of [
        ["pageA", pageA],
        ["pageB", pageB],
      ] as const) {
        try {
          const progressStorage = await page.evaluate(() =>
            Object.fromEntries(
              Object.entries(localStorage).filter(([key]) => key.startsWith("ai-roadmap:progress:v3"))
            )
          );
          diagnostics.push(`${label} storage=${JSON.stringify(progressStorage)}`);
        } catch {
          diagnostics.push(`${label} storage unavailable`);
        }
      }
      await testInfo.attach("progress-sync-diagnostics", {
        body: diagnostics.join("\n"),
        contentType: "text/plain",
      });
      console.error(diagnostics.join("\n"));
      throw error;
    } finally {
      await Promise.all([contextA.close(), contextB.close()]);
    }
  });
});
