/**
	* 旧路由重定向：/stories/[packageId] → 入口章编辑器。
	*/
import { redirect } from "next/navigation";
import { readDiskPackageConf } from "@studio-v2/src/utils/server/packages/fs/package/packagesFs.server";

type LegacyStoryEditorRedirectProps = {
	params: Promise<{ packageId: string }>;
};

export default async function LegacyStoryEditorRedirect({
	// params：动态路由段 Promise，用于读取 packageId 并重定向入口章
	params,
}: LegacyStoryEditorRedirectProps) {
	const { packageId } = await params;
	const packageConf = await readDiskPackageConf(packageId);
	redirect(
		`/packages/${encodeURIComponent(packageId)}/chapters/${encodeURIComponent(packageConf.entryChapterId)}`,
	);
}
