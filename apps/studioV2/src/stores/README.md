# Studio V2 · stores（一域一账本）

> **真源：** [技术设计 21](../../../../docs/AI和人类/技术设计文档/21-Studio客户端分层.md) · [规范改进需求](../../../../docs/AI和人类/里程碑/v2.0/规范改进需求.md) §3.1  
> **门禁：** `STUDIO-STRUCT-021` / `022`（UI 禁直读；store 禁网络 / bis / ajaxProxy / `next/navigation`）

## 约定

```text
src/stores/
  studioV2Store.ts          # 壳层极薄偏好（workspace 标题等）；禁止扩业务切片
  <domain>/                 # 一域一目录：characters / storyEditor / users / …
    <domain>Store.ts        # Zustand；只结果型 write actions
```

| 域 | 目录 | 后续任务 |
|----|------|----------|
| 壳偏好 | 现 `studioV2Store.ts`（可迁 `shell/`） | 保持薄；不扩列表/选中 |
| 故事编辑器 | `storyEditor/storyEditorStore.ts` | V2-LY-2 已落地；灌账/flush 见 V2-LY-3～4 |
| 角色库 | `characters/charactersStore.ts` | V2-LY-5 已落地；CRUD/出基线见 V2-LY-6 |
| 用户库 | `users/usersStore.ts` | V2-LY-7 已落地；已出 layering baseline |
| 资源库 | `assets/assetsStore.ts` | V2-LY-8 已落地；已出 layering baseline |
| 包列表 | `packages/packagesStore.ts` | V2-LY-9 已落地；已出 layering baseline |
| 调试器 | `debugger/debuggerStore.ts` | V2-LY-10 已落地；已出 layering baseline |
| 工作台 | `workbench/workbenchStore.ts` | V2-LY-11 已落地；侧栏 mock；包列表复用 packages |
| 设置 | `settings/settingsStore.ts` | V2-LY-11 已落地；已出 layering baseline |

## 硬约束

- **禁止**多域业务态塞进同一上帝 store。
- store **不是** Profile / Memory / 磁盘包真源。
- UI 经 feature bis 读写；shell bis 负责灌账。
- 禁止本目录 `index.ts` barrel；直引具体文件。

各域子目录 README 仅占位说明；真正 store 文件在对应 LY 任务落地。
