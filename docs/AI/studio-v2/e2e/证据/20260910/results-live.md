# R2 现场结果摘要 · 20260910

- 入口：http://localhost:8562
- 报告：../../报告/E2E报告-20260910.md
- 合计：Pass 11 · Fail 1 · Blocked 9

## 关键证据

- free Trace：softContext 含 `memory`、`conversation.inertia`（R2-DBG-022 Fail）
- 角色：`agent_f66cd8aa4f7d416aae163ae59fb6a93e` / e2e_r2_char_0910
- 玩家：`user_1749dc46d0df4dbca10de941dbd986d3` / e2e_r2_user_0910
- 通话 dto：`data/debug-dto/call-sessions/664b122b-0c72-4a51-825a-9d442208f8b6.json`
- LLM：lore bootstrap / call message stream 出现 Access denied / fetch failed
