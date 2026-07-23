# memory/

**MemoryPort** 本机 Sqlite 实现（自 `packages/rpg-engine` 的 `sqliteMemoryPort` 迁入）。

- 入口：`createSqliteMemoryPort(dbPath)`；装配工厂经 `createEngineIOPorts(dataRoot)` 注入
- 实现：`sqlite/{db,query,write,util}/`
- 默认库路径：`<dataRoot>/memory/memory.sqlite`
- **Server 区**：禁止 Client 引用
