/**
	* 章 bundle 写盘 + validatePackage 闸门：error 阻断并回滚。
	*/
import {
	CallCardDefinitionSchema,
	hasBlockingErrors,
	type CallCardDefinition,
	type ValidationReport,
} from "@airpc/rpg-engine";
import type {
	DiskChapterBundle,
	StudioCanvasLayout,
} from "@studio-v2/src/utils/server/types/diskStoryPackage.server";
import { validateStoryChapterOnDisk } from "../../validate/validateStoryPackage.server";
import {
	chapterExists,
	readDiskChapterBundle,
	readDiskPackageConf,
	writeDiskChapterBundle,
} from "../package/packagesFs.server";
import { rematerializeDuplicateEffectIds } from "../package/rematerializeDuplicateEffectIds.server";

export type WriteValidatedChapterInput = {
	conf: unknown;
	cards: unknown[];
	layout?: unknown | null;
};

/** @deprecated 别名 */
export type WriteValidatedPackageInput = WriteValidatedChapterInput;

function tryRematerializeBundle(
	bundle: WriteValidatedChapterInput,
): WriteValidatedChapterInput {
	const cards: CallCardDefinition[] = [];
	for (const raw of bundle.cards) {
		const parsed = CallCardDefinitionSchema.safeParse(raw);
		if (!parsed.success) {
			return bundle;
		}
		cards.push(parsed.data);
	}
	const layout =
		bundle.layout && typeof bundle.layout === "object"
			? (bundle.layout as StudioCanvasLayout)
			: null;
	const next = rematerializeDuplicateEffectIds({ cards, layout });
	return {
		conf: bundle.conf,
		cards: next.cards,
		layout: next.layout ?? bundle.layout,
	};
}

export type WriteValidatedChapterOk = {
	ok: true;
	bundle: DiskChapterBundle;
	report: ValidationReport;
};

export type WriteValidatedChapterFail = {
	ok: false;
	report: ValidationReport;
	restored: boolean;
};

/** @deprecated 别名 */
export type WriteValidatedPackageOk = WriteValidatedChapterOk;
/** @deprecated 别名 */
export type WriteValidatedPackageFail = WriteValidatedChapterFail;

/**
	* 写单章并 validate；blocking error 回滚。
	*/
export async function writeValidatedDiskChapterBundle(
	packageId: string,
	chapterId: string,
	bundle: WriteValidatedChapterInput,
): Promise<WriteValidatedChapterOk | WriteValidatedChapterFail> {
	let previous: DiskChapterBundle | null = null;
	if (await chapterExists(packageId, chapterId)) {
		previous = await readDiskChapterBundle(packageId, chapterId);
	}

	const prepared = tryRematerializeBundle(bundle);
	const written = await writeDiskChapterBundle(packageId, chapterId, prepared);
	const confObj = written.conf;
	const report = await validateStoryChapterOnDisk(confObj.chapterId!);

	if (hasBlockingErrors(report)) {
		if (previous) {
			await writeDiskChapterBundle(packageId, chapterId, {
				conf: previous.conf,
				cards: previous.cards,
				layout: previous.layout,
			});
		}
		return { ok: false, report, restored: previous !== null };
	}

	return { ok: true, bundle: written, report };
}

/** 兼容旧名：写入口章 */
export async function writeValidatedDiskStoryPackage(
	packageId: string,
	bundle: WriteValidatedChapterInput,
): Promise<WriteValidatedChapterOk | WriteValidatedChapterFail> {
	const confObj = bundle.conf as { chapterId?: string; packageId?: string };
	let chapterId = confObj.chapterId ?? confObj.packageId;
	if (!chapterId) {
		const packageConf = await readDiskPackageConf(packageId);
		chapterId = packageConf.entryChapterId;
	}
	return writeValidatedDiskChapterBundle(packageId, chapterId, bundle);
}
