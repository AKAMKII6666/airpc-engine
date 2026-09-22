/**
	* 调试器待机角色投影：外部入口只允许拨角色 free card。
	*/
import {
	CharacterDefSchema,
	formatZodError,
	type CharacterDef,
} from "@airpc/rpg-engine";
import {
	listCharacterAgentIds,
	readCharacterJson,
} from "@studio-v2/src/utils/server/characters/charactersFs.server";
import { freeCardExists } from "@studio-v2/src/utils/server/characters/freeCards/freeCardsFs.server";

export type DebuggerDialableRoleServerView = {
	/** 角色 agentId；拨号命中后传给 Host free_call */
	agentId: string;
	/** UI 展示名；优先 displayName，其次 identity.nickname/fullName */
	displayName: string;
	/** 角色电话号码；来自 meta.phoneNumber/identity.phoneNumber，缺省用 agentId */
	phoneNumber: string;
	/** 是否允许外部调试器直接拨 free card */
	canFreeCall: boolean;
	/** 绑定的 free card id；没有绑定时为 null */
	freeCardId: string | null;
	/** 不可拨原因；可拨时为 null */
	blockedReason: string | null;
};

function textOrNull(value: unknown): string | null {
	return typeof value === "string" && value.trim() !== "" ? value.trim() : null;
}

function displayNameOf(def: CharacterDef): string {
	return (
		textOrNull(def.displayName) ??
		textOrNull(def.identity?.nickname) ??
		textOrNull(def.identity?.fullName) ??
		def.agentId
	);
}

function phoneNumberOf(def: CharacterDef): string {
	return (
		textOrNull(def.meta?.phoneNumber) ??
		textOrNull((def.identity as { phoneNumber?: unknown } | undefined)?.phoneNumber) ??
		def.agentId
	);
}

/** 将单个 CharacterDef 投影为调试器可拨状态 */
export async function projectDebuggerDialableRole(
	def: CharacterDef,
	hasFreeCard: (freeCardId: string) => Promise<boolean>,
): Promise<DebuggerDialableRoleServerView> {
	const freeCardId = textOrNull(def.freeCardId);
	let blockedReason: string | null = null;
	if (def.isNarrativeOnly === true) {
		blockedReason = "叙事角色不能直接拨号";
	} else if (def.dialable !== true) {
		blockedReason = "角色未开放拨号";
	} else if (!freeCardId) {
		blockedReason = "未绑定 free card";
	} else if (!(await hasFreeCard(freeCardId))) {
		blockedReason = "free card 文件缺失";
	}
	return {
		agentId: def.agentId,
		displayName: displayNameOf(def),
		phoneNumber: phoneNumberOf(def),
		canFreeCall: blockedReason === null,
		freeCardId,
		blockedReason,
	};
}

/** 读取角色目录并生成调试器待机角色列表 */
export async function listDebuggerDialableRoles(): Promise<
	DebuggerDialableRoleServerView[]
> {
	const ids = await listCharacterAgentIds();
	const roles: DebuggerDialableRoleServerView[] = [];
	for (const agentId of ids) {
		const parsed = CharacterDefSchema.safeParse(await readCharacterJson(agentId));
		if (!parsed.success) {
			throw Object.assign(new Error(formatZodError(parsed.error)), {
				code: "VALIDATION_FAILED",
				status: 400,
			});
		}
		roles.push(await projectDebuggerDialableRole(parsed.data, freeCardExists));
	}
	return roles;
}
