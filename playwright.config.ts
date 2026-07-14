import { defineConfig, devices } from "@playwright/test";

const port = 3100;
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? `http://127.0.0.1:${port}`;

export default defineConfig({
  testDir: "./e2e",
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
        timeout: 120_000,
        reuseExistingServer: !process.env.CI,
        env: {
          ...process.env,
          NEXT_PUBLIC_SITE_URL: baseURL,
          NEXT_PUBLIC_P0_WORKER_EXECUTION: "true",
          NEXT_PUBLIC_P0_LWW_PROGRESS: "true",
          NEXT_PUBLIC_P0_PRACTICE_LADDER: "true",
          NEXT_PUBLIC_P1_LEARNING_LOOP: "true",
        },
      },
});
