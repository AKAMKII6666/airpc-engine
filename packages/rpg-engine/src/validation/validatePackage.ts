/**
 * 模块名称：validatePackage（08 error／warning 主路径；E3 含 ASSET_URI_MISSING）
 * 模块说明：校验规则留引擎；读盘只经 ContentPort（技术设计 23 §7）。
 * 卡片 / 资产 / 调度子规则已拆到同目录模块，避免触碰基线净增。
 */
import { FREE_PACKAGE_ID } from "../constants.js";
import type { ContentPort, PackageValidateBundle } from "../ports/contentPort.js";
import type { CharacterDef } from "../schema/character.js";
import type { ValidationIssue, ValidationReport } from "./types.js";
import { validateReferencedAgents } from "./validateReferencedAgents.js";
import { validateAssetRef } from "./package/assets.js";
import { validatePackageCards } from "./package/cards.js";
export { VALIDATE_PACKAGE_ERROR_COVERAGE } from "./errorCoverage.js";

const SUPPORTED_SCHEMA = 1;

function push(list: ValidationIssue[], issue: ValidationIssue): void {
	list.push(issue);
}

/**
 * validate 入口：Host / Server 先经 ContentPort.loadPackageForValidate，再交本函数。
 * 禁止本文件 import node:fs。
 */
export interface ValidatePackageInput {
	bundle: PackageValidateBundle;
	/** 逻辑工作区键；转交 ContentPort 按需读卡 / 资产探测 */
	workspaceKey: string;
	content: ContentPort;
	/**
	 * 可选覆盖角色表（Host 已加载的 Map）。缺省用 bundle.characters。
	 */
	characters?: Map<string, CharacterDef>;
}

function charactersMapFromBundle(
	bundle: PackageValidateBundle,
): Map<string, CharacterDef> {
	const map = new Map<string, CharacterDef>();
	for (const def of bundle.characters) {
		map.set(def.agentId, def);
	}
	return map;
}

export async function validatePackage(
	input: ValidatePackageInput,
): Promise<ValidationReport> {
	const errors: ValidationIssue[] = [];
	const warnings: ValidationIssue[] = [];
	const { bundle, workspaceKey, content } = input;
	const packageId = bundle.packageId;
	const characters =
		input.characters ?? charactersMapFromBundle(bundle);
	const confPath = `storis-packages/${packageId}/story.conf.json`;

	if (packageId === FREE_PACKAGE_ID) {
		push(errors, {
			ruleId: "FREE_PACKAGE_SENTINEL",
			level: "error",
			path: `storis-packages/${packageId}`,
			message: "cannot validate __free__ sentinel as story package",
		});
		return { packageId, errors, warnings };
	}

	if (!validateConfOrReturn(bundle, confPath, errors, warnings)) {
		return { packageId, errors, warnings };
	}
	const conf = bundle.conf!;

	if (conf.schemaVersion !== SUPPORTED_SCHEMA) {
		push(errors, {
			ruleId: "SCHEMA_UNSUPPORTED",
			level: "error",
			path: confPath,
			message: `schemaVersion ${conf.schemaVersion} unsupported`,
		});
	}

	if (conf.entryCardId) {
		const inIndex = conf.cards.some((c) => c.cardId === conf.entryCardId);
		if (!inIndex) {
			push(errors, {
				ruleId: "ENTRY_CARD_UNKNOWN",
				level: "error",
				path: `${confPath}#entryCardId`,
				message: `entryCardId ${conf.entryCardId} not in cards[]`,
			});
		}
	}

	if (Array.isArray(conf.assetRefs)) {
		for (const assetId of conf.assetRefs) {
			await validateAssetRef(
				content,
				workspaceKey,
				assetId,
				`${confPath}#assetRefs`,
				errors,
				warnings,
				{ checkKindForPlayback: false },
			);
		}
	}

	pushCardIndexIssues(conf.cards, bundle.diskCardIds ?? [], errors, warnings);

	const cardsById = new Map(
		bundle.cards.map((entry) => [entry.cardId, entry]),
	);
	const parsedCards = await validatePackageCards({
		cardRefs: conf.cards,
		cardsById,
		content,
		workspaceKey,
		characters,
		errors,
		warnings,
	});

	await validateReferencedAgents({
		conf,
		parsedCards,
		confPath,
		characters,
		content,
		workspaceKey,
		errors,
		warnings,
	});

	return { packageId, errors, warnings };
}

/**
 * conf 缺失 / schema 失败时写入 errors 并返回 false；成功返回 true（conf 已非空）。
 */
function validateConfOrReturn(
	bundle: PackageValidateBundle,
	confPath: string,
	errors: ValidationIssue[],
	warnings: ValidationIssue[],
): boolean {
	const confRaw = bundle.confRaw ?? null;
	if (confRaw === null && bundle.conf === null) {
		push(errors, {
			ruleId: "SCHEMA_UNSUPPORTED",
			level: "error",
			path: confPath,
			message: "story.conf.json missing or unreadable",
		});
		return false;
	}

	if (
		typeof confRaw === "object" &&
		confRaw !== null &&
		Array.isArray((confRaw as { assets?: unknown }).assets)
	) {
		push(warnings, {
			ruleId: "ASSET_PACKAGE_INLINE",
			level: "warning",
			path: `${confPath}#assets`,
			message: "package inline assets[] is deprecated; use global data/assets/",
		});
	}

	if (!bundle.conf) {
		push(errors, {
			ruleId: "SCHEMA_UNSUPPORTED",
			level: "error",
			path: confPath,
			message: "story.conf.json schema invalid",
		});
		return false;
	}
	return true;
}

function pushCardIndexIssues(
	confCards: Array<{ cardId: string }>,
	diskCardIdsList: string[],
	errors: ValidationIssue[],
	warnings: ValidationIssue[],
): void {
	const diskCardIds = new Set(diskCardIdsList);
	const indexedIds = new Set(confCards.map((c) => c.cardId));

	for (const cardRef of confCards) {
		if (!diskCardIds.has(cardRef.cardId)) {
			push(errors, {
				ruleId: "CONF_CARD_FILE_MISSING",
				level: "error",
				path: `cards/${cardRef.cardId}.s-card.json`,
				message: `card file missing for ${cardRef.cardId}`,
			});
		}
	}

	for (const diskId of diskCardIds) {
		if (!indexedIds.has(diskId)) {
			push(warnings, {
				ruleId: "CARD_FILE_ORPHAN",
				level: "warning",
				path: `cards/${diskId}.s-card.json`,
				message: `orphan card file not in conf.cards[]`,
			});
		}
	}
}
