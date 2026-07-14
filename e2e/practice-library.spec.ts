import { expect, test } from "@playwright/test";
import { getSmokeUser, signIn } from "./support/supabase-users";

const challengePath = "/practice/python-fibonacci";
const lessonPath = "/phase/phase-1-programming/python-fundamentals";
const user = getSmokeUser();

test.describe("practice and personal library", () => {
  test("shows practice discovery, ladder controls, and a locked walkthrough anonymously", async ({ page }) => {
    await page.goto("/practice");
    await expect(page.getByRole("heading", { name: /luyện tập/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /fibonacci/i }).first()).toBeVisible();

    await page.goto(challengePath);
    await expect(page.getByRole("heading", { name: /fibonacci/i })).toBeVisible();
    const recall = page.getByRole("heading", { name: "1. Recall", exact: true }).locator("..");
    await expect(recall).toBeVisible();
    await recall.getByRole("button", { name: /hai số fibonacci liên tiếp/i }).click();
    await expect(recall.getByText(/chỉ cần giữ hai số liên tiếp/i)).toBeVisible();
    await expect(page.getByRole("heading", { name: /fibonacci/i })).toBeVisible();
    await expect(page.getByText("2. Worked example")).toBeVisible();
    await expect(page.getByText("3. Scaffolded exercise")).toBeVisible();
    await expect(page.getByText("5. Transfer exercise")).toBeVisible();
    await expect(page.getByText("Solution Walkthrough đang khóa")).toBeVisible();
  });

  test("requires login before accessing the personal library", async ({ page }) => {
    await page.goto("/library");
    await expect(page.getByRole("heading", { name: "Thư viện cá nhân" })).toBeVisible();
    await expect(page.getByRole("link", { name: /đăng nhập để mở thư viện/i })).toBeVisible();
  });

  test.describe("authenticated library", () => {
    test.skip(!user, "Set PLAYWRIGHT_SMOKE_USER_EMAIL and PLAYWRIGHT_SMOKE_USER_PASSWORD for library persistence smoke.");

    test("allows a learner to bookmark a challenge and view it in the library", async ({ page }) => {
      if (!user) throw new Error("Smoke user is required");

      await signIn(page, user);
      await page.goto(challengePath);
      const bookmark = page.getByRole("button", { name: "Lưu challenge", exact: true });
      const savedBookmark = page.getByRole("button", { name: "Đã lưu challenge", exact: true });
      const bookmarkToggle = page.getByRole("button", {
        name: /^(Lưu challenge|Đã lưu challenge)$/,
      });
      await expect(bookmarkToggle).toBeVisible();

      if (await savedBookmark.isVisible()) {
        await savedBookmark.click();
        await expect(bookmark).toBeVisible();
        await expect(bookmark).toBeEnabled();
      }

      await bookmark.click();
      await expect(savedBookmark).toBeVisible();
      await expect(savedBookmark).toBeEnabled();

      await page.goto("/library");
      await expect(page.getByRole("heading", { name: "Thư viện cá nhân" })).toBeVisible();
      await expect(page.getByText("python-fibonacci")).toBeVisible();
    });

    test("persists and cleans up a lesson note and challenge snippet", async ({ page }) => {
      test.slow();
      if (!user) throw new Error("Smoke user is required");

      const marker = `staging-library-${Date.now()}`;
      const initialNote = `${marker}-note`;
      const updatedNote = `${initialNote}-updated`;
      const snippetTitle = `${marker}-snippet`;

      await signIn(page, user);
      await page.goto(lessonPath);

      const noteDraft = page.getByRole("textbox", { name: "Nội dung ghi chú mới" });
      await expect(noteDraft).toBeEnabled();
      await noteDraft.fill(initialNote);
      await page.getByRole("button", { name: "Thêm ghi chú", exact: true }).click();

      let noteArticle = page.locator("article").filter({ hasText: initialNote });
      await expect(noteArticle).toBeVisible();
      await noteArticle.getByRole("button", { name: "Sửa", exact: true }).click();
      await noteArticle.getByRole("textbox", { name: "Chỉnh sửa nội dung ghi chú" }).fill(updatedNote);
      await noteArticle.getByRole("button", { name: "Lưu", exact: true }).click();
      noteArticle = page.locator("article").filter({ hasText: updatedNote });
      await expect(noteArticle).toBeVisible();

      await page.goto("/library");
      await page.getByRole("button", { name: /^Ghi chú/ }).click();
      let notesRegion = page.getByRole("region", { name: "Ghi chú" });
      await expect(notesRegion.locator("article").filter({ hasText: updatedNote })).toBeVisible();

      await page.goto(lessonPath);
      noteArticle = page.locator("article").filter({ hasText: updatedNote });
      await expect(noteArticle).toBeVisible();
      await noteArticle.getByRole("button", { name: "Xoá", exact: true }).click();
      await expect(noteArticle).toHaveCount(0);

      await page.goto("/library");
      await page.getByRole("button", { name: /^Ghi chú/ }).click();
      notesRegion = page.getByRole("region", { name: "Ghi chú" });
      await expect(notesRegion.getByText(updatedNote, { exact: true })).toHaveCount(0);

      await page.goto(challengePath);
      await page.getByRole("button", { name: "Lưu snippet", exact: true }).click();
      const snippetDialog = page.getByRole("dialog", { name: "Lưu code snippet" });
      await expect(snippetDialog).toBeVisible();
      await snippetDialog.getByRole("textbox", { name: "Tiêu đề" }).fill(snippetTitle);
      await snippetDialog.getByRole("button", { name: "Lưu", exact: true }).click();
      await expect(snippetDialog).toBeHidden();

      await page.goto("/library");
      await page.getByRole("button", { name: /^Snippets/ }).click();
      const snippetsRegion = page.getByRole("region", { name: "Snippets" });
      const snippetArticle = snippetsRegion.locator("article").filter({ hasText: snippetTitle });
      await expect(snippetArticle).toBeVisible();
      await snippetArticle.getByRole("button", { name: "Xóa", exact: true }).click();
      await expect(snippetArticle).toHaveCount(0);
    });
  });
});
