# 25. L2 · 第三方特性插件（功能态）

相关：[24-L1第一方能力包与流水线插槽](./24-L1第一方能力包与流水线插槽.md) · [07](./07-壳嵌入与导出契约.md) · [18](./18-部署拓扑与BS架构.md) · [19](./19-引擎宿主与会话模型.md) · [23](./23-引擎存取Port与IO适配.md) · [51](../需求/51-自由通话增强-旧仓对标缺口.md)

**状态：** 工程计划（**依赖 L1 收口**）。  
**目标：** 第三方/伙伴按「一个特性一个目录」交付插件；宿主提供**包装完整的能力 API** 与**流水线插槽**；作者自管私有逻辑与私有存储。  
**非目标（本阶段）：** ACL、白名单权限裁剪、沙箱、签名审核、私有存储路径规范、行为校验。安全产品化见 §12（规划 L3 前专项），**不阻塞**本篇收口。

**前置：** [24](./24-L1第一方能力包与流水线插槽.md) 插槽形状稳定；`apiVersion` 可冻结为对外 v1。

---

## 0. 拍板摘要（相对初版）

| 项 | 定稿 |
|----|------|
| 目录 | 仅 workspace `plugins/<特性id>/`；**废除**按流水线分子目录与 `_multi/` |
| 与 L1 分界 | L1 第一方代码在引擎 `src/capabilityPacks/`（静态）；引擎内**禁止**裸目录名 `plugins/` |
| 启用 | **仅**各包清单内 `enabled`；**无**工作区总启用列表 |
| 清单结构 | 三大块：`realtime`（实时通话）/ `background`（后台运行）/ `ui`（界面挂载） |
| 能力 | API **给全、包装好**（经 Port/门面）；**不**给磁盘路径/库位置让作者自摸 |
| 私有存储 | 作者自理；宿主**不**规定根路径、**不**管代码结构 |
| 安全 | L2 **不做**权限管教；装错卸包；作者与安装者自负 |
| UI | **正式能力**：设置总面板 / 角色面板 / 用户面板 |

---

## 1. L2 目标

| # | 目标 | 完成判据 |
|---|------|----------|
| T1 | 作者手册可独立做出包 | 目录、清单、槽点、入口、调试说明齐全 |
| T2 | `plugins/<id>/` + 清单驱动加载 | 扫目录 → 读清单 → `enabled` → 挂槽 |
| T3 | 实时 / 后台 / UI 三分声明 | 作者可只开一类或全开 |
| T4 | 完整能力 API 矩阵 | 用户/角色/记忆/模型/实时/任务/外呼等经门面 |
| T5 | UI 三位置挂载 | 设置 / 角色 / 用户插件面板 |
| T6 | 通话内+通话外协作可说明 | 含「挂机转后台 → 再外呼」类场景文档化 |
| T7 | Studio 与未来壳同一加载契约 | 仅 Node 宿主加载；Client 不执行包逻辑入口 |

---

## 2. 与 L0 / L1 / L3

```text
L0 内容包     故事卡 / 角色 / 日程卡 JSON                         → 扩展剧本
L1 第一方包   引擎 src/capabilityPacks/ + 静态 merge 装配         → 对内验证插槽
L2 特性插件   workspace plugins/<id>/ + 清单 + 能力 API           → 伙伴扩展运行时
L3 开放生态   分发商店等                                          → 另立项；前置 = §12
```

- L1 与 L2 **同构插槽名**；落点不同：引擎内 `capabilityPacks` ≠ workspace `plugins/`。  
- 引擎内核**不**扫盘、**不**建 `src/plugins/`。加载器只在 Studio server / 未来壳扫描 workspace `plugins/`。

能写内容卡就优先内容；内容表达不了再做逻辑插件。

---

## 3. 目录

```text
<workspace>/
  data/                              # 既有 Content / users …
  plugins/
    computer-control/                # 一个特性一个目录
      capability-packs.json          # 本包清单（类 package.json）
      index.js                       # 可选：包级初始化
      realtime/                      # 作者自定结构，宿主不强制
      background/
      ui/
    idle-chat-outbound/
      capability-packs.json
      …
```

- 引擎核**不**扫盘；加载器在 Studio server / 未来壳。  
- 第一方对内代码见 [24 §0 / §4.1](./24-L1第一方能力包与流水线插槽.md)（`capabilityPacks`）；**不要**把引擎第一方目录也叫 `plugins/`。  
- 作者目录内部怎么组织：**不管**。清单里的 `entry` 指向哪个文件即可。

---

## 4. 清单协议：`capability-packs.json`

每个插件目录根下**必须**有此文件。字段名可在实现期微调，语义如下。

### 4.1 完整示例（电脑控制类）

```json
{
  "id": "computer-control",
  "name": "电脑控制",
  "version": "1.0.0",
  "apiVersion": 1,
  "enabled": true,
  "main": "./index.js",

  "realtime": {
    "enabled": true,
    "pipelines": [
      {
        "slot": "compose.providers",
        "after": "time",
        "entry": "./realtime/injectPrompt.js"
      },
      {
        "slot": "tools.register",
        "entry": "./realtime/tools.js"
      },
      {
        "slot": "dialogue.events",
        "entry": "./realtime/onCallEvent.js"
      },
      {
        "slot": "call.afterHangup",
        "entry": "./realtime/onHangup.js"
      }
    ]
  },

  "background": {
    "enabled": true,
    "pipelines": [
      {
        "slot": "tasks.register",
        "entry": "./background/registerJobs.js"
      },
      {
        "slot": "tasks.onTick",
        "entry": "./background/onTick.js"
      },
      {
        "slot": "outbound.prepare",
        "entry": "./background/prepareReport.js"
      },
      {
        "slot": "outbound.request",
        "entry": "./background/requestCall.js"
      }
    ]
  },

  "ui": {
    "enabled": true,
    "panels": [
      {
        "slot": "settings.plugin",
        "entry": "./ui/GlobalSettings.js"
      },
      {
        "slot": "character.plugin",
        "entry": "./ui/CharacterSettings.js"
      },
      {
        "slot": "user.plugin",
        "entry": "./ui/UserSettings.js"
      }
    ]
  }
}
```

### 4.2 字段语义

| 字段 | 含义 |
|------|------|
| `id` | 全局唯一；建议与目录名一致 |
| `enabled` | **本包唯一启用开关**；`false` 则跳过加载 |
| `apiVersion` | 插槽/门面契约大版本 |
| `main` | 可选：包加载时初始化 |
| `realtime` | **实时通话域**：有没有、挂哪些槽、入口文件 |
| `background` | **后台运行域**：定时、自处理、外呼准备/请求 |
| `ui` | **界面域**：挂到哪类面板、入口 |

某一大类不需要：写 `"enabled": false` 或省略该块。

### 4.3 管道项

| 字段 | 含义 |
|------|------|
| `slot` | 宿主公布的插槽名（见 §5） |
| `after` / `before` | 相对已有提供者 id 的插入位置（可选） |
| `entry` | 相对本包根的模块路径；导出约定见 SDK |

---

## 5. 插槽总表（宿主提供）

### 5.1 实时通话域 `realtime`

| 槽点 | 时机 | 典型用途 |
|------|------|----------|
| `compose.providers` | beginCall 合成提示词 | 注入本通上下文、汇报材料摘要 |
| `begin.softExtras` | 开场软上下文 | 附加 soft |
| `tools.register` | 本通/角色工具集 | 注册功能调用（连电脑、下发 job…） |
| `effects.register` | 挂机效果表（可选） | 贡献效果处理；慎改主链语义 |
| `dialogue.events` | 通话中事件 | 实时处理、追加可说内容 |
| `call.afterHangup` | endCall 同步段末 | 把活交给后台（登记任务等） |
| `commit.context` | 组装 MemoryCommitInput 时 | 补 exclusionSeeds、本通线索等 |
| `commit.extract` | Studio 挂机抽取编排 | 特性化记忆 kind / 校验贡献（server） |

### 5.2 后台运行域 `background`

| 槽点 | 时机 | 典型用途 |
|------|------|----------|
| `tasks.register` | 包加载或挂机后 | 向宿主登记定时/周期任务 |
| `tasks.onTick` | 任务到期 | 自处理、盯 job、调模型判断 |
| `outbound.prepare` | 决定外呼前 | 准备开场/汇报材料 |
| `outbound.request` | 请求外呼 | 经宿主正式外呼/调度入口（仍绑 CallCard） |
| `schedule.gates` | 调度滴答 | 门闩：打不打 |
| `schedule.topic` | 调度滴答 | 选题 |

### 5.3 界面域 `ui`

| 槽点 | 位置 |
|------|------|
| `settings.plugin` | 设置 · 通用插件面板（全局配置） |
| `character.plugin` | 角色详情 · 插件面板 |
| `user.plugin` | 用户详情 · 插件面板 |

宿主挂载时注入上下文：当前插件 id、当前用户、当前角色（若有）、能力 API 客户端（经 XHR/门面，**非**浏览器直连引擎内核）。

---

## 6. 宿主能力 API 矩阵（包装完整）

原则：

1. **给全**：功能态**不裁剪**可读/可写范围——任意用户、任意角色的官方档案与记忆，只要业务需要，均经门面提供（列出、读、写、检索）。  
2. **包装好**：一律门面方法；**禁止**把 Memory/SQLite/Profile **路径或库位置**交给作者自摸。  
3. 插件私有存什么、怎么存、是否另接自有网络或自有库：**不管**（宿主既不鼓励规范，也不拦截其进程内自理代码）。  
4. 宿主仍提供包装好的文本模型 / 实时事件等能力，作为正路；作者另搞通道属自理。

### 6.1 用户

- 列出**系统内全部用户**；读/更新任一用户档案字段；取当前用户上下文。

### 6.2 角色

- 列出角色定义；读任一角色运行态；按**任意用户 × 任意角色**读经历相关数据；经写接口更新运行态。

### 6.3 记忆（官方真源）

- 按**任意用户 × 任意角色**查询 / 检索 / 写入 / 更新（经 MemoryPort 包装）。  
- 读投影与投影元数据。  
- 特性化记忆种类：通过 `commit.extract` / `commit.context` 槽贡献，**不是**作者直写库文件。

### 6.4 文本模型

- `chatText` / 结构化输出等；钥匙与厂商在宿主侧包装提供。  
- 作者另接自有模型通道：属插件自理，宿主不管。

### 6.5 实时通话

- 订阅已归一化通话事件；请求注入可说内容；接收工具调用并返回结果。

### 6.6 任务与调度

- 注册/取消/查询定时与周期任务；到期回调进入 `tasks.onTick`。  
- 查询可拨、调度钟、挂起意图等运行态。

### 6.7 外呼与会话控制

- 请求角色外呼（宿主走 resolve → beginCall）。  
- 登记出口候选；读当前会话摘要。  
- **不**提供「伪造无卡 CallSession」；外呼必须正式入口。

### 6.8 明确不作为「能力」提供的

- 原始 `data/` 路径、SQLite 文件路径、内部 Host 私有 Map。  
- 在浏览器里执行包的 Node 入口。

---

## 7. 加载规则

```text
Studio server / 壳启动或 loadWorkspace
  → 扫描 plugins/*/capability-packs.json
  → 跳过 enabled≠true
  → 校验 apiVersion；加载 main（若有）
  → 按 realtime / background 的 pipelines 把 entry 挂到对应 slot
  → 按 ui.panels 注册面板入口（供 Studio 客户端经约定通道拉取）
  → 注入能力门面 api
```

| 规则 | 定稿 |
|------|------|
| 总启用列表 | **无** |
| 加载时机 | 进程启动 / loadWorkspace；**通话中不热插包** |
| 单包失败 | 跳过该包 + 日志；默认不阻断内核 |
| Client | 只渲染 UI 贡献；业务逻辑入口在 server/壳 |

---

## 8. 通话内 + 通话外协作

```text
实时域：提示词 / 工具 / 事件
  → 挂机 call.afterHangup
  → 后台域：tasks + 作者自处理
  → outbound.prepare / outbound.request
  → 宿主正式外呼 → 再次进入实时域
```

**工程接线（不是权限管教）：**

1. 后台任务**不**占用未结束的 CallSession。  
2. 「再打电话」必须经宿主外呼/调度 API → CallCard。  
3. 官方用户/角色/记忆走 §6 API；控制端协议与 job 私有态作者自理。

### 8.1 示例：电脑控制（单目录、三分清单）

| 阶段 | 域 | 槽点 / API | 谁做事 |
|------|----|------------|--------|
| 通内：注入「已连接」提示、注册下发 job 的功能调用 | realtime | compose / tools / dialogue | 插件 entry |
| 通内：用户下令 → 工具调用 → 连控制端、建 job | realtime | tools 处理 + 能力 API | 插件私有协议 |
| 挂机：登记「盯 job」定时任务 | realtime→background | call.afterHangup → tasks.register | 插件 |
| 通外：到点查 job、失败自调整、可调宿主模型 | background | tasks.onTick + 文本模型 API | 插件 |
| 完成/失败：准备汇报材料并请求外呼 | background | outbound.prepare / outbound.request | 插件决策，宿主开通话 |
| 新通：汇报材料进提示词，继续实时沟通 | realtime | compose / tools | 同一插件 |

---

## 9. 私有存储

| 数据 | 谁管 |
|------|------|
| 官方 Profile / Memory / Board / schedule | 宿主 API |
| 插件自己的库、文件、配置结构 | **作者完全自理** |

宿主：**不**提供强制 `storage/` 根路径规范，**不**审查插件代码结构，**不**负责其备份迁移。

---

## 10. SDK 与交付物

| 交付物 | 说明 |
|--------|------|
| `@airpc/pack-sdk`（名称可定） | 类型、槽点常量、入口导出约定、测试用 mock api |
| 《特性插件作者手册》 | 目录、清单、槽点、API、UI、通话内外协作 |
| `examples/packs/*` | 仅实时；仅后台；实时+后台；带三面板 UI |
| 基础 validate | 清单 schema、entry 可解析、apiVersion |

---

## 11. 分期

| 分期 | 内容 |
|------|------|
| L2-0 | L1 收口；冻结槽点名与 apiVersion=1 |
| L2-A | 扫描 `plugins/*` + `enabled` + 挂 realtime 槽 |
| L2-B | 能力 API：用户/角色/记忆读为主，渐进给写 |
| L2-C | background：tasks + outbound |
| L2-D | UI 三面板挂载 |
| L2-E | 手册 + 示例（含通话内外协作） |
| L2-F | 调试：已加载包列表、槽点/失败原因 |

**收口：** T1–T7。不要求 ACL/沙箱/签名。

---

## 12. L3 前置（延后 · 不阻塞 L2）

规划开放不可信分发前再做：ACL、allowlist、沙箱、签名、配额审计等。  
**禁止**把本节拉回 L2 功能里程碑。

---

## 13. 非目标清单（防止口径回潮）

- 按 `compose/`、`schedule/` 等类型分子目录  
- `_multi/` 目录  
- 工作区根总 `enabledPackIds` 文件  
- 给作者数据库/文件路径去「自己摸」  
- 强制私有存储根路径  
- L2 阶段做权限矩阵 / 行为校验引擎  
- 引擎内使用裸目录名 `plugins/`（与 workspace 插件混淆）  

---

## 14. 验收

- [ ] 仅改某包 `enabled` 即可开关，无需根级总表  
- [ ] 单目录可同时声明 realtime + background + ui  
- [ ] Trace/日志可见插件 id 与槽点贡献  
- [ ] 记忆等官方数据仅经 API，文档与 SDK 无「路径用法」  
- [ ] 三面板至少有示例挂上  
- [ ] 示例演示：挂机登记任务 → 到点回调 → 请求外呼  
- [ ] 不验收 ACL/白名单权限子集  

---

## 15. 文档维护

- 槽点增删同步 [24 §插槽](./24-L1第一方能力包与流水线插槽.md) 与本文 §5。  
- 产品拍板变更先改 §0，再改正文，避免残留旧口径。  
- L1 路径/命名以 [24 §0](./24-L1第一方能力包与流水线插槽.md) 为准；本文只谈 workspace `plugins/`。
