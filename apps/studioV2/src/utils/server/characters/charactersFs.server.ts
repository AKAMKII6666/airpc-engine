/**
	* 角色目录读写（Content）：data/characters/<agentId>.json。
	* 仅 Next API 门面调用；禁止 client 直引。
	*/
import {
	access,
	mkdir,
	readdir,
	readFile,
	unlink,
	writeFile,
} from "node:fs/promises";
import path from "node:path";
import { getStudioV2DataRoot } from "../data/dataRoot.server";

const AGENT_ID_RE = /^[a-z][a-z0-9_-]{0,63}$/;

export function isValidAgentId(agentId: string): boolean {
	return AGENT_ID_RE.test(agentId);
}

function charactersRoot(): string {
	return path.join(getStudioV2DataRoot(), "characters");
}

function characterPath(agentId: string): string {
	return path.join(charactersRoot(), `${agentId}.json`);
}

async function pathExists(p: string): Promise<boolean> {
	try {
		await access(p);
		return true;
	} catch {
		return false;
	}
}

/**
	* 列出角色 JSON 文件名对应的 agentId（跳过子目录与破损文件）。
	*/
export async function listCharacterAgentIds(): Promise<string[]> {
	const root = charactersRoot();
	const names = await readdir(root);
	const out: string[] = [];
	for (const name of names) {
		if (!name.endsWith(".json")) continue;
		const agentId = name.slice(0, -".json".length);
		if (!isValidAgentId(agentId)) continue;
		out.push(agentId);
	}
	return out.sort(function (a, b) {
		return a.localeCompare(b);
	});
}

export async function readCharacterJson(agentId: string): Promise<unknown> {
	if (!isValidAgentId(agentId)) {
		throw Object.assign(new Error("invalid agentId"), {
			code: "VALIDATION_FAILED",
		});
	}
	try {
		return JSON.parse(await readFile(characterPath(agentId), "utf8"));
	} catch {
		throw Object.assign(new Error(`character not found: ${agentId}`), {
			code: "NOT_FOUND",
		});
	}
}

export async function writeCharacterJson(
	agentId: string,
	def: unknown,
): Promise<void> {
	if (!isValidAgentId(agentId)) {
		throw Object.assign(new Error("invalid agentId"), {
			code: "VALIDATION_FAILED",
		});
	}
	await mkdir(charactersRoot(), { recursive: true });
	const text = JSON.stringify(def, null, 2) + "\n";
	await writeFile(characterPath(agentId), text, "utf8");
}

export async function characterExists(agentId: string): Promise<boolean> {
	if (!isValidAgentId(agentId)) return false;
	return pathExists(characterPath(agentId));
}

export async function deleteCharacterJson(agentId: string): Promise<void> {
	if (!isValidAgentId(agentId)) {
		throw Object.assign(new Error("invalid agentId"), {
			code: "VALIDATION_FAILED",
		});
	}
	if (!(await pathExists(characterPath(agentId)))) {
		throw Object.assign(new Error(`character not found: ${agentId}`), {
			code: "NOT_FOUND",
		});
	}
	await unlink(characterPath(agentId));
}
