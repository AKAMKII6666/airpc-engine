/**
	* Studio 故事包交换文件（.storypack.json）契约。
	* v2：整包多章 DiskPackageContainer；legacy 单章 bundle 仍可读。
	*/
import type {
	DiskChapterBundle,
	DiskPackageContainer,
	DiskStoryPackageBundle,
} from "@studio-v2/typeFiles/story/package/diskStoryPackage";

/** 交换文件顶栏；用于拒载未知格式 */
export const STORYPACK_FORMAT_ID = "airpc.storypack.v1" as const;

/** v2 多章交换；导入导出整包 storypack 真源 */
export type StorypackFileV2 = {
	/** 格式判别；必须为 STORYPACK_FORMAT_ID */
	format: typeof STORYPACK_FORMAT_ID;
	/** 导出时刻 ISO；仅展示 */
	exportedAt: string;
	/** 用途标签；导入时可忽略 */
	kind: "formal" | "debug" | "source";
	/** 整包容器载荷 */
	container: DiskPackageContainer;
};

/** legacy 单章；读入后升维为单章包 */
export type StorypackFileV1Legacy = {
	/** 格式判别；必须为 STORYPACK_FORMAT_ID */
	format: typeof STORYPACK_FORMAT_ID;
	/** 导出时刻 ISO；仅展示 */
	exportedAt: string;
	/** 用途标签；导入时可忽略 */
	kind: "formal" | "debug" | "source";
	/** 单章 bundle 载荷 */
	bundle: DiskStoryPackageBundle;
};

/** 交换文件联合；v2 优先 */
export type StorypackFileV1 = StorypackFileV2 | StorypackFileV1Legacy;

export type { DiskChapterBundle, DiskPackageContainer };
