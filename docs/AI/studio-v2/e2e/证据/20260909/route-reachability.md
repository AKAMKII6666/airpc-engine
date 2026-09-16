# 路由可达性补充探测 · 2026-09-09

来源：[批量路由可达性探测](936ae4a7-34ef-47cd-86c9-46794e815431)（只读 curl，非 UI 操作；佐证 NAV / HTTP 层）

| route | http_code | redirect_to | notes |
|---|---|---|---|
| `/` | 200 | — | title=AirPC Studio V2 |
| `/packages` | 200 | — | |
| `/packages/create` | 200 | — | |
| `/packages/import` | 200 | — | |
| `/packages/export` | 200 | — | |
| `/packages/wrong_number_act1` | 200 | — | |
| `/packages/wrong_number_act1/chapters/wrong_number_act1` | 200 | — | |
| `/stories/wrong_number_act1` | 307 | `/packages/wrong_number_act1/chapters/wrong_number_act1` | follow → 200；对齐 NAV-020 |
| `/characters` | 200 | — | |
| `/assets` | 200 | — | |
| `/users` | 200 | — | |
| `/debugger` | 200 | — | |
| `/settings` | 200 | — | |
| `/api/characters` | 200 | — | ok；5 角色 |
| `/api/users` | 200 | — | ok；1 用户 |
| `/api/assets` | 200 | — | ok；3 资源（列表 API 存在） |

与 [E2E报告-20260909](../报告/E2E报告-20260909.md) 一致：不改变用例判定；仅作 HTTP 层旁证。
