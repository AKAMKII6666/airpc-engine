# Studio V2.0 · 引擎存取 Port 抽象需求

> **状态：** 已定稿，供实现与 Review / gbx 引用。  
> **性质：** 将引擎与具体存储 IO **程序拆清 + 物理拆清**：引擎只暴露存/取协议（callback / Port）；现网 JSON+fs+SQLite 实现迁出到 Studio V2 `engineIOModule`。  
> **协议真源（工程）：** [技术设计 23-引擎存取Port与IO适配](../../技术设计文档/23-引擎存取Port与IO适配.md)。  
> **用法入口：** [packages/rpg-engine/README.md](../../../../packages/rpg-engine/README.md)。

---

## 1. 本轮定位

### 1.1 要做什么

```text
程序边界
  · 引擎纯逻辑：不直接依赖 node:fs / better-sqlite3 实现
  · 引擎暴露存/取 Port（callback）+ 固定请求/响应协议
  · 宿主注入 Port；引擎只调 Port，不关心介质

物理边界
  · 现网 IO 实现从 packages/rpg-engine 迁出
  · 落入 apps/studioV2/engineIOModule/（本机 Studio 默认适配）
  · Next / Host 装配处创建并注入

文档
  · 技术设计 23 为协议定稿；18/19/20 过期表述回写
  · 引擎 README = 使用说明（非技术长文）
```

### 1.2 本轮不做

| 不做 | 说明 |
|------|------|
| 浏览器端本地盘 IO | 浏览器持久化走 XHR→API；本批不实现浏览器 IO 模块 |
| 改剧情规则 / Effect / Resolver 语义 | 仅拆存取边界 |
| 云同步 / 多租户存储产品化 | 协议可扩展，本批不落地 |
| 把 Studio 全部 BFF CRUD 强行并入 Port | Content 编辑 API 可继续用 server utils；与 Host 运行时 Port 边界在 23 钉清 |
| 删除 `data/` 磁盘布局约定 | 布局仍真源；变的是谁读谁写 |

### 1.3 与既有规则的关系

| 规则 | 关系 |
|------|------|
| 引擎纯度 | 强化：连 fs/sqlite **实现**也不留在引擎包 |
| Client↔Server 隔离 | `engineIOModule` = Server 区；Client 禁止 import |
| MemoryPort | 已有先例；本批推广到 Content / Profile / Log，并物理迁出 sqlite 实现 |

---

## 2. 目标架构（口径）

```text
packages/rpg-engine
  · 领域逻辑 + Port 接口（要什么 / 返回什么；存什么 / 返回什么）
  · createEngineHost({ ...ports }) 注入

apps/studioV2/engineIOModule/
  · 本机实现：JSON+fs、SQLite Memory、jsonl 日志等
  · 响应 Port callback，自行组织落盘/读取

（将来）电话机壳 / 纯浏览器宿主
  · 各自 IO 适配；浏览器侧典型为 XHR，不本地 IO
```

**铁律：** 独立性优先于 DRY；引擎不 import `engineIOModule`；`engineIOModule` 可依赖引擎 **类型/契约**（及引擎 schema 解析若需要），但引擎核心不得反向依赖 Studio。

---

## 3. Port 范围（本批必须覆盖）

详细字段与错误语义见 [23](../../技术设计文档/23-引擎存取Port与IO适配.md)。摘要：

| Port（名可微调，语义不可砍） | 引擎用途 |
|------------------------------|----------|
| **Workspace / Content** | `loadWorkspace`、按需读卡、角色、schedule-cards、资产 meta 存在性等 |
| **Profile** | 薄 Profile 读 / 写（`ensureProfile` / `saveProfile`） |
| **Memory** | 既有 `MemoryPort`（project / search / commit / patch…） |
| **EngineLog** | WET / 旁路 jsonl 追加与切片读 |

`validatePackage`：校验**规则**留引擎；**读盘**改为经 Content Port 取已解析对象或字节，禁止引擎内直接 `readFile` 扫包（本批收口）。

---

## 4. 物理迁出清单（从引擎迁到 engineIOModule）

至少包含（实现可改名，职责不可丢）：

| 现大致位置 | 迁出后 |
|------------|--------|
| `memory/sqliteMemoryPort.ts` | `engineIOModule` 内 Sqlite Memory 实现 |
| `workspace/loadWorkspace.ts` 中的 fs 扫描/读 JSON | Content/Workspace IO |
| `workspace/persistProfile.ts` | Profile IO |
| `host/engineLogFile.ts`（及同类写盘） | EngineLog IO |
| `validatePackage` 内嵌的 fs 读 | 改为 Port 取数；或 IO 模块提供 `loadPackageForValidate` |

引擎包可保留：**纯函数校验**、**schema**、**Host 编排**（只调 Port）。

---

## 5. 装配与隔离

1. StudioV2 服务端创建 Host 时：`createXxxPorts(dataRoot)` → `createEngineHost({ memory, profile, content, log, ... })`。  
2. **禁止** Client / `pageComponents` / `bis` / `typeFiles` import `engineIOModule`。  
3. 门禁：延续 `STUDIO-STRUCT-005/020`；必要时增加「Client 禁 `engineIOModule`」检测。  
4. Vitest：引擎测用内存假 Port；IO 模块单测可放 `apps/studioV2/tests/` 或 `engineIOModule` 旁约定 `tests/`（不进 Client bundle）。

---

## 6. 验收要点

- [x] `packages/rpg-engine/src` 业务路径无 `node:fs` / `better-sqlite3` **实现引用**（契约与类型可留）
- [x] `apps/studioV2/engineIOModule/` 存在且承载现网本机 IO
- [x] Host 经注入 Port 完成 loadWorkspace / Profile / Memory / 日志；本机行为与迁前等价（既有 host / memory 测绿）
- [x] `quality:engine` + `quality:studio` 通过
- [x] 技术设计 23 已写；18/19/20 与 README 已回写
- [x] Client 无法 import `engineIOModule`

---

## 7. 文档与索引

| 文档 | 角色 |
|------|------|
| 本文 | 产品/工程需求 |
| [引擎存取Port抽象_执行索引.md](./引擎存取Port抽象_执行索引.md) | gbx 刀序 |
| [23-引擎存取Port与IO适配.md](../../技术设计文档/23-引擎存取Port与IO适配.md) | 协议定稿 |
| [packages/rpg-engine/README.md](../../../../packages/rpg-engine/README.md) | 使用说明 |
