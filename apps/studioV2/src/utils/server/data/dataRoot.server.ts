/**
	* Studio V2 data 根路径解析（仅 Next route / server 模块引用）。
	* 与旧 Studio 同口径：优先含 workspace.json 的 data/。
	*/
import { existsSync } from "node:fs";
import path from "node:path";

/**
	* 解析仓库 data/ 根；找不到 workspace.json 时抛错，避免静默写错盘。
	*/
export function getStudioV2DataRoot(): string {
	const candidates = [
		path.resolve(process.cwd(), "data"),
		path.resolve(process.cwd(), "../../data"),
		path.resolve(process.cwd(), "../data"),
	];
	for (const candidate of candidates) {
		if (existsSync(path.join(candidate, "workspace.json"))) {
			return candidate;
		}
	}
	throw new Error(
		"data/ workspace.json not found (cwd=" + process.cwd() + ")",
	);
}
