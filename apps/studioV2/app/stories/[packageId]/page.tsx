/**
 * 故事编辑器路由：page 只装配全屏壳；不接保存/Host。
 */
import { StoryEditorShell } from "@studio-v2/src/pageComponents/storyEditor/StoryEditorShell";

type StoryEditorPageProps = {
  params: Promise<{ packageId: string }>;
};

export default async function StoryEditorPage(props: StoryEditorPageProps) {
  const { packageId } = await props.params;
  return <StoryEditorShell packageId={packageId} />;
}
