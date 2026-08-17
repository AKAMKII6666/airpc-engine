# memory/

**MemoryPort** 本机 Sqlite 实现（自 `packages/rpg-engine` 的 `sqliteMemoryPort` 迁入）。

- 入口：`createSqliteMemoryPort(dbPath)`；装配工厂经 `createEngineIOPorts(dataRoot)` 注入
- 实现：`sqlite/{db,query,write,util}/`
- 默认库路径：`<dataRoot>/memory/memory.sqlite`
- **写入：** `commitAfterCall` 包 transaction；按 `userId + agentId + callId + layer + kind + content_hash` 幂等
- **投影：** 热层含 semantic / call_summary / vignette / shared_event / emotion / identity_note / promise / social_share + 近 rollup
- **不负责抽取：** LLM 结构化抽取在 Studio `src/utils/server/memory/`（Orchestrator 包装后再注入 Host）
- **Server 区**：禁止 Client 引用
