/**
	* Studio 故事包交换文件（.storypack.json）契约。
	* 与 DiskStoryPackageBundle 对齐；导入导出半真管线共用。
	*/
import type { DiskStoryPackageBundle } from "@studio-v2/typeFiles/story/package/diskStoryPackage";

/** 交换文件顶栏；用于拒载未知格式 */
export const STORYPACK_FORMAT_ID = "airpc.storypack.v1" as const;

/** 导出/导入交换文件；二进制 zip 另议 */
export type StorypackFileV1 = {
	/** 格式判别；必须为 STORYPACK_FORMAT_ID */
	format: typeof STORYPACK_FORMAT_ID;
	/** 导出时刻 ISO；仅展示 */
	exportedAt: string;
	/** 用途标签；导入时可忽略 */
	kind: "formal" | "debug" | "source";
	/** 整包载荷 */
	bundle: DiskStoryPackageBundle;
};
