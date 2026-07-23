/**
	* 资源库投影契约（Server 侧副本；与 typeFiles 同构，不以 import 同步）。
	* Studio 托管文件与 assetId；引擎只保存引用并做存在性校验。
	*/

/** 第一版资源类型；other 兜底未知扩展 */
export type AssetKind = "wav" | "bgm" | "image" | "text" | "other";

/**
	* 本地文件可用性。
	* - ready：文件在位
	* - missing：登记了引用但文件缺失（导出前需处理）
	* - unchecked：静态阶段未探测
	*/
export type AssetAvailability = "ready" | "missing" | "unchecked";

/** 资源库列表/详情投影 */
export type AssetSummary = {
	/** 系统生成资源键；主流程不手填 */
	assetId: string;
	/** 人类可读资源名 */
	displayName: string;
	/** 资源类型 */
	kind: AssetKind;
	/** 文件格式短标签，如 wav / webp；空串表示未知 */
	format: string;
	/**
		* 时长（毫秒）或文件大小（字节）的展示用数字。
		* kind 为 wav/bgm 时表示毫秒；其余表示字节。null 表示不适用。
		*/
	measureValue: number | null;
	/** measureValue 单位说明：duration_ms | size_bytes | none */
	measureUnit: "duration_ms" | "size_bytes" | "none";
	/** 被多少卡片/动作引用；0 表示无引用 */
	refCount: number;
	/** 最近修改时间 ISO-8601 */
	lastEditedAt: string;
	/** 本地可用性；missing 需在导出前补齐 */
	availability: AssetAvailability;
	/** 备注；空串表示无备注。主流程可编辑，不写盘 */
	note: string;
	/** 引用关系人话摘要 */
	referenceLines: readonly string[];
};

/** 编辑器内资源浮窗条目：选择回填，不长期占画布 */
export type AssetPickerItem = {
	/** 系统资源键 */
	assetId: string;
	/** 显示名 */
	displayName: string;
	/** 类型筛选用 */
	kind: AssetKind;
	/** 可用性；missing 条目应带警告样式 */
	availability: AssetAvailability;
};
