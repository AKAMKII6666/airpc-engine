# 21. Studio 客户端分层（Zustand · bis · shell）

相关：[05](./05-技术选型与工程边界.md) · [18](./18-部署拓扑与BS架构.md) · [03](../需求/03-编辑器界面需求.md) · [04](../需求/04-调试器界面需求.md) · [V2 目录 09](../sudioV2.0版本/需求/ui/09-Studio-V2前端目录结构与落点规则.md) · [V2 门禁 08](../sudioV2.0版本/需求/ui/08-Studio-V2前端工程规则与质量门禁需求.md)

> **定稿哲学：** Store 只是账本；Shell 负责灌账本；Feature bis 负责动作；UI 只读展示并调 bis。  
> 该分层已在 SlimVID 等系统验证；本仓 Studio V2 **采用同一套**，不另发明状态框架。  
> **Zustand ≠ Profile/Memory 真源**；真源永远在 Next → EngineHost → `data/`。  
> **规则文件：** [.cursor/rules/studio-v2-client-layering.mdc](../../.cursor/rules/studio-v2-client-layering.mdc)。  
> **硬门禁：** `npm run check:studio-structure`（`STUDIO-STRUCT-021`～`024`）。

## 1. 为什么要强制分层

Zustand 本身不防糊。糊的根因通常是：

1. 组件里又 `fetch` 又改 store 又 toast  
2. store 里发请求、写导航  
3. 多页共用上帝 store、谁都能乱写  
4. 把服务端真源拷进前端当权威  
5. page hook 自管列表/选中当业务真源，绕过 bis  

本仓对策：**依赖方向可画、可门禁**；页面只挂 shell + 拼 UI；存量以 baseline 触碰即清。

## 2. 总图

```text
Page（薄编排）
  · 挂载 useXxxShellBis()
  · 挂载若干 Feature bis（handlers / viewModel）
  · 渲染 com/* + MUI；瞬时 UI 可用 useState（抽屉开闭等）
        │ 只调 bis                         ▲ 只读 view（经 bis）
        ▼                                  │
bis/shellBis/*.shell.bis.ts           pageComponents/**/com
  · 首屏 bootstrap / 列表主循环            · 展示 + 事件上抛给 bis
  · 写 store；防竞态 generation            · 禁止直读 store / 直引 ajaxProxy
        │
bis/pageBis/<domain>/*.bis.ts  ──►  utils/ajaxProxy/*（唯一浏览器请求出口）
  · 用户意图 → API / SSE
  · 成功失败 → store write 或 bump*RefreshStamp
        │
src/stores/<domain>/（Zustand；一域一账本）
  · 结果型 write actions
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

每个有独立数据生命周期的页面，**有且仅有一个** `useXxxShellBis`（落 `src/bis/shellBis/`，文件名 `*.shell.bis.ts`）：

| 做 | 不做 |
|----|------|
| 消费首屏数据或 GET bootstrap | 渲染复杂业务 UI |
| 灌列表 / 灌调试快照 / 灌编辑会话 | 处理每个按钮业务 |
| 监听 `*RefreshStamp` 触发有界刷新 | 代替 Feature bis |
| generation + AbortController 防竞态 | 跨页乱写无关 domain store |

### v1 Shell 清单（Studio V2）

| Shell | 挂载 | 灌入 store |
|-------|------|------------|
| `useStudioLayoutShellBis` | app layout | `userId`、全局 banner（若需要） |
| `usePackagesShellBis` | `/packages` | 故事包列表 |
| `useStoryEditorShellBis` | `/stories/[packageId]` | 编辑会话、conf、校验、dirty |
| `useDebuggerShellBis` | `/debugger` | Session 快照、Board、mailbox 等 |
| `useCharactersShellBis` 等 | 各库页 | 列表 + 选中摘要 |

仅 `*.shell.bis.ts`（及少数 `*Flow.ts`）可碰 **路由导航**。

## 4. Feature bis

用户意图与副作用放 `src/bis/pageBis/<domain>/`：

- 返回 `{ doX, isPending, error? }` 或稳定 handler  
- 请求只走 `ajaxProxy`  
- 成功后调 store **write action** 或 `bumpXxxRefreshStamp` 让 shell 重拉  
- toast / 确认框可由 bis 触发；**com / page 禁止直接业务 toast**  
- **禁止** value import `pageComponents` / `commonUiComponents`  
- **禁止**非 shell / 非 Flow 的 bis import `next/navigation`

纯函数映射、表单 schema、图变换可仍为 `*.helpers.ts` / 非 hook 模块；**有会话态与 xhr 的编排必须是 bis hook（或明确的 `*_bis.ts` 命令入口由 hook 调用）**。

## 5. Store（一域一账本）

- 按域：`src/stores/<domain>/`（characters / storyEditor / debugger / packages…）  
- `zustand` + 可选 Context Provider；订阅 `useStore` + shallow  
- **禁止**把各页业务切片堆进单一上帝 store；全局壳仅极薄偏好（如 workspace 标题）  

Write action **结果型命名**：

- 正确：`applyStoriesLoadResult` / `setDebuggerSnapshot` / `bumpDebuggerRefreshStamp`  
- 错误：`fetchStories`（请求不属于 store）

瞬时态（抽屉、未提交 Formik、Menu）：优先组件 `useState`。  
**禁止** page hook 长期自管列表数组 / 业务选中 / 加载错误会话真源。

**禁止**把 Memory / 全量 Profile 塞进 store。

### 5.1 故事编辑器双层状态

```text
高频（nodes/edges/viewport 拖动）→ 画布（React Flow）自管
  → 节流同步 + 松手/属性提交/切选中 flush → storyEditor store

数据/配置/save/validate/浮窗业务态 → 只走 store + bis
```

| 项 | 口径 |
|----|------|
| 保存真源 | **先 flush** 再以 store 投影组装 bundle |
| 同步 | 禁止仅靠裸 `setInterval`；须 throttle + 显式 flush 点 |
| 勿同步 | 每帧 transform（除非产品要求持久化 viewport） |
| 属性面板 | bis 写 store → 命令式 patch 画布（或订 store 结构切片） |

## 6. 样式与 UI 库（与分层正交）

| 项 | 定稿 |
|----|------|
| 组件 | **仅 MUI**；画布另用 `@xyflow/react` |
| 样式 | **CSS Modules + SCSS**（`*.module.scss`） |
| 主题 | MUI Theme 管组件 token；布局/间距走 scss module |

## 7. 目录（`apps/studioV2`）

```text
apps/studioV2/
  app/                              # Next 路由入口
  src/
    pageComponents/<route>/         # UI；com/ hooks/ 仅瞬时与展示
    bis/
      shellBis/**/*.shell.bis.ts
      pageBis/<domain>/**/*.{bis,helpers,Flow}.ts
    stores/<domain>/
    utils/ajaxProxy/                # 唯一 XHR / SSE 出口
    commonUiComponents/
  typeFiles/                        # FE 契约（可按 store|bis|xhr 细分）
  tests/
```

### Barrel 与目录

| 范围 | 规则 |
|------|------|
| `@airpc/rpg-engine` | 仅 Server 门面；Client 禁任何 import |
| `apps/studioV2` | **禁止** barrel `index.ts`；直引具体文件 |
| 目录职责聚类 | 异责 ≥2 组且可分类文件 ≥4 → 分子目录 |
| 测试 | 进 `tests/`；禁与业务树平放 |

## 8. 依赖方向与硬门禁

```text
page / com      → shell bis, feature bis, MUI, scss（✗ stores ✗ ajaxProxy）
feature bis     → ajaxProxy, store write（✗ pageComponents ✗ next/navigation）
shell bis       → ajaxProxy, store write, next/navigation（仅 shell）
store           ✗ bis ✗ ajaxProxy ✗ next/navigation
ajaxProxy       → fetch / EventSource only
```

| ID | 约束 |
|----|------|
| `STUDIO-STRUCT-021` | UI（`pageComponents` / `commonUiComponents`）禁 import `stores/**`、`ajaxProxy/**` |
| `STUDIO-STRUCT-022` | `stores/**` 禁 import bis / ajaxProxy / `next/navigation` |
| `STUDIO-STRUCT-023` | 非 `*.shell.bis.ts` 且非 `*Flow.ts` 的 bis 禁 `next/navigation` |
| `STUDIO-STRUCT-024` | bis 禁 value import `pageComponents` / `commonUiComponents` |

存量违规登记于 `scripts/studio-quality/studio-v2-layering-baseline.json`（内容哈希）；**触碰即必须改合规**。禁止宽目录永久豁免。

另见 Client/Server 隔离：`STUDIO-STRUCT-005` / `020`。

## 9. 与引擎文档对齐

| 概念 | 客户端落点 |
|------|------------|
| UserGate `userId` | layout shell → layout store；API 一律带此 id |
| CallSession | debugger shell 灌快照；挂机后清空 session 切片 |
| SSE 聊天 | feature bis 管流；store 只留 streaming 标志 |
| canvas.layout | 画布运行时 + flush 进 editor store；引擎忽略 layout |
| Memory | 不进大数组；短查询经 API |

## 10. 落地顺序

1. [x] 规则 + 硬门禁 + baseline（本文档批次）  
2. [x] 新代码强制三角；旧页触碰即迁  
3. [x] 优先收口故事编辑器（双层 + shell/feature 拆分）  
4. [x] 库页（characters / users / assets / packages）逐页迁 store+shell  
5. [x] baseline 清零  

## 11. 验收摘录

- [x] page/com 不直读 store、不直引 ajaxProxy  
- [x] store 无网络、无 navigation、不 import bis  
- [x] 列表/调试/编辑会话由 shell 灌入对应 domain store  
- [x] 编辑器保存前 flush；配置态不靠 page hook 自管  
- [x] `check:studio-structure` 含 021～024 绿（baseline 仅覆盖未触碰存量）  
- [x] Zustand 不当 Profile/Memory 真源  
