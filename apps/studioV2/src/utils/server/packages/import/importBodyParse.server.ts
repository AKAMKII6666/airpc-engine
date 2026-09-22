/**
	* storypack 导入 body 解析：v2 多章 container 与 legacy 单章 bundle。
	*/
import { isValidPackageId } from "@studio-v2/src/utils/server/packages/paths/packagesPaths.server";

export type ParsedImportBody = {
	packageId: string;
	packageConf: unknown;
	chapters: Array<{
		conf: unknown;
		cards: unknown[];
		layout?: unknown | null;
	}>;
};

function resolvePackageId(
	bodyPackageId: unknown,
	confPackageId: unknown,
	fallback: string,
): string {
	if (typeof bodyPackageId === "string" && bodyPackageId.trim() !== "") {
		return bodyPackageId.trim();
	}
	if (typeof confPackageId === "string" && confPackageId.trim() !== "") {
		return confPackageId.trim();
	}
	return fallback;
}

function parseV2ContainerImport(
	body: Record<string, unknown>,
): ParsedImportBody | null {
	if (!body.packageConf || !Array.isArray(body.chapters)) {
		return null;
	}
	const packageConf = body.packageConf as { packageId?: string };
	const packageId = resolvePackageId(
		body.packageId,
		packageConf.packageId,
		"",
	);
	if (!isValidPackageId(packageId)) return null;
	return {
		packageId,
		packageConf: body.packageConf,
		chapters: body.chapters as ParsedImportBody["chapters"],
	};
}

function legacyChapterId(confObj: {
	packageId?: string;
	chapterId?: string;
}): string {
	return confObj.chapterId ?? confObj.packageId ?? "";
}

function buildLegacyChapterConf(
	bodyConf: object,
	chapterId: string,
	packageId: string,
): object {
	const confForChapter = {
		...bodyConf,
		chapterId: chapterId || packageId,
	};
	delete (confForChapter as { packageId?: string }).packageId;
	return confForChapter;
}

function buildLegacyPackageConf(
	packageId: string,
	chapterId: string,
	legacyTitle: unknown,
): Record<string, unknown> {
	const resolvedChapterId = chapterId || packageId;
	return {
		schemaVersion: 1,
		packageId,
		title: typeof legacyTitle === "string" ? legacyTitle : packageId,
		entryChapterId: resolvedChapterId,
		chapters: [{ chapterId: resolvedChapterId }],
	};
}

function parseLegacyBundleImport(
	body: Record<string, unknown>,
): ParsedImportBody | null {
	if (!body.conf || !Array.isArray(body.cards)) {
		return null;
	}
	const confObj = body.conf as { packageId?: string; chapterId?: string; title?: string };
	const chapterId = legacyChapterId(confObj);
	const packageId = resolvePackageId(
		body.packageId,
		confObj.packageId,
		chapterId,
	);
	if (!isValidPackageId(packageId)) return null;

	return {
		packageId,
		packageConf: buildLegacyPackageConf(packageId, chapterId, confObj.title),
		chapters: [
			{
				conf: buildLegacyChapterConf(
					body.conf as object,
					chapterId,
					packageId,
				),
				cards: body.cards as unknown[],
				layout: body.layout ?? null,
			},
		],
	};
}

/** 解析 v1 单章 legacy 或 v2 多章 storypack body */
export function parseImportBody(
	body: Record<string, unknown>,
): ParsedImportBody | null {
	return (
		parseV2ContainerImport(body) ?? parseLegacyBundleImport(body)
	);
}
