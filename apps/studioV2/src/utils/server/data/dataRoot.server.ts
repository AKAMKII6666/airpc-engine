/**
	* Studio V2 data 根路径解析（仅 Next route / server 模块引用）。
	* 与旧 Studio 同口径：优先含 workspace.json 的 data/。
	*/
import { existsSync } from "node:fs";
import path from "node:path";

const DATA_ROOT_ENV = "AIRPC_STUDIO_DATA_ROOT";
const E2E_MARKER = ".airpc-e2e-workspace";

function assertE2EWorkspaceDataRoot(candidate: string): void {
	if (process.env.AIRPC_E2E !== "1") return;
	if (!process.env[DATA_ROOT_ENV]?.trim()) {
		throw new Error(`${DATA_ROOT_ENV} is required when AIRPC_E2E=1`);
	}
	const marker = path.join(path.dirname(candidate), E2E_MARKER);
	if (!existsSync(marker)) {
		throw new Error(`AIRPC_E2E workspace marker not found: ${marker}`);
	}
}

function assertWorkspaceDataRoot(candidate: string, source: string): string {
	if (!path.isAbsolute(candidate)) {
		throw new Error(`${source} must be an absolute path: ${candidate}`);
	}
	const normalized = path.normalize(candidate);
	if (!existsSync(path.join(normalized, "workspace.json"))) {
		throw new Error(`${source} does not contain workspace.json: ${normalized}`);
	}
	assertE2EWorkspaceDataRoot(normalized);
	return normalized;
}

/**
	* 解析仓库 data/ 根；找不到 workspace.json 时抛错，避免静默写错盘。
	*/
export function getStudioV2DataRoot(): string {
	const configured = process.env[DATA_ROOT_ENV]?.trim();
	if (configured) {
		return assertWorkspaceDataRoot(configured, DATA_ROOT_ENV);
	}
	const candidates = [
		path.resolve(process.cwd(), "data"),
		path.resolve(process.cwd(), "../../data"),
		path.resolve(process.cwd(), "../data"),
	];
	for (const candidate of candidates) {
		if (existsSync(path.join(candidate, "workspace.json"))) {
			return path.normalize(candidate);
		}
	}
	throw new Error(
		"data/ workspace.json not found (cwd=" + process.cwd() + ")",
	);
}
