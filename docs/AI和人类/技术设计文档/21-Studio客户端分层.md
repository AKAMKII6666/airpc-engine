# 21. Studio 客户端分层（Zustand · bis · shell）

相关：[05](./05-技术选型与工程边界.md) · [18](./18-部署拓扑与BS架构.md) · [03](../需求/03-编辑器界面需求.md) · [04](../需求/04-调试器界面需求.md)

> **定稿哲学：** Store 只是账本；Shell 负责灌账本；Feature bis 负责动作；UI 只读展示并调 bis。  
> 该分层已在多系统验证；本仓 Studio **采用同一套**，不另发明状态框架。  
> **Zustand ≠ Profile/Memory 真源**；真源永远在 Next → EngineHost → `data/`。

## 1. 为什么要强制分层

Zustand 本身不防糊。糊的根因通常是：

1. 组件里又 `fetch` 又改 store 又 toast  
2. store 里发请求、写导航  
3. 多页共用上帝 store、谁都能乱写  
4. 把服务端真源拷进前端当权威  

本仓对策：**依赖方向可画、可门禁**；页面只挂 shell + 拼 UI。

## 2. 总图

```text
Page（薄编排）
  · 挂载 useXxxShellBis()
  · 挂载若干 Feature bis（handlers / viewModel）
  · 渲染 com/* + MUI；瞬时 UI 可用 useState（抽屉开闭等）
        │ 只调 bis                         ▲ 只读 view / store 切片
        ▼                                  │
bis/shell/*.shell.bis.ts              routes/**/com + uiComponents
  · 首屏 bootstrap / 列表主循环            · 展示 + 事件上抛给 bis
  · 写 store；防竞态 generation            · 禁止裸 fetch / 禁止业务 toast
        │
bis/<feature>/*.bis.ts  ──►  utils/ajaxHelper/*（唯一浏览器请求出口）
  · 用户意图 → API / SSE
  · 成功失败 → store write 或 bump*RefreshStamp
        │
studioStore（Zustand vanilla + Context）
  · slices + **结果型** write actions
  · 无网络、无路由、不 import bis
        │
        ▼ HTTP / SSE
Next API 门面 → EngineHost → Content JSON + 薄 Profile + Memory SQLite
```

| 层 | 可以当真相吗 |
|----|----------------|
| `rpg-engine` + `data/` | **是** |
| Studio Zustand | **否**（UI 工作副本 / 加载态 / 调试快照缓存） |
| 浏览器 | 只发意图 |

## 3. Shell

每个有独立数据生命周期的页面，**有且仅有一个** `useXxxShellBis`：

| 做 | 不做 |
|----|------|
| 消费首屏数据（RSC/loader 等价物或 GET bootstrap） | 渲染复杂业务 UI |
| `setBootstrapSnapshot` / 灌列表 / 灌调试快照 | 处理每个按钮业务 |
| 监听 `*RefreshStamp` 触发有界刷新 | 代替 Feature bis |
| generation + AbortController 防竞态 | 跨页乱写无关 slice |

### v1 Shell 清单

| Shell | 挂载 | 灌入 store |
|-------|------|------------|
| `useStudioLayoutShellBis` | studio layout | `userId`、用户列表摘要、全局 banner |
| `useStoriesShellBis` | `/stories` | 故事包列表 |
| `useStoryEditorShellBis` | `/stories/[packageId]` | conf、卡摘要、canvas layout |
| `useDebuggerShellBis` | `/debugger` | Session 快照、Board、candidates、composer 调试块 |

仅 `*.shell.bis.ts`（及少数 `*Flow.ts`）可碰 **路由导航 / 首屏数据钩子**。

## 4. Feature bis

用户意图与副作用放这里，例如：

- `useSelectUserBis`、`useBeginCallBis`、`useEndCallBis`、`useDebugChatBis`（SSE）  
- `useSaveCardBis`、`useValidatePackageBis`、`useAdvanceClockBis`

约定：

- 返回 `{ doX, isPending, error? }` 或稳定 handler  
- 请求只走 `ajaxHelper`  
- 成功后调 store **write action** 或 `bumpXxxRefreshStamp` 让 shell 重拉  
- toast / 确认框可由 bis 触发；**com / page 禁止直接业务 toast**

## 5. Store

- `zustand/vanilla` + React Context Provider（`useRef` 固定一份 `StoreApi`）  
- 订阅：`useStore` + `useShallow`  
- 可选 `immer` 中间件写复杂 patch  

### Slice 建议（v1）

```text
layout:    { userId, users[], bannerError }
stories:   { items[], loading, error, refreshStamp }
editor:    { packageId, conf, cardsMeta[], layout, dirty, refreshStamp }
debugger:  { sessionId?, snapshot, board, candidates, composerDebug, chatStreaming, refreshStamp }
```

Write action **结果型命名**：

- 正确：`applyStoriesLoadResult` / `setDebuggerSnapshot` / `bumpDebuggerRefreshStamp`  
- 错误：`fetchStories`（请求不属于 store）

瞬时态（抽屉、未提交草稿 tab）：优先组件 `useState`。

**禁止**把十年 Memory / 全量 Profile 塞进 store；调试记忆查询结果只留短列表。

## 6. 样式与 UI 库（与分层正交）

| 项 | 定稿 |
|----|------|
| 组件 | **仅 MUI**；画布另用 `@xyflow/react` |
| 样式 | **CSS Modules + SCSS**（`*.module.scss`） |
| 现代 CSS | 允许（`color-mix`、`oklch`、container queries 等，以目标浏览器为准） |
| 主题 | MUI Theme 管组件 token；页面布局/间距走 scss module |

不加 Ant / Chakra / shadcn 主栈；不加第二套 CSS-in-JS 框架（MUI 自带 Emotion 仅服务 MUI）。

## 7. 目录（`apps/studio`）

```text
apps/studio/
  app/                         # Next App Router
    (studio)/layout.tsx        # StudioStoreProvider + LayoutShell
    stories/...
    debugger/...
  bis/
    shell/*.shell.bis.ts
    stories|editor|debugger|...
  store/
    studioStore.ts
    studioStoreInitialValues.ts
    storeContext/studioStoreContext.tsx
  utils/ajaxHelper/            # 唯一 XHR / SSE 出口
  uiComponents/                # 跨页共享
  types/frontEnd/              # 仅客户端视图类型
  **/*.module.scss
```

### Barrel 与目录（定稿）

| 范围 | 规则 |
|------|------|
| `@airpc/rpg-engine` 对外入口 | **允许且鼓励** `index.ts` 聚合；Studio/壳只引包名 |
| `apps/studio` 的 `bis/` · `store/` · `ajaxHelper/` · `uiComponents/` · `types/` 等 | **禁止** barrel；直引具体文件 |
| 目录职责聚类 | 异责 ≥2 组且可分类文件 ≥4 → 分子目录；触及本任务若恶化平铺须当场收目录 |
| 测试 | 不放 `app/**` / `bis/**` 旁；进独立 `tests/`（与引擎一致） |

## 8. 依赖方向（门禁目标）

```text
page            → shell bis, feature bis, com, uiComponents
com             → MUI, module.scss, bis API / 只读 selector
feature bis     → ajaxHelper, store write
shell bis       → ajaxHelper 或首屏数据, store write, next/navigation（仅 shell）
store           ✗ bis、✗ ajax、✗ next/navigation
ajaxHelper      → fetch / EventSource only
rpg-engine      → 仅 server / 测试经 **包门面**；禁 client 写口；禁深挖内部路径
```

P0 可先约定；P3 起建议加静态门禁（非 shell 禁 navigation；store 禁 import bis；client 禁引擎写口）。

## 9. 与引擎文档对齐

| 概念 | 客户端落点 |
|------|------------|
| UserGate `userId` | layout shell → `layout.userId`；API 一律带此 id |
| CallSession | debugger shell 灌快照；挂机后清空 session slice |
| SSE 聊天 | `debugChat` bis 管流；store 只留 streaming 标志与展示所需 |
| canvas.layout | editor shell；引擎忽略 |
| Memory | 不进大数组；短查询结果经 API |

可选演进（非 v1 必做）：纯 GET 列表缓存可叠加 TanStack Query；**不替代** shell/bis 哲学。Debugger 极复杂流可局部 XState，非整站。

## 10. 落地顺序

1. P0：Provider + 空 store + scss module 空页  
2. P3：LayoutShell + StoriesShell + DebuggerShell + 关键 feature bis  
3. P6：EditorShell + save/validate bis  
4. 有 ≥2 页后上依赖门禁  

## 11. 验收摘录

- [ ] page 不堆业务 `fetch`；列表/调试数据由 shell 灌入  
- [ ] store 无网络调用；无 `fetch*` 命名的 action  
- [ ] UI 不拼 BFF URL；请求经 ajaxHelper  
- [ ] client 无引擎写口、无 LLM Key  
- [ ] Zustand 不当 Profile/Memory 真源  
