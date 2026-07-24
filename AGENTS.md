# airpc-engine · Agent 导航

独立 **AI-RPG NPC 引擎** + **B/S Studio**（localhost）。电话壳不在本仓；走通后壳直接链引擎。

## 必读

1. [docs/AI和人类/需求/00-文档索引.md](docs/AI和人类/需求/00-文档索引.md) — 产品总纲 
2. [docs/AI和人类/里程碑/对照本仓库文档的工程落地_100计划.md](docs/AI和人类/里程碑/对照本仓库文档的工程落地_100计划.md) — **工程 100% 已收口（E0–E11）**；维护者整体验收后开 1.1  
3. [docs/AI和人类/里程碑/项目第三步计划执行索引.md](docs/AI和人类/里程碑/项目第三步计划执行索引.md) — 第三步主线已收口（T0–T11）  
4. [docs/AI和人类/里程碑/项目第二步计划执行索引.md](docs/AI和人类/里程碑/项目第二步计划执行索引.md) — 第二步分期（S0–S11，已收口）  
5. [docs/AI和人类/里程碑/项目初始执行索引.md](docs/AI和人类/里程碑/项目初始执行索引.md) — 初始阶段分期（P0–P6a，已收口） 
6. [docs/AI和人类/技术设计文档/00-技术设计索引.md](docs/AI和人类/技术设计文档/00-技术设计索引.md) — 工程分册入口 
7. [docs/AI和人类/技术设计文档/19-引擎宿主与会话模型.md](docs/AI和人类/技术设计文档/19-引擎宿主与会话模型.md) — Host / CallSession 
8. [docs/AI和人类/技术设计文档/23-引擎存取Port与IO适配.md](docs/AI和人类/技术设计文档/23-引擎存取Port与IO适配.md) — 存取 Port；本机 IO = studioV2/engineIOModule 
9. [docs/AI和人类/技术设计文档/21-Studio客户端分层.md](docs/AI和人类/技术设计文档/21-Studio客户端分层.md) — Zustand · bis · shell（V2 硬门禁 STRUCT-021～024） 
10. [.cursor/rules/codingRole.mdc](.cursor/rules/codingRole.mdc) — 编码铁律 
11. [packages/rpg-engine/README.md](packages/rpg-engine/README.md) — 引擎使用说明 

## 拓扑

```text
Browser (React + MUI + scss module + Zustand/bis/shell)
  → Next API 门面（装配 engineIOModule → 注入 Host）
  → EngineHost 单例（纯逻辑 + Port）
  → engineIOModule → data/（Content JSON + 薄 Profile + Memory SQLite + logs）
```

## 仓库目标结构

```text
packages/rpg-engine/          # 纯逻辑 + Port 契约；用法见 README
apps/studio/
apps/studioV2/
  engineIOModule/             # 本机存取 IO（JSON+fs / SQLite / jsonl）
data/                         # storis-packages/ + characters/ + users/ + …
docs/人类/
docs/AI和人类/需求/
docs/AI和人类/技术设计文档/
docs/AI和人类/里程碑/
docs/AI/
.cursor/rules/
```
## 磁盘与 Registry 口径（S0 定稿）

- **故事包根目录正式名** = `data/storis-packages/`（拼写保持现状；全仓重命名另立项，不做本步强制迁移）
- **ToolRegistry v1 真源** = 引擎代码内置 `builtinRegistry`；`data/tools/registry.json` = **非真源／预留导出副本**（运行时无读路径）

## 铁律摘要

- Profile 按用户；Host 单例；CallSession 内存  
- 通话中不推进；Free → PostPipeline  
- 故事列表 → UserGate → 画布；调试与编辑分离  
- UI：仅 MUI + scss module；客户端 **Zustand · bis · shell**（见技术设计 21）  
- 引擎不进 client；存取经 Port（见 [23](docs/AI和人类/技术设计文档/23-引擎存取Port与IO适配.md)）；本机 IO = `engineIOModule`；Memory = SQLite  

## 常用命令

```bash
npm install                 # 根目录 workspace
npm run dev                 # Studio → http://localhost:3000
npm test                    # 引擎 Vitest + import 门禁（含 P1 Manual 闭环）
npm run check:engine-imports
npm run typecheck
npm run build
```
