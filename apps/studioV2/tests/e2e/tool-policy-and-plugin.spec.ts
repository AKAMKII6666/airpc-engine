import { expect, test, type APIResponse, type Page } from "@playwright/test";

const FREE_CARD_ID = "lanxing_free";
const PLUGIN_TOOL_ID = "plugin:e2e-tools:echo";
const MISSING_PLUGIN_TOOL_ID = "plugin:disabled-tools:echo";

type Envelope<T> = { ok: boolean; data: T };

async function dataOf<T>(response: APIResponse): Promise<T> {
	expect(response.ok()).toBe(true);
	const body = await response.json() as Envelope<T>;
	expect(body.ok).toBe(true);
	return body.data;
}

async function openLanxingFreeCardEditor(page: Page): Promise<void> {
	await page.goto("/characters");
	await page.getByRole("button", { name: /^澜星姐姐剧情角色/ }).click();
	await page.getByRole("button", { name: "编辑自由通话卡" }).click();
	await expect(page.getByRole("dialog")).toContainText("编辑自由通话卡");
}

async function startLanxingFreeCall(page: Page): Promise<void> {
	await page.goto("/debugger");
	const role = page.getByTestId("role-row-lanxing");
	await expect(role).toBeVisible({ timeout: 60_000 });
	await role.getByRole("button", { name: "自由通话" }).click();
}

test.describe.configure({ mode: "serial" });

test("allowed request_hangup produces an NPC hangup and unified endCall", async ({
	page,
}) => {
	const startResponse = page.waitForResponse(function (response) {
		return response.url().endsWith("/api/debug/call/start") &&
			response.request().method() === "POST";
	});
	await startLanxingFreeCall(page);
	const started = await (await startResponse).json() as Envelope<{
		session: { availableTools: Array<{ toolId: string }> };
	}>;
	expect(started.data.session.availableTools.map((tool) => tool.toolId))
		.toContain("request_hangup");
	expect(started.data.session.availableTools.map((tool) => tool.toolId))
		.not.toContain(PLUGIN_TOOL_ID);

	const endResponse = page.waitForResponse(function (response) {
		return response.url().endsWith("/api/debug/call/end") &&
			response.request().method() === "POST";
	});
	await page.getByPlaceholder("输入玩家在通话中说的话...")
		.fill("E2E_REQUEST_HANGUP");
	await page.getByRole("button", { name: "发送" }).click();
	await expect(page.getByText("对方已挂断", { exact: true })).toBeVisible();
	const endRequest = (await endResponse).request().postDataJSON() as {
		termination?: { source?: string; reasonKind?: string };
	};
	expect(endRequest.termination).toMatchObject({
		source: "npc",
		reasonKind: "natural",
	});
	await expect(page.getByRole("heading", { name: "电话模拟器" })).toBeVisible();
});

test("plugin FC appears in the editor, persists, reloads and invokes", async ({
	page,
	request,
}) => {
	const pluginStatus = await request.get("/api/plugins/status");
	expect(pluginStatus.ok()).toBe(true);
	const pluginStatusBody = await pluginStatus.json() as {
		loaded?: Array<{ pluginId?: string }>;
		failures?: unknown[];
	};
	expect(pluginStatusBody.loaded, JSON.stringify(pluginStatusBody.failures))
		.toEqual(expect.arrayContaining([
			expect.objectContaining({ pluginId: "e2e-tools" }),
		]));
	await openLanxingFreeCardEditor(page);
	const pluginCheckbox = page.getByRole("checkbox", { name: /E2E 回声/ });
	await expect(pluginCheckbox).toBeVisible();
	await expect(pluginCheckbox).not.toBeChecked();
	await pluginCheckbox.check();
	await page.getByRole("button", { name: "保存自由通话卡" }).click();

	await openLanxingFreeCardEditor(page);
	await expect(page.getByRole("checkbox", { name: /E2E 回声/ })).toBeChecked();
	await page.getByRole("button", { name: "取消" }).click();

	const stored = await dataOf<{ card: { toolPolicy?: { allowedToolIds?: string[] } } }>(
		await request.get(`/api/characters/free-cards/${FREE_CARD_ID}`),
	);
	expect(stored.card.toolPolicy?.allowedToolIds).toContain(PLUGIN_TOOL_ID);

	await startLanxingFreeCall(page);
	await expect(page.getByText(PLUGIN_TOOL_ID, { exact: true })).toBeVisible();
	await page.getByPlaceholder("输入玩家在通话中说的话...")
		.fill("E2E_PLUGIN_CALL");
	await page.getByRole("button", { name: "发送" }).click();
	await expect(page.getByText("E2E plugin result accepted.", { exact: true }))
		.toBeVisible();
	await expect(page.getByText(`第 1 轮 · ${PLUGIN_TOOL_ID}`, { exact: true }))
		.toBeVisible();
	await page.getByRole("button", { name: "挂断" }).click();
	await expect(page.getByRole("heading", { name: "电话模拟器" })).toBeVisible();
});

test("missing plugin config is preserved and blocked; deny_all rejects forged FC", async ({
	page,
	request,
}) => {
	const current = await dataOf<{ card: Record<string, unknown> & {
		toolPolicy?: { allowedToolIds?: string[] };
	} }>(await request.get(`/api/characters/free-cards/${FREE_CARD_ID}`));
	const currentIds = current.card.toolPolicy?.allowedToolIds ?? [];
	const missingCard = {
		...current.card,
		toolPolicy: {
			schemaVersion: 2,
			mode: "allowlist",
			allowedToolIds: currentIds.map(function (toolId) {
				return toolId === PLUGIN_TOOL_ID ? MISSING_PLUGIN_TOOL_ID : toolId;
			}),
			options: {
				request_hangup: { allowedReasonKinds: ["natural", "policy"] },
			},
		},
	};
	await dataOf(await request.put(`/api/characters/free-cards/${FREE_CARD_ID}`, {
		data: { card: missingCard },
	}));

	await openLanxingFreeCardEditor(page);
	await expect(page.getByText(`${MISSING_PLUGIN_TOOL_ID}（插件不可用）`, {
		exact: true,
	})).toBeVisible();
	await page.getByRole("button", { name: "保存自由通话卡" }).click();
	const preserved = await dataOf<{ card: { toolPolicy?: { allowedToolIds?: string[] } } }>(
		await request.get(`/api/characters/free-cards/${FREE_CARD_ID}`),
	);
	expect(preserved.card.toolPolicy?.allowedToolIds).toContain(MISSING_PLUGIN_TOOL_ID);

	await startLanxingFreeCall(page);
	await expect(page.getByText(/card references unavailable tools/)).toBeVisible();

	const denyCard = {
		...current.card,
		toolPolicy: { schemaVersion: 2, mode: "deny_all" },
	};
	await dataOf(await request.put(`/api/characters/free-cards/${FREE_CARD_ID}`, {
		data: { card: denyCard },
	}));
	const started = await dataOf<{ session: {
		sessionId: string;
		availableTools: unknown[];
	} }>(await request.post("/api/debug/call/start", {
		data: { mode: "free_call", userId: "demo-user", agentId: "lanxing" },
	}));
	expect(started.session.availableTools).toEqual([]);

	const forged = await dataOf<{ result: {
		ok: false;
		details?: { rule?: string };
	} }>(await request.post("/api/debug/e2e/tool-invoke", {
		data: {
			sessionId: started.session.sessionId,
			toolId: "request_hangup",
			args: { reasonKind: "natural", reason: "forged" },
		},
	}));
	expect(forged.result).toMatchObject({
		ok: false,
		details: { rule: "TOOL_POLICY" },
	});

	const messaged = await dataOf<{ session: {
		turns: Array<{ role: string; text: string }>;
		shellEvents: unknown[];
	} }>(await request.post("/api/debug/call/message", {
		data: {
			sessionId: started.session.sessionId,
			text: "E2E_REQUEST_HANGUP",
		},
	}));
	expect(messaged.session.turns.at(-1)?.text).toBe("E2E no hangup tool.");
	expect(messaged.session.shellEvents).toEqual([]);
	await dataOf(await request.post("/api/debug/call/end", {
		data: { sessionId: started.session.sessionId, hangupEarly: false },
	}));

	for (const params of [
		"agentId=lanxing&cardKind=story&interactionMode=playback_only",
		"agentId=lanxing&cardKind=voicemail&interactionMode=playback_only",
	]) {
		const catalog = await dataOf<{ tools: Array<{ selectable: boolean }> }>(
			await request.get(`/api/tools/catalog?${params}`),
		);
		expect(catalog.tools.every((tool) => !tool.selectable)).toBe(true);
	}
});
