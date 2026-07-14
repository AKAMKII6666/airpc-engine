# 人工扫描清单

`npm run check:rules` **不覆盖** 下列项；审查时按 scope 执行 grep/抽样，结果写入报告 §五–§七。

## 1. 前端分层（frontend-layering.mdc）

| 扫描 | 命令/模式 | 违规含义 |
|------|-----------|----------|
| UI 直读 Store | `routes/**/com/**/*.tsx` + `useGlobalStore` | UI 须经 bis |
| UI 直调 toast | `routes/**/com/**` + `showAppBridgeToast` | 副作用应在 bis |
| UI 裸 fetch | `routes/**/com/**` + `\bfetch(` | 应走 ajaxHelper |
| 非 shell bis 用 react-router | `*.bis.ts` 非 `shell/` + `from "react-router"` | 仅 `*.shell.bis.ts` 允许 |
| bis → routes/com | `app/bis/**` + `@app/routes/` 且非 `routes/.../api` type-only | 反向依赖 |
| Store → bis | `app/store/**` + `@app/bis/` | Store 禁止 import bis |
| 客户端 → server/backEnd | `app/bis|store|utils|routes/**/com/**` + `@app/server` 或 `types/backEnd` | codingRole 硬边界 |

**允许：**

- shell/parse bis `import type { loader } from "@app/routes/.../api"`
- `*Flow.ts` / `*NavigationFlow.ts` 使用 `useNavigate`

## 2. Barrel 与 import

| 扫描 | 说明 |
|------|------|
| `app/store/index.ts` 等 | 禁止 barrel（check:rules 已查，可 spot-check） |
| `from "@app/store"` 无子路径 | 禁止 |
| `from "@app/uiComponents"` 无子路径 | 禁止 |

## 3. 日志与风格（code-style.client/server）

| 扫描 | 模式 | 说明 |
|------|------|------|
| 生产 console | `app/bis/**`、`app/routes/**/com/**` + `console.log` | 应 devOnlyWarn 或删除 |
| xhr 上传 log | `app/utils/stagedUpload/`、`app/utils/r2Upload/` + `console.log` | 同上 |
| server 非探针 log | `app/server/**` + `console.log`（排除 `*Smoke*`、testPage、debug） | 用 createModuleLogger |
| `any` | `\bany\b` in `app/**/*.ts(x)` | 记录文件与上下文 |
| `"use client"` / `"use server"` | 全库 | 禁止（Next 语义） |

## 4. 类型落点

| 扫描 | 说明 |
|------|------|
| `routes/**/com/**/*.types.ts` | 跨 bis/hooks 共享类型应上收 `types/frontEnd/bis/` |
| helpers 在 `routes/.../com/` 被 `app/bis/**` import | P1 迁 bis 或 utils |

## 5. 文件规模（默认执行，非阻断）

| 扫描 | 阈值 | 说明 |
|------|------|------|
| 编排 TSX 行数 | >350 | `wc -l routes/**/com/**/index.tsx` 等 |
| 大门面 server 文件 | >500 行 | 记录演进风险，非单独 P0 |

## 6. 目录组织（P2，抽样）

统计以下目录 **顶层** `.ts` 文件数（不含仅 `index.tsx` 组件入口）：

- `app/server/dashboard/`（`dev/` 是否已隔离）
- `app/server/businessBackend/`（`adapters/` 等子目录）
- `app/bis/dashboard/`

报告写「导航成本」与建议聚类方向，**不**在审查轮次直接大规模搬目录。

## 7. 注释与 registry（xhr-and-async.mdc）

| 扫描 | 说明 |
|------|------|
| 模块头缺失 | 新建规范要求 `模块名称 / 模块说明`；抽样 `app/server/` 无 `/**` 文件头比例 |
| 模块级 Map/Set | `compressTaskRegistry`、`activeReplacementUploadJob` 等是否说明 Shop/Tab/HMR 生命周期 |

## 8. 测试与临时 bypass

| 扫描 | 说明 |
|------|------|
| `app/**/*.test.ts` | 禁止（应在 `tests/`） |
| `TODO(test-revert-` | check:rules warn；合并前须清理 |

## 9. 产品缺口（记录但不计为规范缺陷）

对照 `mock-to-production.md`：

- CheckFailed Retry check
- Metafield 写回
- 真 JM E2E
- 分布式 webhook 队列

## 10. 不可变契约（勿误报）

审查时读 `AGENTS.md` §不可变契约、`codex-review-boundaries.md` §3.7：

- Cancel 不可逆
- Billing / 未订阅路由矩阵
- `V1_HIDE_STOP_OPTIMIZE_UI`

不要将上述记为「代码不规范」，除非实现与文档契约冲突。
