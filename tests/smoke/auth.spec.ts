import { test, expect } from "@playwright/test";
import { createTestUser, deleteTestUser } from "../utils/supabase-admin";

test.describe("Critical Auth Flows", () => {
    const testEmail = `test-${Date.now()}@example.com`;
    const testPassword = "TestPassword123!";

    test.afterAll(async () => {
        // Cleanup test user
        try {
            await deleteTestUser(testEmail);
        } catch (e) {
            // console.warn("Cleanup failed:", e);
        }
    });

    test("user can sign up and access dashboard", async ({ page }) => {
        await page.goto("/login");

        // Click on toggle to show registration ("Jetzt kostenlos registrieren")
        await page.click("text=Jetzt kostenlos registrieren");

        await page.fill('input[type="email"]', testEmail);
        await page.fill('input[type="password"]', testPassword);

        // Add required fields for BotlLab registration
        await page.fill('input[placeholder="z.B. tims_craft"]', "TestBrauerei");
        await page.fill('input[type="date"]', "1990-01-01");

        // Submit registration ("🚀 Brauerei gründen")
        await page.click('button:has-text("Brauerei gründen")');

        // Note: If email confirmation is required, this will show a success message instead of redirecting.
        // For a smoke test, we check if the success message appears or if it redirects.
        // Given the local setup, we expect either /dashboard if auto-confirm is on, or the confirmation message.

        // Race condition: wait for either redirect to dashboard OR success message
        try {
            await Promise.race([
                page.waitForURL(/.*dashboard.*/),
                page.locator("text=Bestätige deine E-Mail-Adresse").waitFor({ state: "visible", timeout: 15000 })
            ]);
        } catch (e) {
            // If one times out but other succeeds, or both fail (caught by expect below)
        }

        if (page.url().includes("dashboard")) {
             await expect(page.locator("text=Willkommen")).toBeVisible();
        } else {
             await expect(page.locator("text=Bestätige deine E-Mail-Adresse")).toBeVisible();
        }
    });

    test("user can login with existing account", async ({ page }) => {
        // Ensure user exists and is confirmed via Admin API
        await createTestUser(testEmail, testPassword).catch(() => { });

        await page.goto("/login");
        await page.fill('input[type="email"]', testEmail);
        await page.fill('input[type="password"]', testPassword);

        // Submit login ("→ Einloggen")
        await page.click('button:has-text("Einloggen")');

        await expect(page).toHaveURL(/.*dashboard.*/, { timeout: 15000 });
    });
});
