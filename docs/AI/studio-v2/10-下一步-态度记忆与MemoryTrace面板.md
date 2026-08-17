# 10. 下一步：态度记忆 + Memory Trace 成品面板

> 给后续 Agent 的开工单。事实记忆抽取主链已完成，见 [09](./09-记忆Commit与Trace.md)、[需求 12](../../AI和人类/需求/12-记忆模型.md)。  
> **不要**重做 Orchestrator / 完整 transcript 抽取 / Port 分层落库。  
> 先读规则，改完跑测试和门禁，有问题自己修到通过。不要跑浏览器 E2E，不要自动 commit。

建议顺序：先做 **Memory Trace 成品面板**（API 已有），再做 **态度记忆**。

---

## 1. 独立 Memory Trace 成品面板

**现状：** 挂机 overlay 有几行摘要；`GET /api/debug/call/memory-trace?dtoId=` 已能读 DTO；全量在 `data/debug-dto/memory-commits/<sessionId>.json`。这还不是成品面板。

**要做：** 调试器右侧做一个常驻/可点开的 Memory Trace 面板（对标现有 Prompt Trace），通话结束后能回看本通抽取，不必只在挂机遮罩里扫一眼。

面板至少要能看见：

- 本通是否 committed / skipped，以及原因
- 写入了哪些 layer/kind、entry ids
- LLM 输入、原始输出、清洗后字段的**短预览**
- 过滤计数（raw / sanitized / filtered）和 exclusionSeed 数量

约束：

- 复用现有 API 和 DTO，不要另起一套存储
- UI 只显示裁剪预览，禁止把完整 transcript/prompt 堆成 JSON 墙
- 挂机 overlay 可保留（实时进度），成品面板负责事后回看
- Client / Server 隔离：类型在 `typeFiles/` 镜像，不要从引擎 import
- 落点优先：`DebuggerContextPanel` 旁新面板，或与 Prompt Trace 同列

---

## 2. 态度记忆

**现状：** 现在抽的是事实/摘要/情绪/共同经历。`emotion` 是「这通电话玩家情绪」，**不是**「这个 NPC 对这个玩家长期持什么态度」。

**要做：** 给「NPC 对**当前这个玩家**的态度」单独一层记忆。例如亲近、防备、在意、觉得被敷衍——来自双方互动，不是玩家自我陈述，也不是角色人设。

约束：

- **单独字段、单独落层**，禁止写进 `userFacts`
- 仍走现有三层：Engine 只扩契约；Studio Orchestrator 抽；Port 只存
- 完整 transcript 给 LLM；程序做 schema / 过滤；opening、idle、工具结果、角色预设观点不得当成态度证据
- 下一通普通对话可注入热层；**unknown inbound 首句**仍禁止用态度去认出用户
- 可借鉴旧库 `doubaoSister` 的「目标形态」，不要照搬它的文件结构和实现
- 幂等 + 事务沿用现有 `content_hash` / `commitAfterCall` transaction
- 态度记忆后置不等于不做投影：写了就要能 `projectForCall` 看到

建议字段形态（可微调，但必须类型化）：

```text
attitudeTowardUser: {
  stance: string        // 如 warming / wary / fond / distant
  summary: string       // 一句人话：这个角色现在怎么看待这个玩家
  evidence?: string     // 本通依据，短
}
→ 落层建议：relational / attitude   （不要用 semantic）
```

---

## 3. 验收

- 有针对性单测；`npm run typecheck -w @airpc/studio-v2`、`npm run typecheck -w @airpc/rpg-engine`、相关测试、`npm run check:engine-imports` 要过
- 根 `npm run typecheck` 若因 `packages/rpg-engine/dist` `EACCES` 失败，那是环境权限，不是类型错误
- 同步改 [12](../../AI和人类/需求/12-记忆模型.md) 和本目录 09；做完把本文件两项勾掉
- 不碰 `data/users/demo-user/profile.save.json`、`data/debug-dto/`、`data/memory/*.sqlite`
