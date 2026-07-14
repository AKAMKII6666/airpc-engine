---
name: code-quality-audit
description: >-
  Read-only codebase audit against .cursor/rules and project quality gates;
  writes a versioned report to docs/AI与人类/归档/代码审查/. Use when the user
  asks for 代码质量治理、规范审查、全库代码审查、第N次代码审查、
  @code-quality-audit, or periodic repo hygiene review. Default does not modify app/ code.
---

# Code Quality Audit（代码质量治理审查）

按 `.cursor/rules/` 与项目质量门禁，对仓库做 **只读** 规范审查，输出 **版本滚动** 的归档报告到 `docs/AI与人类/归档/代码审查/`。

与 `@batch-execute`（按改进计划改代码）、Bugbot（看 diff）、Codex PR 审查（`codex-review-boundaries.md`）分工不同：本 skill 做 **周期性基线体检**，不是单次 PR 或功能开发。

## 何时使用

- 用户提到：代码质量治理、规范审查、全库扫描、第 N 次审查、`@code-quality-audit`
- 周期性地对照 `.cursor` 规则核对实码
- **不要**用于：修单个 bug、实现功能、仅审查未提交 diff（用 Bugbot / Codex 提示词）

## 用户怎么触发

解析用户消息中的参数（缺省用默认值）：

| 参数 | 默认 | 说明 |
|------|------|------|
| `scope` | `app+tests+scripts` | `app` / `dashboard` / `server` / `bis` / `full`（含 tests+scripts） |
| `compare` | `latest` | 与目录内最新 `第*次*.md` 报告做 delta（§ 相对上次闭合项） |
| `write_plan` | `false` | 是否另写 `第N次代码审查改进计划.md` |
| `fix` | `false` | 为 `true` 时仅当用户**明示**「审查并修复」；默认只写报告不改 `app/` |
| `verify` | 见 § 自动化门禁 | 轮末必跑命令；失败如实写入报告，不得声称通过 |

**示例 invocation：**

```text
@code-quality-audit scope=app compare=latest
@code-quality-audit scope=full write_plan=true
@code-quality-audit 第四次代码审查
```

## 必读材料（PREPARE）

按顺序最小阅读：

1. `.cursor/rules/codingRole.mdc`、`frontend-layering.mdc`、`backend-boundaries.mdc`
2. `.cursor/rules/code-style.mdc`、`code-style.client.mdc`、`code-style.server.mdc`
3. `.cursor/rules/testing-and-quality.mdc`、`xhr-and-async.mdc`、`security-and-trust.mdc`
4. `docs/AI文档/工程/codex-review-boundaries.md`（严重度 P0/P1/P2、Mock 分级、V1 勿误报）
5. `docs/AI与人类/归档/代码审查/README.md` + **上一份** `第*次代码审查结果.md`
6. `AGENTS.md` §质量门禁、§不可变契约
7. 接线/V1 缺口真源：`docs/AI与人类/工程/前端/mock-to-production.md`（**产品缺口 ≠ 规范缺陷**）

## 版本与输出路径

**报告目录（固定）：** `docs/AI与人类/归档/代码审查/`

**文件名规则（滚动版本）：**

1. `glob` 该目录下 `第*次*.md`（含 `第一次.md` 等历史命名）
2. 解析已有最大序号 N（「第一次」=1，「第二次」=2，「第三次代码审查结果」=3）
3. 新报告：**`第{N+1}次代码审查结果.md`**
4. 若 `write_plan=true`：**`第{N+1}次代码审查改进计划.md`**（结构对齐 [第二次代码审查改进计划.md](../../../docs/AI与人类/归档/代码审查/第二次代码审查改进计划.md)）

**必须同步：** 更新同目录 `README.md` 的「规范评审报告」表格一行。

**禁止：** 未经用户明示「固化 harness」，不得修改 `docs/AI文档/`。

## 单轮工作流（必须按顺序）

```
1. PREPARE  — 读规则与上一份报告（见上）
2. VERSION  — 确定 N+1 与输出文件名
3. AUTOMATED — 跑自动化门禁（见下）；记录 stdout/exit code
4. MANUAL   — 按 [scan-checklist.md](./scan-checklist.md) grep/抽样
5. CLASSIFY — P0/P1/P2/P3 + 区分「规范缺陷」vs「V1 产品缺口」
6. DELTA    — 对照上一份 § backlog / 问题清单：已闭合 / 仍开放 / 新增
7. WRITE    — 填 [report-template.md](./report-template.md) 写入新报告
8. INDEX    — 更新 README.md
9. REPORT   — 向用户摘要：结论、新文件路径、建议是否 @batch-execute 改进计划
```

默认 **不改** `app/`、`tests/` 源码。用户要求 `fix=true` 时，先完成报告，再询问或转 `@batch-execute` 改进计划，避免审查与修复混在一轮无文档快照。

## 自动化门禁（AUTOMATED）

**必跑（按顺序，失败写入报告）：**

```bash
npm run check:rules
npm run check:production-imports
npm run lint
npm run typecheck
```

**可选（scope=full 或用户要求时）：**

```bash
npm run check:env
npm run check:script-entrypoints
npm run test:body-limits
# npm run check  # 慢；仅用户要求全量时
```

**typecheck 环境失败时：** 可补充 `npx tsc --noEmit` 并标注「typegen 未完整执行」原因；**不得**写「typecheck 已通过」若主命令失败。

**报告须说明：** `check:rules` **未覆盖** 项见 [scan-checklist.md](./scan-checklist.md)（UI→toast、bis→routes/com、TSX 行数等）。

## 严重度（CLASSIFY）

与 `codex-review-boundaries.md` 对齐：

| 级别 | 含义 | 示例 |
|------|------|------|
| **P0** | 硬边界/安全/契约 | `check:rules` 失败、客户端 import server、生产静态 Mock import |
| **P1** | 明确规则违反 | bis import routes/com、UI toast、非 shell bis import react-router、lint error |
| **P2** | 可维护性 | 超大 TSX(>350)、类型在 routes/com、目录平铺难导航 |
| **P3** | 卫生 | 缺模块头、registry 缺生命周期注释、warnings |

**不算规范缺陷（勿误报为 P0）：**

- Mock 读时推进时序与真 JM 差异（P2 非缺陷，见 codex §3.5b）
- V1 已知缺口：Retry check、Metafield、真 JM E2E（见 mock-to-production）
- 不可变契约 A/B 相关 Cancel/Billing 语义

## 改进计划（write_plan=true）

另建 `第N次代码审查改进计划.md`，建议批次：

```text
批次 A — P1 硬违规（分层、lint error、console.log）
批次 B — P2 可维护性（类型上收、helpers 迁 bis/utils）
批次 C — P2 目录治理（独立 PR，同步 import 与 check:production-imports）
批次 D — P3 注释/文档卫生
```

每批含 `verify` 列（typecheck / lint / check:rules / 具体测试）。修复执行用 `@batch-execute`，不要在本 skill 内一口气改完。

## 完成报告模板

正文结构见 [report-template.md](./report-template.md)。文首元数据：

```markdown
> **文档层级：** AI与人类
> **状态：** 归档
> **读者：** 工程
> **记录日期：** YYYY-MM-DD
> **审查范围：** …
> **评审依据：** `.cursor/rules/`、…
> **前置审查：** [第N-1次…](./第N-1次代码审查结果.md)
```

## 与 batch-execute 的衔接

| 阶段 | Skill |
|------|-------|
| 出报告 | `@code-quality-audit` |
| 按 backlog 修代码 | `@batch-execute docs/.../第N次代码审查改进计划.md batch_size=3` |
| PR 前 diff 审查 | Codex 提示词 / Bugbot |

## 附加资源

- 报告填空模板：[report-template.md](./report-template.md)
- 人工扫描项：[scan-checklist.md](./scan-checklist.md)
- 触发示例：[examples.md](./examples.md)
