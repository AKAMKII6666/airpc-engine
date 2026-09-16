# 修复回归现场摘要 · 20260910

- 入口：http://localhost:8562
- 报告：../../报告/E2E报告-20260910-修复回归.md
- 表项 #1～#5：**均 Pass**

## 关键证据

- free Trace：`soft 0`；softContext 空；无 `[memory]` / `[conversation.inertia…]` 注入块
- 自由通话 chip → 号码 `010` → 白半仙接通；首句「喂？请问哪位？」
- 编辑器章 URL → UserGate → 画布（loading 可解除）
- 新建玩家性别折叠态显示「请选择」（value `""`）
- `/packages/export` 表单可见
- 单测：`debuggerLlmMessages` + `promptTraceOpeningIsolation` → 6 passed
