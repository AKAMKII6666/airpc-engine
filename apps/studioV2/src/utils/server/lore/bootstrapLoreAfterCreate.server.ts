/**
	* 新建用户后自动 bootstrap lore；失败不挡创建，只返回人话提示。
	*/
import { isEngineError } from "@airpc/rpg-engine";
import type { User } from "@airpc/rpg-engine";
import { getStudioV2EngineHost } from "@studio-v2/src/utils/server/host/engineHost.server";

/**
	* 有 location 时 ensureProfile + bootstrapLore；返回可选 loreWarning。
	*/
export async function bootstrapLoreAfterCreateUser(
	user: User,
): Promise<string | undefined> {
	if (!user.location) return undefined;
	try {
		const host = await getStudioV2EngineHost();
		await host.ensureProfile(user.userId);
		const boot = await host.bootstrapLore(user.userId);
		if (isEngineError(boot)) {
			return boot.message;
		}
		if (boot.usedFallback) {
			return boot.errorMessage
				? `世界背景已用降级模板：${boot.errorMessage}`
				: "世界背景已用降级模板（未配置 LLM 或调用失败）";
		}
		return undefined;
	} catch (err) {
		return err instanceof Error ? err.message : "世界背景生成跳过";
	}
}
