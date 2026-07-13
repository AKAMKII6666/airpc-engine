/**
 * 模块名称：故事画布占位（P3 只读）
 */
"use client";

import { useParams } from "next/navigation";
import { Alert, Chip, CircularProgress, Stack, Typography } from "@mui/material";
import { useStoriesPackageShellBis } from "@studio/bis/shell/storiesPackage.shell.bis";
import { useStudioStoreShallow } from "@studio/store/storeContext/studioStoreContext";

export default function StoryEditorPlaceholderPage() {
  const params = useParams<{ packageId: string }>();
  const packageId = params.packageId;
  useStoriesPackageShellBis(packageId);

  const { userId, detail, loading, error } = useStudioStoreShallow(
    function (s) {
      return {
        userId: s.layout.userId,
        detail: s.stories.packageDetail,
        loading: s.stories.packageDetailLoading,
        error: s.stories.packageDetailError,
      };
    },
  );

  const title =
    detail?.packageId === packageId ? detail.title : packageId ?? "";
  const cards =
    detail?.packageId === packageId ? detail.cardIds : [];

  return (
    <Stack spacing={2}>
      <Typography variant="h5">{title}</Typography>
      <Alert severity="info">
        P3 画布占位（只读）。完整 `@xyflow/react` 编辑器见 P6。当前用户：
        {userId ?? "未选"}
      </Alert>
      {loading ? <CircularProgress size={24} /> : null}
      {error ? <Alert severity="error">{error}</Alert> : null}
      <Stack direction="row" gap={1} flexWrap="wrap">
        {cards.map(function (id) {
          return <Chip key={id} label={id} />;
        })}
      </Stack>
    </Stack>
  );
}
