/**
	* 模块名称：本机 Workspace 快照读盘
	* 模块说明：自引擎 loadWorkspaceState fs 扫描迁出；不预读故事卡正文。
	* 协议：技术设计 23 §4.3 loadWorkspaceSnapshot。
	*/
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import {
	CallCardDefinitionSchema,
	ChapterConfSchema,
	CharacterDefSchema,
	PackageConfSchema,
	engineError,
	type CallCardDefinition,
	type CharacterDef,
	type ChapterConf,
	type PackageConf,
	type WorkspaceSnapshot,
} from "@airpc/rpg-engine";
import {
	ensureFlatPackageMigrated,
	listChapterIds,
} from "../migrate/packageMigrate";

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

async function loadChapterEntry(
	pkgDir: string,
	chapterId: string,
): Promise<WorkspaceSnapshot["packages"][0]["chapters"][0] | null> {
	const chapterDir = path.join(pkgDir, "chapters", chapterId);
	const confPath = path.join(chapterDir, "story.conf.json");
	let confRaw: unknown;
	try {
		confRaw = await readJsonFile(confPath);
	} catch {
		return null;
	}
	const conf = parseOrValidationFailed(`chapter ${chapterId}`, () =>
		ChapterConfSchema.parse(confRaw),
	);
	if (conf.schemaVersion !== SUPPORTED_SCHEMA) {
		throw engineError(
			"SCHEMA_UNSUPPORTED",
			`chapter ${conf.chapterId} schemaVersion unsupported`,
		);
	}
	return {
		chapterId: conf.chapterId,
		conf,
		chapterLocator: chapterDir,
	};
}

async function loadPackageContainer(
	pkgDir: string,
	dirName: string,
): Promise<WorkspaceSnapshot["packages"][0] | null> {
	await ensureFlatPackageMigrated(pkgDir, dirName);

	let packageConf: PackageConf | undefined;
	const packageConfPath = path.join(pkgDir, "package.conf.json");
	try {
		const raw = await readJsonFile(packageConfPath);
		packageConf = parseOrValidationFailed("package.conf", () =>
			PackageConfSchema.parse(raw),
		);
	} catch {
		packageConf = undefined;
	}

	const chapterIds = packageConf
		? packageConf.chapters.map((c) => c.chapterId)
		: await listChapterIds(pkgDir);

	const chapters: WorkspaceSnapshot["packages"][0]["chapters"] = [];
	for (const chapterId of chapterIds) {
		const entry = await loadChapterEntry(pkgDir, chapterId);
		if (entry) {
			chapters.push(entry);
		}
	}
	if (chapters.length === 0) {
		return null;
	}

	return {
		packageId: packageConf?.packageId ?? dirName,
		packageConf,
		chapters,
	};
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
		const container = await loadPackageContainer(dir, name);
		if (container) {
			packages.push(container);
		}
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

export async function findChapterDir(
	workspaceKey: string,
	chapterId: string,
): Promise<{ dir: string; conf: ChapterConf; containerPackageId: string } | null> {
	const packages = await loadPackages(workspaceKey);
	for (const pkg of packages) {
		const hit = pkg.chapters.find((c) => c.chapterId === chapterId);
		if (hit?.chapterLocator) {
			return {
				dir: hit.chapterLocator,
				conf: hit.conf,
				containerPackageId: pkg.packageId,
			};
		}
	}
	return null;
}
