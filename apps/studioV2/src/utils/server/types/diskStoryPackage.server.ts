/**
	* 故事包磁盘 BFF 契约（Server 侧副本；与 typeFiles 同构，不以 import 同步）。
	* layout 仅 Studio 画布；引擎忽略 canvas.layout.json。
	*/
import type {
	CallCardDefinition,
	ChapterConf,
	PackageConf,
} from "@airpc/rpg-engine";

/**
	* 包列表扫描摘要：来自 package.conf.json + 章聚合。
	*/
export type DiskStoryPackageSummary = {
	/** 目录名与 package.conf.packageId；路由键 */
	packageId: string;
	/** 人类标题；缺省时回落 packageId */
	title: string;
	/** package.conf.schemaVersion */
	schemaVersion: number;
	/** 包内章数 */
	chapterCount: number;
	/** 入口章 id；打开编辑器默认章 */
	entryChapterId: string;
	/** 全包卡总数（各章 conf.cards 之和） */
	cardCount: number;
	/** 入口章派生引用角色数 */
	characterCount: number;
	/** 入口章 assetRefs 数 */
	assetCount: number;
	/** 入口章 entryCardId；空串表示未指定 */
	entryCardId: string;
	/** 包目录 mtime ISO-8601 */
	lastEditedAt: string;
};

/**
	* 章列表摘要：单章 story.conf.json 投影。
	*/
export type DiskChapterSummary = {
	/** 章 id；全局唯一；路由键 */
	chapterId: string;
	/** 所属包容器 id */
	packageId: string;
	/** 人类标题 */
	title: string;
	cardCount: number;
	characterCount: number;
	assetCount: number;
	entryCardId: string;
	lastEditedAt: string;
};

/**
	* 画布节点：内容真源在 cards；此处只存坐标与章节壳。
	*/
export type StudioCanvasLayoutNode = {
	nodeId?: string;
	cardId?: string;
	kind?: "chapter_start" | "chapter_end" | string;
	x: number;
	y: number;
	title?: string;
	summary?: string;
	/** chapter_end 续章目标章 id（本包内）；无续章时可省略 */
	nextChapterId?: string;
	/** @deprecated 读入回落 nextChapterId */
	nextPackageId?: string;
	/** 续章入口卡 id；与 nextChapterId 成对 */
	nextEntryCardId?: string;
};

export type StudioCanvasLayoutEdge = {
	edgeId: string;
	edgeKind: "story" | "role" | "effect" | string;
	source: string;
	target: string;
	sourceHandle?: string;
	targetHandle?: string;
	label?: string;
	effectKind?: string;
	exitId?: string;
	effectId?: string;
};

/** canvas.layout.json；per-chapter 落盘 */
export type StudioCanvasLayout = {
	schemaVersion: number;
	/** 章 id；须与 story.conf.json.chapterId 一致 */
	chapterId: string;
	/** @deprecated 读入回落 chapterId */
	packageId?: string;
	lanes?: Array<{ agentId: string; order: number }>;
	nodes: StudioCanvasLayoutNode[];
	edges?: StudioCanvasLayoutEdge[];
	note?: string;
};

/** 单章 bundle：chapters/<id>/ 读写载荷 */
export type DiskChapterBundle = {
	conf: ChapterConf;
	cards: CallCardDefinition[];
	layout: StudioCanvasLayout;
};

/** 整包容器：package.conf + 全章 bundle */
export type DiskPackageContainer = {
	packageConf: PackageConf;
	chapters: DiskChapterBundle[];
};

/** @deprecated 别名；编辑器会话仍称「整包 bundle」，实为单章 */
export type DiskStoryPackageBundle = DiskChapterBundle;
