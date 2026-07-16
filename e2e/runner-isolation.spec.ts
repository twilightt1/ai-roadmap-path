import { expect, test } from "@playwright/test";

const runtimeTestsEnabled = process.env.PLAYWRIGHT_RUN_EXTERNAL_RUNTIME === "true";

test.describe("runner isolation", () => {
  test("keeps the page responsive when JavaScript times out", async ({ page }) => {
    await page.goto("/playground?lang=javascript&code=while(true)%7B%7D");

    await page.getByRole("button", { name: "Run", exact: true }).click();
    await expect(page.locator("pre").filter({ hasText: /timed out/i })).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole("button", { name: "JavaScript", exact: true })).toBeEnabled();
  });

  test("does not expose window or localStorage to JavaScript worker code", async ({ page }) => {
    await page.goto(
      "/playground?lang=javascript&code=console.log(typeof%20window%2C%20typeof%20localStorage)"
    );

    await page.getByRole("button", { name: "Run", exact: true }).click();
    await expect(page.locator("pre").filter({ hasText: "undefined undefined" })).toBeVisible();
  });

  test("truncates oversized JavaScript output", async ({ page }) => {
    await page.goto(
      "/playground?lang=javascript&code=console.log('x'.repeat(100000))"
    );

    await page.getByRole("button", { name: "Run", exact: true }).click();
    await expect(page.locator("pre").filter({ hasText: /truncated/i })).toBeVisible();
  });

  test("runs SQL with quoted semicolons", async ({ page }) => {
    test.skip(!runtimeTestsEnabled, "Requires external sql.js CDN; set PLAYWRIGHT_RUN_EXTERNAL_RUNTIME=true.");
    await page.goto(
      "/playground?lang=sql&code=SELECT%20'semicolon%3B%20preserved'%20AS%20value%3B"
    );

    await page.getByRole("button", { name: "Run", exact: true }).click();
    await expect(page.getByRole("cell", { name: "semicolon; preserved" })).toBeVisible({ timeout: 30_000 });
  });

  test("times out Python without freezing the page", async ({ page }) => {
    test.skip(!runtimeTestsEnabled, "Requires external Pyodide CDN; set PLAYWRIGHT_RUN_EXTERNAL_RUNTIME=true.");
    await page.goto("/playground?lang=python&code=while%20True%3A%0A%20%20pass");

    await page.getByRole("button", { name: "Run", exact: true }).click();
    // Pyodide may need its full 60-second cold-load budget before the separate
    // 10-second execution timeout starts. Keep this assertion above both budgets.
    await expect(page.locator("pre").filter({ hasText: /timed out/i })).toBeVisible({ timeout: 75_000 });
    await expect(page.getByRole("button", { name: "JavaScript", exact: true })).toBeEnabled();
  });
});
