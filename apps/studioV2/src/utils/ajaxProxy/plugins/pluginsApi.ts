/**
	* 插件面板 / 状态 ajaxProxy（Client 唯一网络入口）。
	*/
import type {
	PluginPanelsResponse,
	PluginStatusResponse,
} from "@studio-v2/typeFiles/plugins/pluginPanels";

async function readJson<T>(response: Response): Promise<T> {
	if (!response.ok) {
		const body = (await response.json().catch(function () {
			return {};
		})) as { message?: string };
		throw new Error(body.message ?? `HTTP ${response.status}`);
	}
	return (await response.json()) as T;
}

export async function fetchPluginPanels(slot?: string): Promise<PluginPanelsResponse> {
	const qs = slot ? `?slot=${encodeURIComponent(slot)}` : "";
	const response = await fetch(`/api/plugins/panels${qs}`, {
		method: "GET",
		headers: { Accept: "application/json" },
	});
	return readJson(response);
}

export async function fetchPluginStatus(): Promise<PluginStatusResponse> {
	const response = await fetch("/api/plugins/status", {
		method: "GET",
		headers: { Accept: "application/json" },
	});
	return readJson(response);
}
