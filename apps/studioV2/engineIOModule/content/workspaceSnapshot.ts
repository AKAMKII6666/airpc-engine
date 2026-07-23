/**
	* 模块名称：本机 Workspace 快照读盘
	* 模块说明：自引擎 loadWorkspaceState fs 扫描迁出；不预读故事卡正文。
	* 协议：技术设计 23 §4.3 loadWorkspaceSnapshot。
	*/
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import {
	CallCardDefinitionSchema,
	CharacterDefSchema,
	StoryPackageConfSchema,
	engineError,
	type CallCardDefinition,
	type CharacterDef,
	type StoryPackageConf,
	type WorkspaceSnapshot,
} from "@airpc/rpg-engine";

const SUPPORTED_SCHEMA = 1;

async function readJsonFile(filePath: string): Promise<unknown> {
	const text = await readFile(filePath, "utf8");
	return JSON.parse(text) as unknown;
}

function parseOrValidationFailed<T>(
	label: string,
	parse: () => T,
): T {
	try {
		return parse();
	} catch (err) {
		throw engineError("VALIDATION_FAILED", `${label} parse failed`, err);
	}
}

async function loadPackages(
	rootDir: string,
): Promise<WorkspaceSnapshot["packages"]> {
	const packagesRoot = path.join(rootDir, "storis-packages");
	let entries: string[] = [];
	try {
		entries = await readdir(packagesRoot);
	} catch {
		entries = [];
	}
	const packages: WorkspaceSnapshot["packages"] = [];
	for (const name of entries) {
		const dir = path.join(packagesRoot, name);
		const confPath = path.join(dir, "story.conf.json");
		let confRaw: unknown;
		try {
			confRaw = await readJsonFile(confPath);
		} catch {
			continue;
		}
		const conf = parseOrValidationFailed("story.conf", () =>
			StoryPackageConfSchema.parse(confRaw),
		);
		if (conf.schemaVersion !== SUPPORTED_SCHEMA) {
			throw engineError(
				"SCHEMA_UNSUPPORTED",
				`package ${conf.packageId} schemaVersion unsupported`,
			);
		}
		packages.push({
			packageId: conf.packageId,
			conf,
			packageLocator: dir,
		});
	}
	return packages;
}

async function loadCharacters(rootDir: string): Promise<CharacterDef[]> {
	const charactersRoot = path.join(rootDir, "characters");
	let charFiles: string[] = [];
	try {
		charFiles = await readdir(charactersRoot);
	} catch {
		charFiles = [];
	}
	const characters: CharacterDef[] = [];
	for (const name of charFiles) {
		if (!name.endsWith(".json")) continue;
		const raw = await readJsonFile(path.join(charactersRoot, name));
		characters.push(
			parseOrValidationFailed(`character ${name}`, () =>
				CharacterDefSchema.parse(raw),
			),
		);
	}
	return characters;
}

async function loadSideCards(
	dir: string,
): Promise<CallCardDefinition[]> {
	let files: string[] = [];
	try {
		files = await readdir(dir);
	} catch {
		files = [];
	}
	const cards: CallCardDefinition[] = [];
	for (const name of files) {
		if (!name.endsWith(".s-card.json") && !name.endsWith(".json")) continue;
		const raw = await readJsonFile(path.join(dir, name));
		cards.push(
			parseOrValidationFailed(`card ${name}`, () =>
				CallCardDefinitionSchema.parse(raw),
			),
		);
	}
	return cards;
}

/**
	* 加载工作区索引（packages conf + 角色 + free/schedule 卡；不含故事卡正文）。
	*/
export async function loadWorkspaceSnapshotFromFs(
	workspaceKey: string,
): Promise<WorkspaceSnapshot> {
	const rootDir = workspaceKey;
	const workspacePath = path.join(rootDir, "workspace.json");
	let raw: { schemaVersion?: number };
	try {
		raw = (await readJsonFile(workspacePath)) as {
			schemaVersion?: number;
		};
	} catch (err) {
		throw engineError(
			"ENGINE_INTERNAL",
			`workspace.json unreadable: ${workspacePath}`,
			{ reason: "IO_FAILED", cause: err },
		);
	}
	if (raw.schemaVersion !== SUPPORTED_SCHEMA) {
		throw engineError(
			"SCHEMA_UNSUPPORTED",
			`workspace schemaVersion ${String(raw.schemaVersion)} unsupported`,
		);
	}

	const charactersRoot = path.join(rootDir, "characters");
	const [packages, characters, freeCards, scheduleCards] = await Promise.all([
		loadPackages(rootDir),
		loadCharacters(rootDir),
		loadSideCards(path.join(charactersRoot, "free-cards")),
		loadSideCards(path.join(charactersRoot, "schedule-cards")),
	]);

	return {
		workspaceKey: rootDir,
		packages,
		characters,
		freeCards,
		scheduleCards,
	};
}

/** 供 readPackageConf / validate 复用：按 packageId 找包目录。 */
export async function findPackageDir(
	workspaceKey: string,
	packageId: string,
): Promise<{ dir: string; conf: StoryPackageConf } | null> {
	const packages = await loadPackages(workspaceKey);
	const hit = packages.find((p) => p.packageId === packageId);
	if (!hit?.packageLocator) {
		return null;
	}
	return { dir: hit.packageLocator, conf: hit.conf };
}
