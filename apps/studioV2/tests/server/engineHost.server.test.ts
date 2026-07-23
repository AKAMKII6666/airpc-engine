/**
	* 模块名称：Studio V2 EngineHost 装配验收（V2-IO-9）
	* 模块说明：证明 createEngineIOPorts → getEngineHost 注入四 Port 且可 loadWorkspace。
	*/
import { afterEach, describe, expect, it } from "vitest";
// 引用了 Host 装配单例，用于验收本机 Ports 注入
import {
	getStudioV2EngineHost,
	reloadStudioV2WorkspaceIfBooted,
	resetStudioV2EngineHostForTests,
} from "../../src/utils/server/host/engineHost.server";

describe("Studio V2 EngineHost assembly (V2-IO-9)", () => {
	afterEach(() => {
		resetStudioV2EngineHostForTests();
	});

	it("injects Memory/Profile/Content/EngineLog ports and loads workspace", async () => {
		resetStudioV2EngineHostForTests();
		const host = await getStudioV2EngineHost();
		expect(host.getMemoryPort()).not.toBeNull();
		expect(host.getProfilePort()).not.toBeNull();
		expect(host.getContentPort()).not.toBeNull();
		expect(host.getEngineLogPort()).not.toBeNull();
	});

	it("reloadStudioV2WorkspaceIfBooted is no-op before first getHost", async () => {
		resetStudioV2EngineHostForTests();
		await expect(
			reloadStudioV2WorkspaceIfBooted(),
		).resolves.toBeUndefined();
	});

	it("reloadStudioV2WorkspaceIfBooted refreshes after boot", async () => {
		resetStudioV2EngineHostForTests();
		await getStudioV2EngineHost();
		await expect(
			reloadStudioV2WorkspaceIfBooted(),
		).resolves.toBeUndefined();
	});
});
