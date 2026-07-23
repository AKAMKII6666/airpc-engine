# log/

**EngineLogPort** 本机 jsonl 实现（WET/旁路日志追加与切片读）。

- 工厂：`createFsEngineLogPort(dataRoot)` → `data/logs/engine-YYYYMMDD.jsonl`（UTC）
- 刀序：V2-IO-7 ✅
- **Server 区**：禁止 Client 引用
