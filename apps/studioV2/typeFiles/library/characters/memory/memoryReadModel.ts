/**
	* 角色详情记忆区只读投影（非 CharacterDef；不落角色 JSON）。
	*/

/** 单条记忆摘要；字段对齐 Memory 读模型 */
export type MemoryListItemDto = {
	/** 条目 id */
	id: string;
	/** 层 */
	layer: string;
	/** 种类；可空 */
	kind: string | null;
	/** 正文摘要 */
	text: string;
	/** 事件时间 ISO */
	at: string;
	/** 写入时间 ISO */
	createdAt: string;
};

/** 记忆分页 DTO；由 /api/memory 返回 */
export type MemoryListPageDto = {
	/** 本页条目；只读投影，所有权在 Memory SQLite，不进角色 JSON */
	items: MemoryListItemDto[];
	/** 满足条件的总条数（非本页） */
	total: number;
	/** 1-based 页码 */
	page: number;
	/** 每页条数（请求约定，非持久化字段） */
	pageSize: number;
};
