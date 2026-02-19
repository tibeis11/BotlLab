import { test, expect } from "@playwright/test";

test.describe("Critical Features", () => {
    
    test("user can view discover page", async ({ page }) => {
        await page.goto("/discover");
        
        // Check for page title/header
        await expect(page).toHaveTitle(/Botl/);
        
        // Wait for at least one brew card or the load state
        // We expect the grid to be present
        const grid = page.locator('div.grid').first();
        await expect(grid).toBeVisible();
    });

    test("public user can view a brew details page", async ({ page }) => {
        // Navigate to a known public brew or first in discover list
        await page.goto("/discover");
        
        // Click on the first brew card that links to a brew
        const firstBrewCard = page.locator('a[href^="/b/"]').first();
        
        if (await firstBrewCard.isVisible()) {
            await firstBrewCard.click();
            
            // Verify we are on a detail page
            await expect(page).toHaveURL(/\/b\//);
            
            // Check for critical elements
            await expect(page.locator('h1')).toBeVisible(); // Brew Name
            // Rating section check
            const bodyText = await page.textContent('body');
            expect(bodyText?.length).toBeGreaterThan(100);
        } else {
             console.log("No brews found on discover page, skipping detail test");
        }
    });

    test("analytics page loads without crash (smoke)", async ({ page }) => {
        // We can't easily test analytics without being a brewery owner, 
        // but we can check if the public route or a protected route handles access correctly
        // instead of crashing with 500.
        
        await page.goto("/team/test-brewery-id/analytics");
        
        // Should redirect to login or show 404/403, but NOT 500 error
        const bodyText = await page.textContent('body');
        expect(bodyText).not.toContain("Internal Server Error");
        expect(bodyText).not.toContain("500");
    });
});
