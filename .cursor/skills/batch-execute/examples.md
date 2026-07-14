# Batch Execute — 示例

## 1. Mock 对齐 v19.3（本项目）

**任务文件：** `docs/AI与人类/任务与进度/里程碑/Mock对齐协议v19.3任务计划.md`

**Invocation：**

```text
@batch-execute docs/AI与人类/任务与进度/里程碑/Mock对齐协议v19.3任务计划.md §4.1 batch_size=3 stop_on_fail=true
```

**Agent 行为：**

1. 只读 §4.1 表中 `⬜` 行，取前 3 项（如 M1-1～M1-3）
2. 实现额度 prehold 等代码；并行更新 §8.1 所列测试
3. 轮末：`npm run typecheck` + `npm run test -- tests/server/businessBackend/mockOptimizationQuotaSettlement.test.ts`（按各任务 verify 列）
4. 勾选 M1-1～M1-3；§9 变更记录加一行
5. 自动 Round 2：M1-4～M1-6 … 直到 §4.1 无 ⬜ 或 `max_rounds`

**跨章节：**

```text
@batch-execute ...Mock对齐协议v19.3任务计划.md from=M2 batch_size=2
```

从第一个 M2-* 的 ⬜ 开始。

**仅文档轮：**

```text
@batch-execute ...Mock对齐协议v19.3任务计划.md §4.8 batch_size=2
```

只处理 D-* 文档任务，不改代码（除非文档任务明确要求）。

---

## 2. 简易 checklist（任意文件）

```markdown
## 待办

- [ ] T-1 修 foo.ts
- [ ] T-2 补 foo.test.ts
- [x] T-0 已完成
```

```text
@batch-execute path/to/checklist.md batch_size=1
```

每轮一项，适合高风险改动。

---

## 3. 里程碑分组（不拆 M 组）

```text
@batch-execute path/to/plan.md group=milestone batch_size=99
```

`group=milestone`：本轮只做同一 `M1` / `M2` 前缀下的 ⬜；若 M1 剩 8 项且 batch_size=3，则分多轮但仍只在 M1 内，**不**在 M1 未完成时开 M2。

---

## 4. 中断与续跑

用户说：

```text
继续 @batch-execute docs/.../Mock对齐协议v19.3任务计划.md
```

从文件中 **第一个仍为 ⬜ 的 ID** 继续，不重复已 ✅ 项。

---

## 5. 失败示例

Round 2 中 `npm run test` 失败：

- `stop_on_fail=true`（默认）→ 不勾选本轮项、不进入 Round 3；Round Report 说明失败用例与建议
- 用户修复环境或代码后：`继续 batch` 从失败轮重试
