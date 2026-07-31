/**
	* 包章列表页路由。
	*/
import { ChapterListView } from "@studio-v2/src/pageComponents/packages/chapterList/ChapterListView";

type PackageChapterListPageProps = {
	params: Promise<{ packageId: string }>;
};

export default async function PackageChapterListPage({
	// params：动态路由段 Promise，用于读取 packageId
	params,
}: PackageChapterListPageProps) {
	const { packageId } = await params;
	return (
		// 引用了ChapterListView组件，用于包内章列表管理
		<ChapterListView packageId={packageId} />
	);
}
