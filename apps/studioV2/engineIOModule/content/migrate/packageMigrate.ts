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

type FlatStoryConf = {
	schemaVersion?: number;
	packageId?: string;
	chapterId?: string;
	title?: string;
};

function isEacces(err: unknown): boolean {
	return (
		err !== null &&
		typeof err === "object" &&
		"code" in err &&
		(err as NodeJS.ErrnoException).code === "EACCES"
	);
}

async function pathExists(filePath: string): Promise<boolean> {
	try {
		await access(filePath);
		return true;
	} catch {
		return false;
	}
}

async function moveIfAbsent(src: string, dst: string): Promise<void> {
	if (!(await pathExists(src))) return;
	if (await pathExists(dst)) return;
	await rename(src, dst);
}

async function ensureChapterDir(chapterDir: string): Promise<boolean> {
	try {
		await mkdir(chapterDir, { recursive: true });
		return true;
	} catch (err) {
		if (isEacces(err)) return false;
		throw err;
	}
}

async function writeMigratedArtifacts(input: {
	pkgDir: string;
	chapterDir: string;
	dirName: string;
	chapterId: string;
	flatJson: FlatStoryConf;
	flatConfPath: string;
	packageConfPath: string;
}): Promise<void> {
	const chapterConf: Record<string, unknown> = {
		...input.flatJson,
		schemaVersion: input.flatJson.schemaVersion ?? 1,
		chapterId: input.chapterId,
	};
	delete chapterConf.packageId;
	await writeFile(
		path.join(input.chapterDir, "story.conf.json"),
		`${JSON.stringify(chapterConf, null, 2)}\n`,
	);
	try {
		await unlink(input.flatConfPath);
	} catch {
		// 已删或不可删则忽略
	}
	const packageConf = {
		schemaVersion: 1,
		packageId: input.dirName,
		title: input.flatJson.title,
		entryChapterId: input.chapterId,
		chapters: [{ chapterId: input.chapterId }],
	};
	await writeFile(
		input.packageConfPath,
		`${JSON.stringify(packageConf, null, 2)}\n`,
	);
}

/**
	* 包已嵌套后：若包根仍残留 canvas.layout.json，补迁入入口章目录。
	*/
async function healRootLayoutIfNeeded(
	pkgDir: string,
	dirName: string,
): Promise<void> {
	const packageConfPath = path.join(pkgDir, "package.conf.json");
	if (!(await pathExists(packageConfPath))) return;
	try {
		const raw = JSON.parse(await readFile(packageConfPath, "utf8")) as {
			entryChapterId?: string;
		};
		const chapterId = raw.entryChapterId ?? dirName;
		const chapterDir = path.join(pkgDir, "chapters", chapterId);
		if (!(await pathExists(chapterDir))) return;
		await moveIfAbsent(
			path.join(pkgDir, "canvas.layout.json"),
			path.join(chapterDir, "canvas.layout.json"),
		);
	} catch {
		// 损坏 conf 时跳过补迁
	}
}

export async function ensureFlatPackageMigrated(
	pkgDir: string,
	dirName: string,
): Promise<void> {
	const packageConfPath = path.join(pkgDir, "package.conf.json");
	if (await pathExists(packageConfPath)) {
		await healRootLayoutIfNeeded(pkgDir, dirName);
		return;
	}

	const flatConfPath = path.join(pkgDir, "story.conf.json");
	let flatRaw: string;
	try {
		flatRaw = await readFile(flatConfPath, "utf8");
	} catch {
		return;
	}

	const flatJson = JSON.parse(flatRaw) as FlatStoryConf;
	const chapterId = flatJson.chapterId ?? flatJson.packageId ?? dirName;
	const chapterDir = path.join(pkgDir, "chapters", chapterId);
	if (!(await ensureChapterDir(chapterDir))) return;

	await moveIfAbsent(
		path.join(pkgDir, "cards"),
		path.join(chapterDir, "cards"),
	);
	await moveIfAbsent(
		path.join(pkgDir, "canvas.layout.json"),
		path.join(chapterDir, "canvas.layout.json"),
	);

	await writeMigratedArtifacts({
		pkgDir,
		chapterDir,
		dirName,
		chapterId,
		flatJson,
		flatConfPath,
		packageConfPath,
	});
}

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
