/**
	* 内容包交换文件（.contentpack.json）契约。
	* 与单包 .storypack.json 分离：多故事包 + 工作区首故事，给实机/运行时覆盖用。
	*/
import type { DiskStoryPackageBundle } from "@studio-v2/typeFiles/story/package/diskStoryPackage";

/** 内容包格式判别；拒载未知 format */
export const CONTENTPACK_FORMAT_ID = "airpc.contentpack.v1" as const;

/** 内容包内嵌的工作区元数据（含首故事真源） */
export type ContentPackWorkspaceV1 = {
	/** 内容 schema；当前仅支持 1；与 data/workspace.json 对齐 */
	schemaVersion: number;
	/** 工作区展示标题；可空串；导入覆盖磁盘 */
	title: string;
	/** 引擎最低版本提示串；可空串；非运行时闸门 */
	engineMinVersion: string;
	/**
		* 首故事 packageId；必填且须落在本文件 packages[] 内。
		* 导入后覆盖 data/workspace.json。
		*/
	startupPackageId: string;
};

/**
	* 内容包 / 运行时包 v1。
	* MVP：workspace + 全量故事包；角色/资源后续扩字段，勿塞 SaveGame。
	*/
export type ContentPackFileV1 = {
	/** 格式判别；必须为 CONTENTPACK_FORMAT_ID */
	format: typeof CONTENTPACK_FORMAT_ID;
	/** 导出时刻 ISO；仅展示 */
	exportedAt: string;
	/** 工作区元数据；导入覆盖 workspace.json */
	workspace: ContentPackWorkspaceV1;
	/** 多故事包整包载荷；导入覆盖 storis-packages */
	packages: DiskStoryPackageBundle[];
};
