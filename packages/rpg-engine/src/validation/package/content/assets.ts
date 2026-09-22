/**
 * 模块名称：validatePackage 资产引用规则
 * 模块说明：从 validatePackage 拆出以降复杂度基线；读盘经 ContentPort。
 */
import type { ContentPort } from "../../../ports/persist/contentPort.js";
import {
	PLAYBACK_ASSET_KINDS,
	type AssetMeta,
} from "../../../schema/identity/asset.js";
import type { ValidationIssue } from "../../types.js";

function push(list: ValidationIssue[], issue: ValidationIssue): void {
	list.push(issue);
}

function isEscapingAssetUri(uriRel: string): boolean {
	return (
		uriRel.includes("..") ||
		uriRel.startsWith("/") ||
		uriRel.startsWith("~")
	);
}

async function pushAssetUriMissingIfNeeded(input: {
	content: ContentPort;
	workspaceKey: string;
	assetId: string;
	issuePath: string;
	uri: string;
	errors: ValidationIssue[];
}): Promise<void> {
	if (!input.content.assetUriExists) return;
	const uriOk = await input.content.assetUriExists({
		workspaceKey: input.workspaceKey,
		uri: input.uri,
	});
	if (uriOk) return;
	push(input.errors, {
		ruleId: "ASSET_URI_MISSING",
		level: "error",
		path: input.issuePath,
		message: `asset file missing for ${input.assetId}: ${input.uri}`,
	});
}

/** ASSET_*：meta 存在性 / uri 在位 / playback kind */
export async function validateAssetRef(
	content: ContentPort,
	workspaceKey: string,
	assetId: string,
	issuePath: string,
	errors: ValidationIssue[],
	warnings: ValidationIssue[],
	opts: { checkKindForPlayback: boolean },
): Promise<void> {
	const metaPath = `assets/meta/${assetId}.json`;
	const exists = await content.assetMetaExists({ workspaceKey, assetId });
	if (!exists) {
		push(errors, {
			ruleId: "ASSET_UNKNOWN",
			level: "error",
			path: issuePath,
			message: `unknown assetId: ${assetId}`,
		});
		return;
	}
	const meta: AssetMeta | null = await content.readAssetMeta({
		workspaceKey,
		assetId,
	});
	if (!meta) {
		push(errors, {
			ruleId: "ASSET_UNKNOWN",
			level: "error",
			path: issuePath,
			message: `invalid AssetMeta for assetId: ${assetId}`,
		});
		return;
	}
	const uriRel = meta.uri.replace(/^\.?\//, "");
	if (isEscapingAssetUri(uriRel)) {
		push(errors, {
			ruleId: "ASSET_URI_MISSING",
			level: "error",
			path: `${metaPath}#uri`,
			message: `asset uri escapes assets root: ${meta.uri}`,
		});
		return;
	}
	await pushAssetUriMissingIfNeeded({
		content,
		workspaceKey,
		assetId,
		issuePath,
		uri: meta.uri,
		errors,
	});
	if (opts.checkKindForPlayback && !PLAYBACK_ASSET_KINDS.has(meta.kind)) {
		push(warnings, {
			ruleId: "ASSET_KIND_MISMATCH",
			level: "warning",
			path: issuePath,
			message: `playback/system clip ${assetId} has kind ${meta.kind}`,
		});
	}
}
