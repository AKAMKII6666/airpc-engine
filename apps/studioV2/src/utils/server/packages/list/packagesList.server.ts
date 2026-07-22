/**
	* 扫描 data/storis-packages 下各包 story.conf.json 为列表摘要。
	*/
import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import type { DiskStoryPackageSummary } from "@studio-v2/typeFiles/story/package/diskStoryPackage";
import { isValidPackageId, packagesRoot } from "../paths/packagesPaths.server";

/**
	* 扫描含 story.conf.json 的包目录；破损目录跳过。
	*/
export async function listDiskStoryPackages(): Promise<
	DiskStoryPackageSummary[]
> {
	const root = packagesRoot();
	let names: string[];
	try {
		names = await readdir(root);
	} catch {
		return [];
	}
	const out: DiskStoryPackageSummary[] = [];
	for (const name of names) {
		if (!isValidPackageId(name)) continue;
		const summary = await tryReadPackageSummary(root, name);
		if (summary) out.push(summary);
	}
	return out.sort(function (a, b) {
		return a.packageId.localeCompare(b.packageId);
	});
}

async function tryReadPackageSummary(
	root: string,
	name: string,
): Promise<DiskStoryPackageSummary | null> {
	const confPath = path.join(root, name, "story.conf.json");
	try {
		const raw = JSON.parse(await readFile(confPath, "utf8")) as {
			packageId?: string;
			title?: string;
			schemaVersion?: number;
			cards?: unknown[];
			participants?: unknown[];
			assetRefs?: unknown[];
			entryCardId?: string;
		};
		const packageId =
			typeof raw.packageId === "string" && raw.packageId.length > 0
				? raw.packageId
				: name;
		let lastEditedAt = "";
		try {
			const st = await stat(path.join(root, name));
			lastEditedAt = st.mtime.toISOString();
		} catch {
			lastEditedAt = "";
		}
		return {
			packageId,
			title:
				typeof raw.title === "string" && raw.title.trim() !== ""
					? raw.title
					: packageId,
			schemaVersion:
				typeof raw.schemaVersion === "number" ? raw.schemaVersion : 1,
			cardCount: Array.isArray(raw.cards) ? raw.cards.length : 0,
			characterCount: Array.isArray(raw.participants)
				? raw.participants.length
				: 0,
			assetCount: Array.isArray(raw.assetRefs) ? raw.assetRefs.length : 0,
			entryCardId:
				typeof raw.entryCardId === "string" ? raw.entryCardId : "",
			lastEditedAt,
		};
	} catch {
		return null;
	}
}
