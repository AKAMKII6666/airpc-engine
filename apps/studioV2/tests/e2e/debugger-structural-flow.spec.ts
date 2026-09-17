import {
	expect,
	test,
	type APIResponse,
	type Page,
	type Response as BrowserResponse,
} from "@playwright/test";

const SCRIPTED_REPLY = "E2E scripted assistant reply.";
const ENTRY_ROUTE = "/api/debug/call/chapter-entry-ring";
const DEBUGGER_ENTRY_URL = "/debugger?chapterId=wrong_number_act1";

type ApiEnvelope<T> = {
	ok: boolean;
	data: T;
};

type RingView = {
	mode: "outbound_ring" | "already_active" | "simulate_start" | "blocked";
	outcome: string;
	incomingEventId?: string;
};

type IncomingView = {
	eventId: string;
	instanceId: string;
	cardId: string;
};

function capturePageFailures(page: Page) {
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
	return function assertHealthy() {
		expect(serverErrors).toEqual([]);
		expect(consoleErrors).toEqual([]);
	};
}

async function dataOf<T>(response: APIResponse | BrowserResponse): Promise<T> {
	expect(response.ok()).toBe(true);
	const body = (await response.json()) as ApiEnvelope<T>;
	expect(body.ok).toBe(true);
	return body.data;
}

async function waitForRing(page: Page): Promise<BrowserResponse> {
	return page.waitForResponse(
		(response) =>
			response.url().endsWith(ENTRY_ROUTE) &&
			response.request().method() === "POST",
	);
}

test.describe.configure({ mode: "serial" });

test("free call uses the scripted LLM and returns to an idle phone", async ({
	page,
}) => {
	const assertHealthy = capturePageFailures(page);
	await page.goto("/debugger");
	const role = page.getByTestId("role-row-bai-bansian");
	await expect(role).toBeVisible({ timeout: 60_000 });
	await role.getByRole("button", { name: "自由通话" }).click();

	await expect(page.getByText(/正在和 白半仙 通话/)).toBeVisible();
	await page
		.getByPlaceholder("输入玩家在通话中说的话...")
		.fill("E2E turn");
	await page.getByRole("button", { name: "发送" }).click();
	await expect(page.getByText(SCRIPTED_REPLY, { exact: true })).toBeVisible();

	await page.getByRole("button", { name: "挂断" }).click();
	await expect(page.getByRole("heading", { name: "电话模拟器" })).toBeVisible();
	assertHealthy();
});

test("chapter entry is idempotent, accepts the pinned call, and restores active state", async ({
	context,
	page,
	request,
}) => {
	const pageHealth = capturePageFailures(page);
	await page.goto(
		"/packages/wrong_number_act1/chapters/wrong_number_act1",
	);
	const gateChoice = page.getByRole("button", { name: /E2E Player/ });
	await expect(gateChoice).toBeVisible({ timeout: 90_000 });
	await gateChoice.click();
	await expect(page.getByText("玩家：E2E Player")).toBeVisible();

	const firstRingPromise = waitForRing(page);
	await page.getByRole("link", { name: "运行调试" }).click();
	const firstRing = await dataOf<{ ring: RingView }>(await firstRingPromise);
	expect(firstRing.ring.outcome).toBe("created");
	await expect(page.getByRole("dialog")).toContainText("澜星姐姐 呼入");

	const retryPage = await context.newPage();
	const retryHealth = capturePageFailures(retryPage);
	const retryRingPromise = waitForRing(retryPage);
	await retryPage.goto(DEBUGGER_ENTRY_URL);
	const retryRing = await dataOf<{ ring: RingView }>(await retryRingPromise);
	expect(retryRing.ring.outcome).toBe("reused_pending");

	const incoming = await dataOf<{ incomingCalls: IncomingView[] }>(
		await request.get("/api/debug/call/incoming?userId=demo-user"),
	);
	expect(incoming.incomingCalls).toHaveLength(1);
	expect(incoming.incomingCalls[0]?.eventId).toBe(
		firstRing.ring.incomingEventId,
	);

	const acceptResponsePromise = retryPage.waitForResponse(
		(response) =>
			response.url().endsWith("/api/debug/call/incoming") &&
			response.request().method() === "POST",
	);
	await retryPage.getByRole("button", { name: "接听" }).click();
	const accepted = await dataOf<{ session: { cardId: string; source: string } }>(
		await acceptResponsePromise,
	);
	expect(accepted.session).toMatchObject({
		cardId: incoming.incomingCalls[0]?.cardId,
		source: "story_pending",
	});
	await expect(retryPage.getByText(/正在和 澜星姐姐 通话/)).toBeVisible();

	const restorePage = await context.newPage();
	const restoreHealth = capturePageFailures(restorePage);
	const activeRingPromise = waitForRing(restorePage);
	await restorePage.goto(DEBUGGER_ENTRY_URL);
	const activeRing = await dataOf<{ ring: RingView }>(await activeRingPromise);
	expect(activeRing.ring.outcome).toBe("already_active");
	await expect(restorePage.getByText(/正在和 澜星姐姐 通话/)).toBeVisible();

	await restorePage
		.getByPlaceholder("输入玩家在通话中说的话...")
		.fill("continue E2E story");
	await restorePage.getByRole("button", { name: "发送" }).click();
	await expect(
		restorePage.getByText(SCRIPTED_REPLY, { exact: true }),
	).toHaveCount(2);
	await restorePage.getByRole("button", { name: "挂断" }).click();
	await expect(
		restorePage.getByRole("heading", { name: "电话模拟器" }),
	).toBeVisible();

	const after = await dataOf<{ incomingCalls: IncomingView[] }>(
		await request.get("/api/debug/call/incoming?userId=demo-user"),
	);
	expect(after.incomingCalls).toEqual([]);
	pageHealth();
	retryHealth();
	restoreHealth();
	await restorePage.close();
	await retryPage.close();
});
