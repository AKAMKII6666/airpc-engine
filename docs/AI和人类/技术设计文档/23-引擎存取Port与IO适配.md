# 23. 引擎存取 Port 与 IO 适配

相关：[18](./18-部署拓扑与BS架构.md) · [19](./19-引擎宿主与会话模型.md) · [20](./20-记忆存储与投影.md) · [里程碑需求](../里程碑/v2.0/引擎存取Port抽象_需求.md) · [引擎使用说明](../../../packages/rpg-engine/README.md)

> **状态：** 定稿口径（实现按里程碑执行索引推进）。  
> **一句话：** 引擎只声明「要什么 / 存什么」的 Port 协议；具体落盘由外部 IO 模块响应。本机默认实现物理落在 `apps/studioV2/engineIOModule/`。

---

## 1. 为什么拆

引擎是纯领域逻辑，将来可嵌入：

| 宿主 | IO 形态（示例） |
|------|-----------------|
| Studio V2 / 本机 Next | `engineIOModule`：JSON+fs + SQLite + jsonl |
| 电话机壳 | 设备私有存储 / 只读 Content 包 |
| 纯浏览器 | **不本地 IO**；经 XHR→后端再落盘 |

存储方案随平台变；**剧情与会话规则不变**。故：程序上 Port 化，物理上 IO 实现离开 `packages/rpg-engine`。

---

## 2. 拓扑

```text
Browser（仅意图与展示）
  ↓ XHR
Next API 门面
  ↓ 装配：createEngineIOPorts(dataRoot) → createEngineHost({ ports })
packages/rpg-engine（纯逻辑 + Port 接口）
  ↕ callback / Port 协议（本文）
apps/studioV2/engineIOModule/（本机 IO 实现）
  ↓
data/（storis-packages / users / memory / logs …）
```

- **引擎禁止** import `engineIOModule` 或 `node:fs` / `better-sqlite3` **实现**。  
- **Client 禁止** import `engineIOModule`（与 Client/Server 隔离规则一致）。  
- 浏览器若需持久化：浏览器侧适配 = XHR，不是再给引擎塞一套本地盘实现。

---

## 3. 协议原则

1. **引擎暴露**一组 Port（存/取 callback）+ **固定**入参/出参形状。  
2. **外部 IO** 实现这些 callback：自行组织读/写，把结果交回引擎。  
3. 错误：优先结构化（与 Host `engineError` / 错误码对齐）；IO 失败不得假装写成功。  
4. **幂等**：同一 Profile/Content 键重复写，语义由各 Port 方法注释钉死（v1：整文件覆盖写 Profile）。  
5. **类型真源**：Port 接口与 DTO 定义在 `packages/rpg-engine`；`engineIOModule` 可 import 引擎类型，反向禁止。

命名以实现为准；下表为**语义合同**——砍语义须改本文 + 需求。

---

## 4. Port 契约（入参 / 出参 · 实现合同）

> **类型真源落地后**在 `packages/rpg-engine` 导出同名 interface；本文为定稿形状。  
> 字段级细节（如 `PlayerProfile` 内嵌）见 schema / [19](./19-引擎宿主与会话模型.md) / [20](./20-记忆存储与投影.md)；此处钉 **方法级 I/O**。  
> 错误约定：除非注明返回 `null` / 结果对象，失败应 **throw** 与 Host 对齐的结构化错误（至少含 `code` + `message`，如 `NOT_FOUND` / `VALIDATION_FAILED` / `IO_FAILED`）。

---

### 4.1 MemoryPort

**职责：** 按 `userId`+`agentId` 读写记忆；通话前投影、挂机 commit、工具 patch。  
**本机实现：** SQLite（原 `createSqliteMemoryPort` → `engineIOModule/memory`）。  
**代码对齐：** `packages/rpg-engine/src/memory/types.ts`（已存在，迁实现时保持兼容）。

```ts
interface MemoryPort {
  projectForCall(input: {
    userId: string;
    agentId: string;
    /** 当前通话卡；投影可按 card 上下文取舍 */
    card: CallCardDefinition;
    /** 投影「现在」；缺省由实现用墙钟 */
    nowIso?: string;
  }): Promise<MemoryProjection>;

  search(input: MemorySearchQuery): Promise<MemorySearchHit[]>;

  getById(input: {
    userId: string;
    agentId: string;
    entryId: string;
  }): Promise<MemorySearchHit | null>;  // 无则 null，不抛 NOT_FOUND

  applyPatch(input: {
    userId: string;
    agentId: string;
    layer: string;   // episodic | semantic | …（实现可校验白名单）
    op: string;      // 实现约定的 op 名
    payload: unknown;
  }): Promise<void>;

  commitAfterCall(input: MemoryCommitInput): Promise<MemoryCommitResult>;

  /** 可选：commit 后rollup */
  rollupIfNeeded?(input: {
    userId: string;
    agentId: string;
    endedAt: string; // ISO
  }): Promise<void>;

  /** 可选：进程退出关库 */
  close?(): void;
}
```

#### 入参 / 出参明细

| 方法 | 入参 | 出参 |
|------|------|------|
| `projectForCall` | 见上 | `MemoryProjection`：`{ softText: string; includedEntryIds: string[]; rollupIds?: string[]; debug?: { hotCount: number; chars: number } }` |
| `search` | `MemorySearchQuery`：`{ userId, agentId, textQuery?, fromIso?, toIso?, kinds?: ("call_summary"\|"vignette"\|"beat"\|"semantic"\|"rollup")[], maxResults: number }` | `MemorySearchHit[]`，每条 `{ id, layer, kind?, text, at, createdAt }`；无命中 `[]` |
| `getById` | `userId, agentId, entryId` | `MemorySearchHit \| null` |
| `applyPatch` | `userId, agentId, layer, op, payload` | `void`；非法 op/层 throw |
| `commitAfterCall` | `MemoryCommitInput`：`{ userId, agentId, sessionId, transcript: unknown, outcome?: Outcome, endedAt: string, summaryText?: string, vignettes?: string[] }` | `MemoryCommitResult`：`{ ok: boolean; writtenLayers: (...层名)[]; writtenEpisodicIds?: string[]; error?: string }`。`ok:false` 时可不 throw，由 Host 读 `error` |

**实现注意：** 不把万级 episodic 写进 Profile JSON；查询走库，不扫 Content。

---

### 4.2 ProfilePort

**职责：** 薄 `PlayerProfile`（Board / stories / schedule / world…）整档读写。  
**本机实现：** `data/users/<userId>/profile.save.json`（路径仅 IO 模块知道）。  
**文档形状：** `PlayerProfile`（`schemaVersion: 1`, `userId`, `user`, `characters`, `stories`, `callCards`, `telephony?`, `world`, `schedule`, `research`, `meta?`）。

```ts
interface ProfilePort {
  /**
   * 读薄存档。
   * - 文件/键不存在：返回 null（Host 再决定 ensure）
   * - JSON 损坏 / schema 失败：throw VALIDATION_FAILED（不要返回半截对象）
   */
  readProfile(input: {
    userId: string;
  }): Promise<PlayerProfile | null>;

  /**
   * 整档覆盖写。实现须在写入前（或写入时）刷新 meta.updatedAt（ISO）。
   * 成功：void。磁盘满/权限等：throw IO_FAILED。
   * 幂等：同一文档重复 write = 最后一次覆盖。
   */
  writeProfile(input: {
    profile: PlayerProfile;
  }): Promise<void>;

  /**
   * 若无档则按引擎/宿主给定的初始档创建并落盘；若已有则原样读回。
   * 不在此方法内跑剧情 Effect。
   */
  ensureProfile(input: {
    userId: string;
    /** 仅当不存在时写入；已存在则忽略 */
    initial?: PlayerProfile;
  }): Promise<PlayerProfile>;
}
```

| 方法 | 入参 | 出参 |
|------|------|------|
| `readProfile` | `{ userId: string }` | `PlayerProfile \| null` |
| `writeProfile` | `{ profile: PlayerProfile }`（必须含合法 `userId`） | `void` |
| `ensureProfile` | `{ userId, initial? }`；无 `initial` 且无档时由实现建最小合法档或 throw（须在实现注释钉死；**推荐** Host 传入 initial） | `PlayerProfile`（保证非 null） |

**实现注意：** 引擎 Host **不得**再拼 `users/.../profile.save.json`；只调本 Port。

---

### 4.3 ContentPort

**职责：** Content 只读热路径（工作区快照、按需读卡、校验装包、资产 meta 探测）。  
**不负责：** Studio 画布 layout 编辑写盘、资源二进制上传（可仍走 BFF）；但 validate 需要的 **读** 必须能经本 Port 完成。  
**本机实现：** 扫 `workspace.json` / `storis-packages` / `characters` 等（布局见 [19 §3](./19-引擎宿主与会话模型.md)）。

```ts
/** loadWorkspace 后 Host 内存缓存所需最小快照（不含预读全部故事卡正文） */
interface WorkspaceSnapshot {
  /** 逻辑工作区键；本机即 dataRoot 绝对/相对路径字符串 */
  workspaceKey: string;
  /** packageId → conf；cards 映射可为空，按需 loadCard 再填 */
  packages: Array<{
    packageId: string;
    conf: StoryPackageConf;
    /** 实现私有定位提示（本机可为目录绝对路径）；引擎不当作公共 API 依赖 */
    packageLocator?: string;
  }>;
  characters: CharacterDef[];           // agentId 唯一
  freeCards: CallCardDefinition[];      // cardKind free|schedule
  scheduleCards: CallCardDefinition[];  // cardKind schedule
}

interface ContentPort {
  /**
   * 加载工作区索引。schemaVersion 不支持：throw SCHEMA_UNSUPPORTED。
   * 无 storis-packages 目录：packages=[]，不抛。
   */
  loadWorkspaceSnapshot(input: {
    workspaceKey: string;
  }): Promise<WorkspaceSnapshot>;

  /**
   * 按需读单卡。
   * packageId 为故事包 id，或哨兵 __free__ / __schedule__（与引擎常量一致）。
   * 不存在：返回 null（Host 转 NOT_FOUND）；损坏：throw VALIDATION_FAILED。
   */
  readCard(input: {
    workspaceKey: string;
    packageId: string;
    cardId: string;
  }): Promise<CallCardDefinition | null>;

  /**
   * 读故事包 conf（不强制带齐所有卡）。
   * 不存在：null。
   */
  readPackageConf(input: {
    workspaceKey: string;
    packageId: string;
  }): Promise<StoryPackageConf | null>;

  /**
   * 校验装包：一次取出 validate 规则所需的全部可读内容（避免引擎 readFile）。
   * 缺 conf：仍返回结构，由引擎规则报 SCHEMA / missing（或 Port 直接在 conf 位给 null）。
   */
  loadPackageForValidate(input: {
    workspaceKey: string;
    packageId: string;
  }): Promise<PackageValidateBundle>;

  /** 资产 meta 是否存在（校验 ASSET_*） */
  assetMetaExists(input: {
    workspaceKey: string;
    assetId: string;
  }): Promise<boolean>;

  /** 读资产 meta；不存在 null */
  readAssetMeta(input: {
    workspaceKey: string;
    assetId: string;
  }): Promise<AssetMeta | null>;

  /**
   * 可选：探测二进制/uri 是否在位（对应 ASSET_URI_MISSING）。
   * 不做则引擎只能跳过或降级该规则（实现须声明）。
   */
  assetUriExists?(input: {
    workspaceKey: string;
    /** 相对 data/assets 或实现约定的 uri */
    uri: string;
  }): Promise<boolean>;
}

interface PackageValidateBundle {
  packageId: string;
  conf: StoryPackageConf | null;
  /** conf.cards 声明的每张卡；缺文件则该 cardId 对应 null 或不出现（引擎按规则报） */
  cards: Array<{ cardId: string; card: CallCardDefinition | null }>;
  /** 全局角色表（引用校验）；可与 snapshot.characters 同源 */
  characters: CharacterDef[];
  /** 可选：已解析的 AssetMeta 缓存，减少校验时往返 */
  assetsById?: Record<string, AssetMeta>;
}
```

| 方法 | 入参 | 出参 |
|------|------|------|
| `loadWorkspaceSnapshot` | `{ workspaceKey }` | `WorkspaceSnapshot` |
| `readCard` | `{ workspaceKey, packageId, cardId }` | `CallCardDefinition \| null` |
| `readPackageConf` | `{ workspaceKey, packageId }` | `StoryPackageConf \| null` |
| `loadPackageForValidate` | `{ workspaceKey, packageId }` | `PackageValidateBundle` |
| `assetMetaExists` | `{ workspaceKey, assetId }` | `boolean` |
| `readAssetMeta` | `{ workspaceKey, assetId }` | `AssetMeta \| null` |
| `assetUriExists?` | `{ workspaceKey, uri }` | `boolean` |

**实现注意：**

- `loadWorkspaceSnapshot` **不要**预读全部 `cards/*.s-card.json`（与现 `loadWorkspaceState` 一致）；正文按需 `readCard`。  
- `__free__` / `__schedule__` 卡从 `characters/free-cards`、`characters/schedule-cards` 解析，不进 `storis-packages/`。  
- Zod/schema **解析可在 IO 模块完成**（返回已是引擎类型）；引擎 validate 规则吃结构化对象，不再 `readFile`。

---

### 4.4 EngineLogPort

**职责：** 引擎旁路日志落盘与切片读（WET 内存 ring 仍可在 Host；**持久化**只经本 Port）。  
**本机实现：** `data/logs/engine-YYYYMMDD.jsonl`（UTC 日键）。  
**记录形状：** `LogRecord = { at: string; type: string; userId?: string; sessionId?: string; payload?: unknown }`。

```ts
interface EngineLogPort {
  /**
   * 追加一条。实现必须做隐私脱敏（剥 privateBrief / openingPrivate / systemHard 等，
   * 与现 redactLogRecord 同语义）后再落盘；引擎可先脱敏再传入，实现仍应防御性脱敏。
   */
  append(input: {
    record: LogRecord;
  }): Promise<void>;

  /**
   * 读某日 jsonl 尾部切片。文件不存在：lines=[]，truncated=false，不抛。
   * day：YYYYMMDD；缺省=今天 UTC。
   */
  readSlice(input: {
    day?: string;
    limit?: number;  // 缺省建议 80
  }): Promise<{
    /** 实现侧定位提示（本机可为文件路径）；仅调试 */
    locator?: string;
    lines: LogRecord[];
    truncated: boolean;
  }>;
}
```

| 方法 | 入参 | 出参 |
|------|------|------|
| `append` | `{ record: LogRecord }` | `void`；IO 失败 throw |
| `readSlice` | `{ day?: string; limit?: number }` | `{ locator?: string; lines: LogRecord[]; truncated: boolean }` |

**实现注意：** 一行一条 JSON；追加失败不得拖垮通话主路径（Host 可 `.catch` 吞掉，但 Port 本身应如实 throw 或由 Host 包装）。

---

### 4.5 四 Port 对照总表

| Port | 读 | 写 | 空/缺省语义 |
|------|----|----|-------------|
| Memory | project / search / getById | applyPatch / commitAfterCall | getById→null；search→[] |
| Profile | readProfile | writeProfile / ensureProfile | read→null；ensure→必有档 |
| Content | snapshot / card / conf / validate bundle / asset* | （运行时 Port **无写**；编辑写盘走 BFF） | 缺→null / false |
| EngineLog | readSlice | append | 无文件→空 lines |

---

## 5. Host 注入

```ts
createEngineHost({
  memory?: MemoryPort | null,
  profile: ProfilePort,
  content: ContentPort,
  engineLog?: EngineLogPort,
  // 其它既有 options…
});
```

- **测试：** 注入内存假 Port。  
- **本机 Studio：** `engineIOModule` 工厂一次创建全套并注入。  
- **禁止**引擎在未注入时偷偷建 sqlite/fs 实现；默认硬实现已删，本机真源仅 `engineIOModule`。

---

## 6. `engineIOModule` 物理约定

路径：`apps/studioV2/engineIOModule/`（名固定）。

建议子目录（实现可微调）：

```text
engineIOModule/
  content/     # Workspace / 包 / 角色 / 资产 meta 读
  profile/     # 薄 Profile 读写
  memory/      # Sqlite MemoryPort 实现
  log/         # jsonl
  createEngineIOPorts.ts  # 工厂：dataRoot → ports
```

- 属 **Server 区**：仅 `app/api`、Host 装配、`*.server.ts` 可引用。  
- 现网技术不变：Content/Profile = JSON+fs；Memory = SQLite；Log = jsonl。

---

## 7. validatePackage

- **规则与报错形状**留在引擎（纯函数吃结构化输入）。  
- **读盘**只经 `ContentPort.loadPackageForValidate`（及 `assetMetaExists` / `readAssetMeta` / 可选 `assetUriExists`）。  
- 引擎侧演进目标签名示意：`validatePackage(bundle: PackageValidateBundle): Promise<ValidationReport>`（或 Host 先 load 再交给纯函数）；**禁止** `validation/validatePackage.ts` 内长期 `import "node:fs"`。

---

## 8. 与 18 / 19 / 20 的关系

| 文档 | 仍负责 | 本篇补充 |
|------|--------|----------|
| 18 | B/S 拓扑、API 草表 | 持久化实现不在引擎包内，经 Port |
| 19 | Host API、磁盘**布局**、Session | load/save 经 Port；布局由 IO 解释 |
| 20 | Memory 投影与算法 | Sqlite 实现文件位置改为 engineIOModule |

---

## 9. 验收要点（工程）

- [ ] Port 接口从 `@airpc/rpg-engine` 可导入  
- [ ] 本机唯一默认 IO 实现位于 `engineIOModule`  
- [ ] 引擎包无 fs/sqlite 实现残留  
- [ ] Client 不可引用 `engineIOModule`  
- [ ] 既有 host / memory / validation 测在注入下通过  
