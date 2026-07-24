# Studio V2 · shellBis（页级灌账）

> **真源：** [技术设计 21 §3](../../../../../docs/AI和人类/技术设计文档/21-Studio客户端分层.md) · [目录 09 §4.2](../../../../../docs/AI和人类/sudioV2.0版本/需求/ui/09-Studio-V2前端目录结构与落点规则.md)

## 约定

```text
src/bis/shellBis/
  <domain>/<domain>.shell.bis.ts   # 一类页只挂一次
```

| 做 | 不做 |
|----|------|
| 打开页 / 首屏 GET → `apply*LoadResult` 写本域 store | 渲染复杂业务 UI |
| 听 `*RefreshStamp` 有界再拉 | 代替 feature 处理每个按钮 |
| generation + AbortController 防竞态 | 一类页挂多次 shell |
| 仅本后缀（及少数 `*Flow.ts`）可碰 `next/navigation` | 跨域乱写无关 store |

## 域目录（骨架占位；实现按 LY 刀序）

| 目录 | 预期文件 | 任务 |
|------|----------|------|
| `storyEditor/` | `storyEditor.shell.bis.ts` | V2-LY-3 ✅ |
| `characters/` | `characters.shell.bis.ts` | V2-LY-5 ✅ |
| `users/` | `users.shell.bis.ts` | V2-LY-7 |
| `assets/` | `assets.shell.bis.ts` | V2-LY-8 |
| `packages/` | `packages.shell.bis.ts` | V2-LY-9 |
| `debugger/` | `debugger.shell.bis.ts` | V2-LY-10 ✅ |
| `workbench/` | `workbench.shell.bis.ts` | V2-LY-11 ✅ |
| `settings/` | `settings.shell.bis.ts` | V2-LY-11 ✅ |

Feature 编排仍在 `bis/pageBis/<domain>/`；禁止本目录 barrel `index.ts`。
