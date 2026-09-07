/**
	* 工作区 plugins/ 根路径（与 data/ 并列；禁引擎扫盘）。
	* 协议：技术设计 25 §3 / §7。
	*/
import { existsSync } from "node:fs";
import path from "node:path";
import { getStudioV2DataRoot } from "@studio-v2/src/utils/server/data/dataRoot.server";

/**
	* 解析 plugins 根；优先 data 同级目录，其次 cwd/plugins。
	*/
export function getStudioV2PluginsRoot(): string {
	const dataRoot = getStudioV2DataRoot();
	const sibling = path.resolve(dataRoot, "..", "plugins");
	if (existsSync(sibling) || existsSync(path.dirname(sibling))) {
		return sibling;
	}
	return path.resolve(process.cwd(), "plugins");
}

/** 测试/夹具可覆写根目录 */
let pluginsRootOverride: string | null = null;

export function setStudioV2PluginsRootForTests(root: string | null): void {
	pluginsRootOverride = root;
}

export function resolvePluginsRoot(): string {
	return pluginsRootOverride ?? getStudioV2PluginsRoot();
}
