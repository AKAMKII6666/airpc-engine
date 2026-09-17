import { expect, test } from "@playwright/test";

test("Studio V2 boots against the isolated workspace", async ({ page }) => {
	const consoleErrors: string[] = [];
	const serverErrors: string[] = [];
	page.on("console", (message) => {
		if (message.type() === "error") consoleErrors.push(message.text());
	});
	page.on("response", (response) => {
		if (response.status() >= 500) {
			serverErrors.push(`${response.status()} ${response.url()}`);
		}
	});

	await page.goto("/");
	await expect(page.locator("body")).toBeVisible();
	await expect(page.locator("body")).not.toContainText("Internal Server Error");

	expect(serverErrors).toEqual([]);
	expect(consoleErrors).toEqual([]);
});
