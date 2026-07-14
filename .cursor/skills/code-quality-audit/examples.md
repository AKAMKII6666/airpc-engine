# Code Quality Audit — 示例

## 1. 标准全库审查（只写报告）

**Invocation：**

```text
@code-quality-audit scope=app+tests+scripts compare=latest
```

**Agent 行为：**

1. 读 `.cursor/rules/` 与 `codex-review-boundaries.md`
2. 读 `第三次代码审查结果.md`，确定下一文件为 `第四次代码审查结果.md`
3. 跑 `check:rules`、`check:production-imports`、`lint`、`typecheck`
4. 按 `scan-checklist.md` grep UI toast、bis→routes/com 等
5. 写报告 § Delta 对照第三次 § backlog
6. 更新 `docs/AI与人类/归档/代码审查/README.md`
7. 回复用户：摘要 + 新文件路径

**不改** `app/` 源码。

---

## 2. 审查 + 改进计划

```text
@code-quality-audit scope=full write_plan=true
```

额外输出 `第N次代码审查改进计划.md`，批次 A/B/C 表格含 `⬜` 与 verify 列。

用户后续：

```text
@batch-execute docs/AI与人类/归档/代码审查/第四次代码审查改进计划.md batch_size=3
```

---

## 3. 仅 Dashboard 域

```text
@code-quality-audit scope=dashboard
```

`scope=dashboard` 等价审查：

- `app/routes/app.dashboard/**`
- `app/bis/dashboard/**`、`app/bis/shell/dashboard/**`
- `app/server/dashboard/**`
- 相关 `types/frontEnd/xhr/dashboard/`、`ajaxHelper/dashboard*.ts`

自动化门禁仍跑全库（架构边界全局）；报告问题只列 Dashboard 相关，其他域标注「未抽样」。

---

## 4. 用户指定「第五次」

```text
@code-quality-audit 做一次代码质量审查
```

Agent 自行 glob `第*次*.md` 计算 N+1，**不要**假设当前是第几次，以目录现有文件为准。

历史命名兼容：

- `第一次.md` → N=1
- `第二次.md` → N=2
- `第三次代码审查结果.md` → N=3

新文件统一：**`第{N+1}次代码审查结果.md`**

---

## 5. 用户要求「审查并修复」（需谨慎）

```text
@code-quality-audit fix=true
```

推荐流程：

1. 仍先完成报告与（可选）改进计划
2. 询问用户是否立即 `@batch-execute` 批次 A，或仅留 backlog

**不要**在无报告快照的情况下直接大范围改代码。

---

## 6. 与 Codex PR 审查的区别

| | code-quality-audit | Codex PR 提示词 |
|---|-------------------|-----------------|
| 范围 | 基线全库/域 | 当前 diff |
| 输出 | 归档 Markdown | 评论/对话 |
| Mock 误报 | 按 codex §3.5b 分级 | 同 |
| 改代码 | 默认否 | 否 |

PR 前仍用 `docs/AI与人类/归档/代码审查/Codex-PR审查提示词-v2.md`；季度/里程碑用 `@code-quality-audit`。

---

## 7. 门禁失败时的报告写法

**正确：**

```markdown
| `npm run lint` | ❌ 失败 | 13 errors / 55 warnings；明细见下表 |
| `npm run typecheck` | ⚠️ 未完整 | typegen EACCES；已补充 `npx tsc --noEmit` ✅ |
```

**错误：**

- 「lint 基本通过，只有 warnings」—— 当 errors > 0 时
- 「typecheck 已通过」—— 当 `npm run typecheck` exit ≠ 0 且未说明

---

## 8. Delta 表示例

```markdown
## 二、相对上次审查（Delta）

| 上次（第三次）backlog | 本次状态 |
|------------------------|----------|
| bis 反向 import devVideoCompressCompareModal helpers | ⏳ 仍开放 |
| UI toast 在 replacement modal | ⏳ 仍开放 |
| billing shell / UI 脱 store | ✅ 已闭合（check:rules 0） |
| lint 13 errors | 🆕 第三次未全量跑 lint；本次首次记录明细 |
```
