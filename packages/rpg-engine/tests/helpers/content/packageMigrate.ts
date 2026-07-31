/**
 * 模块名称：扁平故事包 → 包⊃章 磁盘就地迁移
 * 模块说明：若包根仍有 story.conf.json，迁到 chapters/<id>/ 并写 package.conf.json。
 */
import {
	access,
	mkdir,
	readdir,
	readFile,
	rename,
	unlink,
	writeFile,
} from "node:fs/promises";
import path from "node:path";

/**
 * 扁平 layout 检测并就地迁移（幂等：已有 package.conf 则跳过）。
 * chapterId 优先取 conf.chapterId，否则取目录名。
 */
export async function ensureFlatPackageMigrated(
	pkgDir: string,
	dirName: string,
): Promise<void> {
	const packageConfPath = path.join(pkgDir, "package.conf.json");
	try {
		await access(packageConfPath);
		return;
	} catch {
		// 继续检测扁平 conf
	}

	const flatConfPath = path.join(pkgDir, "story.conf.json");
	let flatRaw: string;
	try {
		flatRaw = await readFile(flatConfPath, "utf8");
	} catch {
		return;
	}

	const flatJson = JSON.parse(flatRaw) as {
		schemaVersion?: number;
		packageId?: string;
		chapterId?: string;
		title?: string;
	};
	const chapterId = flatJson.chapterId ?? flatJson.packageId ?? dirName;
	const chapterDir = path.join(pkgDir, "chapters", chapterId);
	await mkdir(chapterDir, { recursive: true });

	const cardsSrc = path.join(pkgDir, "cards");
	const cardsDst = path.join(chapterDir, "cards");
	try {
		await access(cardsSrc);
		try {
			await access(cardsDst);
		} catch {
			await rename(cardsSrc, cardsDst);
		}
	} catch {
		// 无 cards 目录
	}

	const chapterConf: Record<string, unknown> = {
		...flatJson,
		schemaVersion: flatJson.schemaVersion ?? 1,
		chapterId,
	};
	delete chapterConf.chapterId;
	await writeFile(
		path.join(chapterDir, "story.conf.json"),
		`${JSON.stringify(chapterConf, null, 2)}\n`,
	);

	try {
		await unlink(flatConfPath);
	} catch {
		// 已删或不可删则忽略
	}

	const packageConf = {
		schemaVersion: 1,
		chapterId: dirName,
		title: flatJson.title,
		entryChapterId: chapterId,
		chapters: [{ chapterId }],
	};
	await writeFile(
		packageConfPath,
		`${JSON.stringify(packageConf, null, 2)}\n`,
	);
}

/** 扫描 chapters/ 下全部章目录名（含无 package.conf 的手动布局） */
export async function listChapterIds(pkgDir: string): Promise<string[]> {
	const chaptersRoot = path.join(pkgDir, "chapters");
	let names: string[] = [];
	try {
		const entries = await readdir(chaptersRoot, { withFileTypes: true });
		names = entries.filter((e) => e.isDirectory()).map((e) => e.name);
	} catch {
		return [];
	}
	return names;
}
