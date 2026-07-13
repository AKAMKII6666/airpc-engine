# airpc-engine · Agent 导航

独立 **AI-RPG NPC 引擎** + **B/S Studio**（localhost）。电话壳不在本仓；走通后壳直接链引擎。

## 必读

1. [docs/AI和人类/需求/00-文档索引.md](docs/AI和人类/需求/00-文档索引.md) — 产品总纲  
2. [docs/AI和人类/里程碑/项目初始执行索引.md](docs/AI和人类/里程碑/项目初始执行索引.md) — **写代码分期顺序**  
3. [docs/AI和人类/技术设计文档/00-技术设计索引.md](docs/AI和人类/技术设计文档/00-技术设计索引.md) — 工程分册入口  
4. [docs/AI和人类/技术设计文档/19-引擎宿主与会话模型.md](docs/AI和人类/技术设计文档/19-引擎宿主与会话模型.md) — Host / CallSession  
5. [docs/AI和人类/技术设计文档/21-Studio客户端分层.md](docs/AI和人类/技术设计文档/21-Studio客户端分层.md) — Zustand · bis · shell  
6. [.cursor/rules/codingRole.mdc](.cursor/rules/codingRole.mdc) — 编码铁律  

## 拓扑

```text
Browser (React + MUI + scss module + Zustand/bis/shell)
  → Next API 门面
  → EngineHost 单例
  → data/（Content JSON + 薄 Profile + Memory SQLite + logs）
```

## 仓库目标结构

```text
packages/rpg-engine/
apps/studio/
data/                  # storis-packages/ + characters/ + users/ + logs/
docs/人类/
docs/AI和人类/需求/           # 产品需求
docs/AI和人类/技术设计文档/   # 工程定稿（选型/拓扑/Host/导出/版本）
docs/AI和人类/里程碑/         # 实现分期 / 执行索引
docs/AI/
.cursor/rules/
```

## 铁律摘要

- Profile 按用户；Host 单例；CallSession 内存  
- 通话中不推进；Free → PostPipeline  
- 故事列表 → UserGate → 画布；调试与编辑分离  
- UI：仅 MUI + scss module；客户端 **Zustand · bis · shell**（见技术设计 21）  
- 引擎不进 client；Memory = SQLite  

## 常用命令

```bash
npm install                 # 根目录 workspace
npm run dev                 # Studio → http://localhost:3000
npm test                    # 引擎 Vitest + import 门禁（含 P1 Manual 闭环）
npm run check:engine-imports
npm run typecheck
npm run build
```
