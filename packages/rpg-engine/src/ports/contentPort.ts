/**
 * 模块名称：ContentPort（技术设计 23 §4.3）
 * 模块说明：Content 只读热路径契约；Studio 画布写盘仍走 BFF，不经本 Port。
 */
import type { AssetMeta } from "../schema/asset.js";
import type {
	CallCardDefinition,
	StoryPackageConf,
} from "../schema/callCard.js";
import type { CharacterDef } from "../schema/character.js";

/**
 * loadWorkspace 后 Host 内存缓存所需最小快照（不含预读全部故事卡正文）。
 */
export interface WorkspaceSnapshot {
	/** 逻辑工作区键；本机即 dataRoot 绝对/相对路径字符串 */
	workspaceKey: string;
	/** packageId → conf；cards 映射可为空，按需 loadCard 再填 */
	packages: Array<{
		packageId: string;
		conf: StoryPackageConf;
		/** 实现私有定位提示（本机可为目录绝对路径）；引擎不当作公共 API 依赖 */
		packageLocator?: string;
	}>;
	/** agentId 唯一 */
	characters: CharacterDef[];
	/** cardKind free|schedule */
	freeCards: CallCardDefinition[];
	/** cardKind schedule */
	scheduleCards: CallCardDefinition[];
}

/**
 * 校验装包：一次取出 validate 规则所需的全部可读内容（避免引擎 readFile）。
 * confRaw / cardRaw / diskCardIds：供 parse 前规则与孤儿卡 warning（规则仍在引擎）。
 */
export interface PackageValidateBundle {
	packageId: string;
	conf: StoryPackageConf | null;
	/**
	 * story.conf.json 原始 JSON；缺文件为 null。
	 * 用于 ASSET_PACKAGE_INLINE 等 schema 会剥掉的字段检查。
	 */
	confRaw?: unknown | null;
	/**
	 * conf.cards 声明的每张卡；缺文件则 card/cardRaw 均为 null。
	 * 文件在但 schema 失败：card=null 且保留 cardRaw，供 PROMPT_SCENE / TOOL_DIRECT_EFFECT。
	 */
	cards: Array<{
		cardId: string;
		card: CallCardDefinition | null;
		/** 磁盘原始 JSON；缺文件为 null / 省略 */
		cardRaw?: unknown | null;
	}>;
	/**
	 * cards/ 目录上全部 `.s-card.json` 的 cardId（含未进 conf 的孤儿）。
	 * 缺目录时 []。
	 */
	diskCardIds?: string[];
	/** 全局角色表（引用校验）；可与 snapshot.characters 同源 */
	characters: CharacterDef[];
	/** 可选：已解析的 AssetMeta 缓存，减少校验时往返 */
	assetsById?: Record<string, AssetMeta>;
}

/**
 * Content 只读。缺资源返回 null / false；schema 不支持 throw SCHEMA_UNSUPPORTED；
 * 损坏 throw VALIDATION_FAILED。
 */
export interface ContentPort {
	/**
	 * 加载工作区索引。schemaVersion 不支持：throw SCHEMA_UNSUPPORTED。
	 * 无 storis-packages 目录：packages=[]，不抛。
	 * 不要预读全部 cards/*.s-card.json；正文按需 readCard。
	 */
	loadWorkspaceSnapshot(input: {
		workspaceKey: string;
	}): Promise<WorkspaceSnapshot>;

	/**
	 * 按需读单卡。
	 * packageId 为故事包 id，或哨兵 __free__ / __schedule__。
	 * 不存在：null；损坏：throw VALIDATION_FAILED。
	 */
	readCard(input: {
		workspaceKey: string;
		packageId: string;
		cardId: string;
	}): Promise<CallCardDefinition | null>;

	/**
	 * 读故事包 conf（不强制带齐所有卡）。不存在：null。
	 */
	readPackageConf(input: {
		workspaceKey: string;
		packageId: string;
	}): Promise<StoryPackageConf | null>;

	/**
	 * 校验装包：一次取出 validate 规则所需内容。
	 * 缺 conf：仍返回结构，由引擎规则报错（或 Port 在 conf 位给 null）。
	 */
	loadPackageForValidate(input: {
		workspaceKey: string;
		packageId: string;
	}): Promise<PackageValidateBundle>;

	/** 资产 meta 是否存在（校验 ASSET_*） */
	assetMetaExists(input: {
		workspaceKey: string;
		assetId: string;
	}): Promise<boolean>;

	/** 读资产 meta；不存在 null */
	readAssetMeta(input: {
		workspaceKey: string;
		assetId: string;
	}): Promise<AssetMeta | null>;

	/**
	 * 可选：探测二进制/uri 是否在位（对应 ASSET_URI_MISSING）。
	 * 不做则引擎只能跳过或降级该规则（实现须声明）。
	 */
	assetUriExists?(input: {
		workspaceKey: string;
		/** 相对 data/assets 或实现约定的 uri */
		uri: string;
	}): Promise<boolean>;
}
