# shellBis/storyEditor

`storyEditor.shell.bis.ts`：页级唯一 shell。

| 做 | 不做 |
|----|------|
| `packageId` + `refreshStamp` → `loadPackageEditorSession` → `applyPackageLoad*` | 保存 / 属性按钮（见 `pageBis/.../packageSession*.bis.ts`） |
| 离页 `resetStoryEditorSession` | 一类页挂多次 |

挂载点：`StoryEditorShell`。
