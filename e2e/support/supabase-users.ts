import type { Page } from "@playwright/test";

export type SmokeUser = {
  email: string;
  password: string;
};

/**
 * Browser E2E authentication is opt-in because it needs a running Supabase
 * instance plus a pre-provisioned test account. CI supplies these secrets.
 */
export function getSmokeUser(): SmokeUser | null {
  const email = process.env.PLAYWRIGHT_SMOKE_USER_EMAIL;
  const password = process.env.PLAYWRIGHT_SMOKE_USER_PASSWORD;
  return email && password ? { email, password } : null;
}

export function getReviewerUser(): SmokeUser | null {
  const email = process.env.PLAYWRIGHT_REVIEWER_USER_EMAIL;
  const password = process.env.PLAYWRIGHT_REVIEWER_USER_PASSWORD;
  return email && password ? { email, password } : null;
}

export async function signIn(page: Page, user: SmokeUser): Promise<void> {
  await page.goto("/login");
  await page.getByLabel("Email").fill(user.email);
  await page.getByLabel("Mật khẩu").fill(user.password);
  await Promise.all([
    page.waitForURL((url) => url.pathname === "/dashboard"),
    page.getByRole("button", { name: "Đăng nhập", exact: true }).click(),
  ]);
}
