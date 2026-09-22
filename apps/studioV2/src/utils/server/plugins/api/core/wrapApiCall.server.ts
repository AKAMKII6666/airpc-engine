/**
	* 能力 API 调用包装：日志 + 路径泄漏守卫。
	*/
import { emitPluginLog } from "@studio-v2/src/utils/server/plugins/log/pluginLog.server";

export function assertNoPathLeak(value: unknown): void {
	const text = JSON.stringify(value) ?? "";
	if (
		text.includes("storis-packages") ||
		text.includes(".sqlite") ||
		/\/Users\//.test(text) ||
		text.includes("\\\\data\\\\")
	) {
		throw new Error("plugin capability API must not expose storage paths");
	}
}

export type WrapApiCall = <T>(
	pluginId: string,
	method: string,
	fn: () => Promise<T>,
) => Promise<T>;

export function createWrapApiCall(): WrapApiCall {
	return async function wrapApiCall(pluginId, method, fn) {
		try {
			const result = await fn();
			assertNoPathLeak(result);
			emitPluginLog({
				type: "plugin.api_call",
				pluginId,
				method,
				ok: true,
			});
			return result;
		} catch (err) {
			emitPluginLog({
				type: "plugin.api_call",
				pluginId,
				method,
				ok: false,
			});
			throw err;
		}
	};
}
