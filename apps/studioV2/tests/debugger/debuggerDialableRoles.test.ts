/**
	* 调试器可拨角色投影：外部入口只允许 free card。
	*/
import { describe, expect, it } from "vitest";
import type { CharacterDef } from "@airpc/rpg-engine";
import { projectDebuggerDialableRole } from "@studio-v2/src/utils/server/debugger/session/debuggerDialableRoles.server";

function characterFixture(
	patch: Partial<CharacterDef> = {},
): CharacterDef {
	return {
		schemaVersion: 1,
		agentId: "lanxing",
		displayName: "澜星姐姐",
		dialable: true,
		freeCardId: "lanxing_free",
		meta: { phoneNumber: "13810018822" },
		...patch,
	};
}

describe("projectDebuggerDialableRole", () => {
	it("marks dialable character with existing free card as callable", async () => {
		const role = await projectDebuggerDialableRole(
			characterFixture(),
			async () => true,
		);
		expect(role).toMatchObject({
			agentId: "lanxing",
			displayName: "澜星姐姐",
			phoneNumber: "13810018822",
			canFreeCall: true,
			freeCardId: "lanxing_free",
			blockedReason: null,
		});
	});

	it("blocks narrative-only and missing free card characters", async () => {
		await expect(
			projectDebuggerDialableRole(
				characterFixture({ isNarrativeOnly: true }),
				async () => true,
			),
		).resolves.toMatchObject({
			canFreeCall: false,
			blockedReason: "叙事角色不能直接拨号",
		});
		await expect(
			projectDebuggerDialableRole(
				characterFixture({ freeCardId: undefined }),
				async () => true,
			),
		).resolves.toMatchObject({
			canFreeCall: false,
			blockedReason: "未绑定 free card",
		});
	});
});
