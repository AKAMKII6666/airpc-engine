---
# Studio V2.0 · 引擎存取 Port 抽象执行索引（gbx / general-batch-exe）
# 用法：node .cursor/skills/general-batch-exe/bin/gbx.js --exFile <本文件> --workdir <仓库根> [--dry-run]
# 本轮目标：引擎存取 Port 协议落地 + 现网 IO 迁入 apps/studioV2/engineIOModule + Host 注入装配 + 文档收口
batch_size: 1
max_rounds: 80
max_fix_attempts: 5
max_ineffective_fixes: 2
stop_on_fail: true
group: order

verify_default:
  - npm run quality:engine
  - npm run quality:studio

read_first:
  - AGENTS.md
  - .cursor/rules/codingRole.mdc
  - .cursor/rules/engine-boundaries.mdc
  - .cursor/rules/engine-code-quality.mdc
  - .cursor/rules/studio-v2-client-server-isolation.mdc
  - .cursor/rules/studio-v2-quality.mdc
  - .cursor/rules/testing-and-quality.mdc
  - .cursor/rules/docs-execution.mdc
  - docs/AI和人类/里程碑/v2.0/引擎存取Port抽象_需求.md
  - docs/AI和人类/技术设计文档/23-引擎存取Port与IO适配.md
  - docs/AI和人类/技术设计文档/18-部署拓扑与BS架构.md
  - docs/AI和人类/技术设计文档/19-引擎宿主与会话模型.md
  - docs/AI和人类/技术设计文档/20-记忆存储与投影.md
  - packages/rpg-engine/README.md
  - packages/rpg-engine/src/host/createEngineHost.ts
  - packages/rpg-engine/src/memory/types.ts
  - packages/rpg-engine/src/ports/contentPort.ts
  - packages/rpg-engine/src/ports/profilePort.ts
  - packages/rpg-engine/src/ports/engineLogPort.ts
  - packages/rpg-engine/src/workspace/loadWorkspace.ts
  - packages/rpg-engine/src/validation/validatePackage.ts
  - packages/rpg-engine/src/index.ts
  - apps/studioV2/engineIOModule/createEngineIOPorts.ts
  - apps/studioV2/engineIOModule/memory/sqliteMemoryPort.ts
  - apps/studioV2/engineIOModule/profile/fsProfilePort.ts
  - apps/studioV2/engineIOModule/content/fsContentPort.ts
  - apps/studioV2/engineIOModule/log/fsEngineLogPort.ts

hard_stop_patterns:
  - "协议未定|需要人工决策|阻塞实现"
  - "引擎包内保留 sqliteMemoryPort 当真源实现|createSqliteMemoryPort 仍从引擎门面作为唯一本机实现出口且无注入"
  - "loadWorkspace/persistProfile/engineLog 仍在引擎内直接 node:fs 且无 Port"
  - "validatePackage 仍直接 readFile 扫盘且未走 Content Port"
  - "engineIOModule 被 Client/pageComponents/bis/typeFiles 值导入"
  - "引擎 import apps/studioV2|引擎依赖 react/next"
  - "本批实现浏览器本地盘 IO|IndexedDB 当真源"
  - "改 ExitSelector/Effect 语义|顺手大重构无关模块"
  - "quality:engine 失败仍标完成|quality:studio 隔离规则回归失败仍标完成"
  - "留下 @deprecated 已迁至|兼容转发壳当长期方案"
  - "编辑 docs/人类/"

executor_extra: |
  只实现当前 ACTIVE / 本轮选出的 ⬜ 行；完成后把对应行改为 ✅。
  需求真源：引擎存取Port抽象_需求.md。协议真源：技术设计 23。
  刀序 V2-IO-1 → V2-IO-12；严格 group: order。
  阶段：A 协议与类型(1–2) → B Memory 迁出(3–4) → C Content/Profile/Log(5–7) → D validate 读盘解耦(8) → E 装配与门禁(9–10) → F 文档收口(11–12)。
  物理落点：apps/studioV2/engineIOModule/；引擎只留 Port 接口 + Host 编排。
  本机行为等价：既有 host/memory/validation 测必须绿。
  禁止 Client 引用 engineIOModule。

reviewer_extra: |
  只读审查；写出 reviews/latest.json。
  对照 引擎存取Port抽象_需求.md §2–§6 与技术设计 23。
  blocker：引擎仍直 fs/sqlite 实现、无注入、engineIOModule 进 Client、行为不等价、文档未回写、quality 红。

fixer_extra: |
  只修审查与 verify 确认问题；禁止无关重构。
  引擎任务 quality:engine；Studio/IO 任务 quality:studio；收口两者皆跑。

workflow_dir: .ai-workflow-v2-engine-io-ports
adapter: table
---

# Studio V2.0 · 引擎存取 Port 抽象执行索引

> **用法：**  
> `node .cursor/skills/general-batch-exe/bin/gbx.js --exFile docs/AI和人类/里程碑/v2.0/引擎存取Port抽象_执行索引.md --workdir . --dry-run`  
> **独立 workflow：** `.ai-workflow-v2-engine-io-ports/`  
> **前置：** Client/Server 隔离规则与门禁已落地；本批专注引擎存取拆分。

本文回答：**Port 协议 + IO 物理迁出 + Host 装配**按什么顺序做、做到哪算完。  
需求真源：**[引擎存取Port抽象_需求.md](./引擎存取Port抽象_需求.md)**。  
协议真源：**[23-引擎存取Port与IO适配.md](../../技术设计文档/23-引擎存取Port与IO适配.md)**。

---

## 0. 已钉死口径

### 0.1 范围边界

| 做 | 不做（本轮） |
|----|----------------|
| 引擎 Port 接口 + 注入 | 浏览器本地 IO / IndexedDB |
| 现网 JSON+fs+SQLite 迁入 `engineIOModule` | 改剧情 / Effect 语义 |
| Host 装配走注入 | 云同步产品化 |
| validate 读盘经 Port | 把全部 Studio BFF CRUD 并入 Port |
| 文档 23 + 18/19/20/README 收口 | 编辑 `docs/人类/` |

### 0.2 推荐刀序

```text
V2-IO-1   文档已齐：需求/索引/23/README 入口核对（只读确认或补缺口）
V2-IO-2   引擎：补齐 Content/Profile/EngineLog Port 类型并导出；扩展 createEngineHost 注入面
V2-IO-3   建 apps/studioV2/engineIOModule 骨架（目录 + Server 边界注释）
V2-IO-4   迁出 Sqlite Memory 实现；Host 默认改为注入或由装配创建
V2-IO-5   迁出 Profile 读/写 IO；引擎改调 ProfilePort
V2-IO-6   迁出 Workspace/Content 加载 IO；引擎 loadWorkspace 经 Port
V2-IO-7   迁出 EngineLog IO；WET/jsonl 经 Port
V2-IO-8   validatePackage 解耦 fs：规则留引擎，读包经 Content Port
V2-IO-9   StudioV2 Host/API 装配：创建 engineIOModule → 注入 Host
V2-IO-10  门禁：Client 禁 engineIOModule；quality:engine/studio 绿；回归测
V2-IO-11  回写 18/19/20、engine-boundaries、AGENTS 过期句
V2-IO-12  验收勾选需求 §6；删除引擎内遗留 IO 实现文件（无兼容转发壳）
```

`group: order`：严格按表取 ⬜。

> **gbx 表解析注意：** 任务单元格勿写英文 `status`、勿写「状态」子串。

### 0.3 全批声明

```text
行为目标：本机存取行为 ≡ 迁前；引擎包无 fs/sqlite 实现
verify：quality:engine + quality:studio
max_rounds：80
```

---

## 1. 任务表

| 状态 | ID | 任务 | verify |
|------|-----|------|--------|
| ✅ | V2-IO-1 | **口径确认**：对照需求 §2–§4 与技术设计 23；缺口只补文档不写业务代码 | true |
| ✅ | V2-IO-2 | **引擎 Port 面**：导出 Content/Profile/EngineLog（+既有 Memory）类型；`createEngineHost` 注入选项与缺省策略钉死 | npm run quality:engine |
| ✅ | V2-IO-3 | **engineIOModule 骨架**：`apps/studioV2/engineIOModule/` 目录职责说明；禁止 Client 引用 | npm run quality:studio |
| ✅ | V2-IO-4 | **Memory 迁出**：`sqliteMemoryPort` → engineIOModule；引擎测用假 Port 或测试注入 | npm run quality:engine |
| ✅ | V2-IO-5 | **Profile 迁出**：读/写薄 Profile 经 ProfilePort；删除引擎内直写 fs 真源 | npm run quality:engine |
| ✅ | V2-IO-6 | **Content/Workspace 迁出**：loadWorkspace 扫描/读 JSON 经 ContentPort | npm run quality:engine |
| ✅ | V2-IO-7 | **EngineLog 迁出**：jsonl 追加/切片经 LogPort | npm run quality:engine |
| ✅ | V2-IO-8 | **validate 读盘解耦**：validatePackage（及同类）不直接 `readFile`；由 Port 提供包内容 | npm run quality:engine |
| ✅ | V2-IO-9 | **装配**：StudioV2 创建 engineIOModule Ports 并注入 Host（API/单例处） | npm run quality:studio |
| ✅ | V2-IO-10 | **门禁与回归**：Client 禁 engineIOModule；host/memory/validation 测绿；隔离 005/020 仍为 0 | npm run quality:engine · npm run quality:studio |
| ✅ | V2-IO-11 | **文档收口**：18/19/20、engine-boundaries、AGENTS、README 用法与 23 交叉链接一致 | true |
| ✅ | V2-IO-12 | **删遗留实现 + 验收**：引擎包无 IO 实现残留/转发壳；需求 §6 勾选 | npm run quality:engine · npm run quality:studio |

---

## 2. 批次出口（每批结束后）

- 本批任务均为 ✅
- 任务 `verify` / `verify_default` exit 0
- Reviewer：`reviews/latest.json` 中 `blocker=0` 且 `critical=0`
- 无 hard_stop 命中

---

## 3. 人工验收（批末）

- [ ] 本机 Studio 读包 / 存 Profile / Memory / 日志路径与迁前一致
- [ ] 引擎包可被「无 fs 的测试宿主」仅靠假 Port 跑通核心单测
- [ ] 未引入浏览器本地 IO
