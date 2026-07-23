# @airpc/rpg-engine

纯 TypeScript 引擎包（准 npm）。**不依赖** `react` / `next` / `@xyflow/*`，也不承载具体磁盘/数据库实现。

存取数据请注入 **Port**（存/取 callback）。协议说明见：

→ **[引擎存取 Port 与 IO 适配（技术设计 23）](../../docs/AI和人类/技术设计文档/23-引擎存取Port与IO适配.md)**

本机 Studio 的默认 IO 实现在：`apps/studioV2/engineIOModule/`（不要从浏览器代码引用）。

---

## 安装与入口

```ts
import {
  createEngineHost,
  getEngineHost,
  type MemoryPort,
  type ProfilePort,
  type ContentPort,
  type EngineLogPort,
  type WorkspaceSnapshot,
  type PackageValidateBundle,
} from "@airpc/rpg-engine";
```

只从包名导入；不要深挖 `src/host/...`。

---

## 最短用法（本机）

1. 用 IO 模块创建 ports（Studio：`engineIOModule` 工厂，指向 `data/`）。  
2. `createEngineHost({ ...ports })` 注入。  
3. `loadWorkspace` → `ensureProfile(userId)` → `resolve` / `beginCall` / 对话 → `endCall`。  
4. 需要持久化经历态时由门面触发 Profile / Memory 相关保存（经 Port）。

```text
注入 Port
  → loadWorkspace（ContentPort）
  → ensureProfile(userId)（ProfilePort）
  → resolve / beginCall
  → endCall
       → ExitSelector → EffectExecutor
       → 经 Port 写 Profile / Memory（若本通需要）
```

---

## 你需要实现或注入什么

| 能力 | 谁提供 |
|------|--------|
| 读故事包 / 角色 / 卡 | Content / Workspace Port |
| 读写信 Profile | Profile Port |
| 记忆投影与 commit | Memory Port |
| 引擎旁路日志 | EngineLog Port（可选，视宿主） |

测试里可全部换成内存假实现，不必落盘。

---

## 浏览器里怎么用

- **不要**在浏览器里直接 `createEngineHost` 并塞本地文件 Port。  
- 浏览器只发 XHR 到你的后端；由 **server/壳** 持有 Host + IO。  
- 若将来「引擎跑在浏览器」：注入的 Port 应是 **XHR 客户端适配**，不是 `fs`。

---

## 常见闭环提示

- Manual / 调试：`beginCall` → 多轮对话 → `endCall(manualOutcome)`。  
- Free：挂机走 Free 管线（MemoryCommit；有 candidate 再 Exit）。  
- 样例包：`data/storis-packages/golden_handoff/` 等（由 ContentPort 读取）。

更细的 Host API、错误码、磁盘**布局**约定见技术设计 [19](../../docs/AI和人类/技术设计文档/19-引擎宿主与会话模型.md)；B/S 拓扑见 [18](../../docs/AI和人类/技术设计文档/18-部署拓扑与BS架构.md)；Memory 投影算法见 [20](../../docs/AI和人类/技术设计文档/20-记忆存储与投影.md)。**存取谁读谁写、Port 入参出参**以 [23](../../docs/AI和人类/技术设计文档/23-引擎存取Port与IO适配.md) 为准。本文只负责「怎么用引擎」。
