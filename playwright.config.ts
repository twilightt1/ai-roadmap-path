import { defineConfig, devices } from "@playwright/test";

const port = 3100;
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? `http://127.0.0.1:${port}`;
const ignoredTests: string[] = [];
if (process.env.PLAYWRIGHT_EXPECT_P2_DISABLED !== "true") {
  ignoredTests.push("**/project-evidence-disabled.spec.ts");
}
if (process.env.PLAYWRIGHT_RUN_P2_REVIEW !== "true") {
  ignoredTests.push("**/project-review.spec.ts");
}
if (process.env.PLAYWRIGHT_EXPECT_P2_REVIEW_DISABLED !== "true") {
  ignoredTests.push("**/project-review-disabled.spec.ts");
}
if (process.env.PLAYWRIGHT_RUN_P2_REVIEW_OPERATIONS !== "true") {
  ignoredTests.push("**/project-review-operations.spec.ts");
}
if (process.env.PLAYWRIGHT_EXPECT_P2_REVIEW_OPERATIONS_DISABLED !== "true") {
  ignoredTests.push("**/project-review-operations-disabled.spec.ts");
}

export default defineConfig({
  testDir: "./e2e",
  testIgnore: ignoredTests,
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: process.env.PLAYWRIGHT_BASE_URL
    ? undefined
    : {
        command: "pnpm build && pnpm start --hostname 127.0.0.1 --port 3100",
        url: baseURL,
        timeout: 240_000,
        reuseExistingServer: !process.env.CI,
        env: {
          ...process.env,
          NEXT_PUBLIC_SITE_URL: baseURL,
          NEXT_PUBLIC_P0_WORKER_EXECUTION: "true",
          NEXT_PUBLIC_P0_LWW_PROGRESS: "true",
          NEXT_PUBLIC_P0_PRACTICE_LADDER: "true",
          NEXT_PUBLIC_P1_LEARNING_LOOP: "true",
          NEXT_PUBLIC_P2_PROJECT_EVIDENCE:
            process.env.PLAYWRIGHT_EXPECT_P2_DISABLED === "true" ? "false" : "true",
          NEXT_PUBLIC_P2_REVIEW_WORKFLOW:
            process.env.PLAYWRIGHT_EXPECT_P2_DISABLED === "true"
              || process.env.PLAYWRIGHT_EXPECT_P2_REVIEW_DISABLED === "true"
              ? "false"
              : process.env.PLAYWRIGHT_RUN_P2_REVIEW === "true"
                || process.env.PLAYWRIGHT_RUN_P2_REVIEW_OPERATIONS === "true"
                || process.env.PLAYWRIGHT_EXPECT_P2_REVIEW_OPERATIONS_DISABLED === "true"
                ? "true"
                : "false",
          NEXT_PUBLIC_P2_REVIEW_QUEUE_PAGINATION:
            process.env.PLAYWRIGHT_RUN_P2_REVIEW_OPERATIONS === "true" ? "true" : "false",
        },
      },
});
