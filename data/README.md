# data/ 工作区

本地 Studio / 引擎读写的 JSON 工作区。约定见：

- [19-引擎宿主与会话模型](../docs/AI和人类/技术设计文档/19-引擎宿主与会话模型.md)
- [14-资源与媒体资产](../docs/AI和人类/需求/14-资源与媒体资产.md)

## 已含样例

| 路径 | 说明 |
|------|------|
| `storis-packages/golden_handoff/` | 黄金转介包（澜星介绍小雨） |
| `characters/` | 澜星、小雨 + free-cards |
| `tools/registry.json` | **非真源／预留**；运行时与校验以引擎 `builtinRegistry` 为准（见需求 13） |
| `memory/` | Memory SQLite 目录（实现后生成 `memory.sqlite`） |
| `users/demo-user/` | 薄存档（记忆不在 JSON 内嵌） |
| `assets/` | 全局资产库根（样例暂无媒体文件） |

`canvas.layout.json` 仅画布使用，引擎忽略。  
**Content JSON ≠ Memory SQLite**（见技术设计 20）。
