# stores/storyEditor

故事编辑器域账本（V2-LY-2～4）。

| 切片 | 字段要点 |
|------|----------|
| 会话 | `packageId` / `loading` / `loadError` / `refreshStamp` / `diskPackages` / `cardIndex` / `graphSeed` |
| conf | `bundle`（含 conf/cards/layout 工作副本） |
| dirty | `confDirty` · `graphDirty` · `canvasPendingFlush`（`selectStoryEditorIsDirty`） |
| validation / save | `savePhase` / `saveError` / `saveValidation` |
| flush 槽 | `flushedGraph`（保存真源：先 flush 再组 bundle） |

实现文件：`storyEditorStore.ts`（create）· `model/`（形状）· `writes/`（结果型 actions）。

- **灌账：** `bis/shellBis/storyEditor/storyEditor.shell.bis.ts`
- **会话投影 / conf·保存：** `pageBis/.../packageSession.bis.ts`（保存先 `flushCanvasToStore`）
- **双层同步：** `pageBis/.../flush/canvasFlush.bis.ts`（throttle + 显式 flush）
- **库表单：** `pageBis/.../library/*.bis.ts`（资源/角色/调度卡；禁 UI 直引 ajax）

禁止在此目录发请求或 import bis / ajaxProxy / `next/navigation`。
禁止本目录 `index.ts` barrel；直引 `storyEditorStore.ts`。
