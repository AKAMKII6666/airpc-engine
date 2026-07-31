/**
	* 章编辑器路由。
	*/
import { StoryEditorShell } from "@studio-v2/src/pageComponents/storyEditor/StoryEditorShell";

type ChapterEditorPageProps = {
	params: Promise<{ packageId: string; chapterId: string }>;
};

export default async function ChapterEditorPage({
	// params：动态路由段 Promise，用于读取 packageId 与 chapterId
	params,
}: ChapterEditorPageProps) {
	const { packageId, chapterId } = await params;
	return (
		// 引用了StoryEditorShell组件，用于章级故事编辑器
		<StoryEditorShell packageId={packageId} chapterId={chapterId} />
	);
}
