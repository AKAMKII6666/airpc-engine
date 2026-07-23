# engineIOModule · 本机引擎存取 IO

> **Server 区专用。** 禁止 `pageComponents` / `bis` / `stores` / `commonUiComponents` / `ajaxProxy` / `typeFiles` 及任何 `"use client"` 模块引用本目录。  
> 协议真源：[技术设计 23](../../../docs/AI和人类/技术设计文档/23-引擎存取Port与IO适配.md)。  
> 需求：[引擎存取Port抽象_需求.md](../../../docs/AI和人类/里程碑/v2.0/引擎存取Port抽象_需求.md)。

## 职责

本目录承载 **Studio V2 本机** 对引擎 Port 的 IO 实现（JSON+fs / SQLite / jsonl）。  
引擎只声明 Port；**不** import 本模块。装配发生在 Next API / Host 单例处：  
`createEngineIOPorts(dataRoot)` → `createEngineHost({ ...ports })`  
（实现：`src/utils/server/host/engineHost.server.ts`）。

## 目录

```text
engineIOModule/
  content/                 # ContentPort：Workspace / 包 / 角色 / 资产 meta 读（V2-IO-6 ✅）
  profile/                 # ProfilePort：薄 Profile 读写（V2-IO-5 ✅）
  memory/                  # MemoryPort：Sqlite 实现（V2-IO-4 ✅）
  log/                     # EngineLogPort：jsonl 追加与切片（V2-IO-7 ✅）
  createEngineIOPorts.ts   # 工厂：dataRoot → 四 Port 全套
```

## 谁可以引用

| 可引用 | 不可引用 |
|--------|----------|
| `app/api/**`、Host 装配、`*.server.ts`、`src/utils/server/**` | Client 区任一路径；浏览器 bundle |

## 不做

- 浏览器本地盘 / IndexedDB
- 改剧情 / Effect / Resolver 语义
- 把全部 Studio BFF CRUD 强行并入 Port（编辑写盘可仍走 `utils/server`）
