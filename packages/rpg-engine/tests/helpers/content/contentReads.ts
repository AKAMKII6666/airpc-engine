/**
 * 模块名称：测试用 Content 按需读（镜像 engineIOModule/content）
 */
import { access, readdir, readFile } from "node:fs/promises";
import path from "node:path";
import {
	AssetMetaSchema,
	CallCardDefinitionSchema,
	CharacterDefSchema,
	FREE_PACKAGE_ID,
	SCHEDULE_PACKAGE_ID,
	StoryPackageConfSchema,
	engineError,
	type AssetMeta,
	type CallCardDefinition,
	type CharacterDef,
	type PackageValidateBundle,
	type StoryPackageConf,
} from "../../../src/index.js";
// 引用了包目录解析，用于按 packageId 定位磁盘路径
import { findPackageDir } from "./workspaceSnapshot.js";

async function readJsonFile(filePath: string): Promise<unknown> {
	const text = await readFile(filePath, "utf8");
	return JSON.parse(text) as unknown;
}

function parseCardOrThrow(raw: unknown, label: string): CallCardDefinition {
	try {
		return CallCardDefinitionSchema.parse(raw);
	} catch (err) {
		throw engineError("VALIDATION_FAILED", `${label} parse failed`, err);
	}
}

/**
	* 按需读单卡。__free__/__schedule__ 从角色侧目录读；故事包从 cards/。
	* 不存在 → null；损坏 → VALIDATION_FAILED。
	*/
export async function readCardFromFs(input: {
	workspaceKey: string;
	packageId: string;
	cardId: string;
}): Promise<CallCardDefinition | null> {
	const { workspaceKey, packageId, cardId } = input;
	if (packageId === FREE_PACKAGE_ID) {
		return readSideCard(workspaceKey, "free-cards", cardId);
	}
	if (packageId === SCHEDULE_PACKAGE_ID) {
		return readSideCard(workspaceKey, "schedule-cards", cardId);
	}
	const found = await findPackageDir(workspaceKey, packageId);
	if (!found) {
		return null;
	}
	const cardPath = path.join(found.dir, "cards", `${cardId}.s-card.json`);
	try {
		const raw = await readJsonFile(cardPath);
		return parseCardOrThrow(raw, `card ${packageId}/${cardId}`);
	} catch (err) {
		if (
			typeof err === "object" &&
			err !== null &&
			"code" in err &&
			(err as { code?: string }).code === "VALIDATION_FAILED"
		) {
			throw err;
		}
		return null;
	}
}

async function readSideCard(
	workspaceKey: string,
	subdir: "free-cards" | "schedule-cards",
	cardId: string,
): Promise<CallCardDefinition | null> {
	const dir = path.join(workspaceKey, "characters", subdir);
	const candidates = [
		path.join(dir, `${cardId}.s-card.json`),
		path.join(dir, `${cardId}.json`),
	];
	for (const cardPath of candidates) {
		try {
			const raw = await readJsonFile(cardPath);
			return parseCardOrThrow(raw, `${subdir}/${cardId}`);
		} catch (err) {
			if (
				typeof err === "object" &&
				err !== null &&
				"code" in err &&
				(err as { code?: string }).code === "VALIDATION_FAILED"
			) {
				throw err;
			}
			// 试下一候选路径
		}
	}
	return null;
}

export async function readPackageConfFromFs(input: {
	workspaceKey: string;
	packageId: string;
}): Promise<StoryPackageConf | null> {
	const found = await findPackageDir(input.workspaceKey, input.packageId);
	return found?.conf ?? null;
}

function assetMetaPath(workspaceKey: string, assetId: string): string {
	return path.join(workspaceKey, "assets", "meta", `${assetId}.json`);
}

export async function assetMetaExistsFromFs(input: {
	workspaceKey: string;
	assetId: string;
}): Promise<boolean> {
	try {
		await access(assetMetaPath(input.workspaceKey, input.assetId));
		return true;
	} catch {
		return false;
	}
}

export async function readAssetMetaFromFs(input: {
	workspaceKey: string;
	assetId: string;
}): Promise<AssetMeta | null> {
	try {
		const raw = await readJsonFile(
			assetMetaPath(input.workspaceKey, input.assetId),
		);
		const parsed = AssetMetaSchema.safeParse(raw);
		return parsed.success ? parsed.data : null;
	} catch {
		return null;
	}
}

/**
	* 可选：探测 assets 下 uri 是否在位（对应 ASSET_URI_MISSING）。
	*/
export async function assetUriExistsFromFs(input: {
	workspaceKey: string;
	uri: string;
}): Promise<boolean> {
	const uriRel = input.uri.replace(/^\.?\//, "");
	if (
		uriRel.includes("..") ||
		path.isAbsolute(uriRel) ||
		uriRel.startsWith("~")
	) {
		return false;
	}
	try {
		await access(path.join(input.workspaceKey, "assets", uriRel));
		return true;
	} catch {
		return false;
	}
}

async function loadAllCharacters(
	workspaceKey: string,
): Promise<CharacterDef[]> {
	const charactersRoot = path.join(workspaceKey, "characters");
	let charFiles: string[] = [];
	try {
		charFiles = await readdir(charactersRoot);
	} catch {
		return [];
	}
	const out: CharacterDef[] = [];
	for (const name of charFiles) {
		if (!name.endsWith(".json")) continue;
		try {
			const raw = await readJsonFile(path.join(charactersRoot, name));
			out.push(CharacterDefSchema.parse(raw));
		} catch {
			// validate 规则侧再报；此处跳过坏文件
		}
	}
	return out;
}

/**
	* 校验装包：一次取出 confRaw/conf + 声明卡(含 cardRaw) + diskCardIds + 角色表。
	* 故意不走 findPackageDir：validate 要对坏 conf 返回结构而非抛 SCHEMA（规则在引擎）。
	*/
export async function loadPackageForValidateFromFs(input: {
	workspaceKey: string;
	packageId: string;
}): Promise<PackageValidateBundle> {
	const { workspaceKey, packageId } = input;
	const characters = await loadAllCharacters(workspaceKey);
	const pkgDir = path.join(workspaceKey, "storis-packages", packageId);
	const confPath = path.join(pkgDir, "story.conf.json");

	let confRaw: unknown | null = null;
	try {
		confRaw = await readJsonFile(confPath);
	} catch {
		return {
			packageId,
			conf: null,
			confRaw: null,
			cards: [],
			diskCardIds: [],
			characters,
		};
	}

	const confParsed = StoryPackageConfSchema.safeParse(confRaw);
	const conf = confParsed.success ? confParsed.data : null;

	let diskCardIds: string[] = [];
	try {
		const diskFiles = await readdir(path.join(pkgDir, "cards"));
		diskCardIds = diskFiles
			.filter((f) => f.endsWith(".s-card.json"))
			.map((f) => f.replace(/\.s-card\.json$/, ""));
	} catch {
		diskCardIds = [];
	}

	const cards: PackageValidateBundle["cards"] = [];
	const indexedIds = conf?.cards.map((c) => c.cardId) ?? [];
	for (const cardId of indexedIds) {
		const cardPath = path.join(pkgDir, "cards", `${cardId}.s-card.json`);
		try {
			const cardRaw = await readJsonFile(cardPath);
			const parsed = CallCardDefinitionSchema.safeParse(cardRaw);
			cards.push({
				cardId,
				card: parsed.success ? parsed.data : null,
				cardRaw,
			});
		} catch {
			cards.push({ cardId, card: null, cardRaw: null });
		}
	}

	return {
		packageId,
		conf,
		confRaw,
		cards,
		diskCardIds,
		characters,
	};
}
