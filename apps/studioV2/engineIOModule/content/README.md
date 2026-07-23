# content/

**ContentPort** 本机实现（扫 Workspace / 读包与卡 / validate 装包 / 资产 meta）。

- 刀序：V2-IO-6 ✅（validate 规则仍走引擎内 fs，读盘解耦见 V2-IO-8）
- 入口：`createFsContentPort()` → `createEngineIOPorts`
- **Server 区**：禁止 Client 引用
