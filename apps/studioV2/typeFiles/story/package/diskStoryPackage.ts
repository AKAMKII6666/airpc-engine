/**
	* 故事包磁盘 BFF 契约（data/storis-packages；包⊃章）。
	* layout 仅 Studio 画布 per-chapter；引擎忽略 canvas.layout.json。
	*/
import type {
	CallCardDefinition,
	ChapterConf,
	PackageConf,
} from "@studio-v2/typeFiles/story/callCard/engineCallCard";

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
	/** conf.cards.length */
	cardCount: number;
	/** 本章派生引用角色数 */
	characterCount: number;
	/** conf.assetRefs?.length ?? 0 */
	assetCount: number;
	/** 入口卡；空串表示未指定 */
	entryCardId: string;
	/** 章目录 mtime ISO-8601 */
	lastEditedAt: string;
};

/**
	* 画布节点：内容真源在 cards；此处只存坐标与章节壳。
	* cardId 与 kind 互斥语义：叙事卡用 cardId；章节起止用 kind。
	*/
export type StudioCanvasLayoutNode = {
	/** 稳定节点键；缺省时可用 cardId / kind 推导 */
	nodeId?: string;
	/** 叙事卡 id；章节节点可省略 */
	cardId?: string;
	/** 章节起止等非卡节点 */
	kind?: "chapter_start" | "chapter_end" | string;
	/** 画布 X（逻辑像素） */
	x: number;
	/** 画布 Y（逻辑像素） */
	y: number;
	/** 章节节点标题；仅 kind 为 chapter_* 时使用；持久化于 canvas.layout.json */
	title?: string;
	/** 章节节点摘要；画布壳展示用，非 cards 正文真源；可省略 */
	summary?: string;
	/** chapter_end 续章目标章 id（本包内）；无续章时可省略 */
	nextChapterId?: string;
	/** @deprecated 读入回落 nextChapterId */
	nextPackageId?: string;
	/** 续章入口卡 id；与 nextChapterId 成对；引擎跳转键 */
	nextEntryCardId?: string;
};

/**
	* 画布边：story / role / effect；effect meta 须能对上 exit.effects[].id。
	*/
export type StudioCanvasLayoutEdge = {
	/** 稳定边键；持久化于 canvas.layout.json，供 Studio 增量同步 */
	edgeId: string;
	/** story=出口连线；role=角色泳道；effect=Effect 投影边 */
	edgeKind: "story" | "role" | "effect" | string;
	/** 源节点 nodeId 或 cardId；role 边为卡 id */
	source: string;
	/** 目标 nodeId、cardId 或 role 边的 agentId */
	target: string;
	/** xyflow 源 handle；story/effect 常为 exit id */
	sourceHandle?: string;
	/** xyflow 目标 handle；叙事边多为 parent */
	targetHandle?: string;
	/** 画布边展示文案；可省略 */
	label?: string;
	/** effect 边专用；对应 exit.effects[].kind */
	effectKind?: string;
	/** effect 边专用；源卡上 exit.id */
	exitId?: string;
	/** effect 边专用；须对齐 exit.effects[].id */
	effectId?: string;
};

/** canvas.layout.json；per-chapter 落盘于 chapters/<id>/ */
export type StudioCanvasLayout = {
	/** layout 契约版本；迁移时递增；引擎忽略 */
	schemaVersion: number;
	/** 章 id；须与 story.conf.json.chapterId 一致 */
	chapterId: string;
	/** @deprecated 读入回落 chapterId */
	packageId?: string;
	/** 角色泳道序；由本包派生引用角色写入；可省略；引擎忽略 */
	lanes?: Array<{ agentId: string; order: number }>;
	/** 全量画布节点；坐标与章节壳；内容真源在 cards */
	nodes: StudioCanvasLayoutNode[];
	/** 画布边；缺省或空数组表示无显式边；引擎忽略 */
	edges?: StudioCanvasLayoutEdge[];
	/** 维护者备注；Studio 可读；引擎忽略 */
	note?: string;
};

/**
	* 单章 bundle：chapters/<id>/ 读写载荷。
	* cards 按 conf.cards 顺序；缺 layout 读路径由 BFF 填安全默认。
	*/
export type DiskChapterBundle = {
	/** story.conf.json 真源；引擎内容入口 */
	conf: ChapterConf;
	/** 全量 CallCard；顺序与 conf.cards 一致 */
	cards: CallCardDefinition[];
	/** canvas.layout.json；仅 Studio 画布持久化 */
	layout: StudioCanvasLayout;
};

/**
	* 整包容器：package.conf + 全章 bundle；storypack v2 交换格式。
	*/
export type DiskPackageContainer = {
	/** package.conf.json 真源 */
	packageConf: PackageConf;
	/** 各章 bundle；顺序与 packageConf.chapters 对齐 */
	chapters: DiskChapterBundle[];
};

/** 编辑器会话单章 bundle；别名保留兼容旧名 */
export type DiskStoryPackageBundle = DiskChapterBundle;

export type { ChapterConf, PackageConf };
