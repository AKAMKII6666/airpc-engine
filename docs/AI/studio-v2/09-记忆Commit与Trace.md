# 09. 记忆 Commit 与 Trace（代码事实）

> 固化：2026-08-17。对照当前未提交工作区实现。  
> 产品真源：[12-记忆模型](../../AI和人类/需求/12-记忆模型.md)。工程：[20](../../AI和人类/技术设计文档/20-记忆存储与投影.md) · [23](../../AI和人类/技术设计文档/23-引擎存取Port与IO适配.md)。

## 1. 现在怎么跑

```text
endCall
  → Engine Free/Story 管线
       memoryCommitContext() 收集 exclusionSeeds / prompt·tool refs
  → Studio Orchestrator（包在 MemoryPort 外）
       完整 transcript → LLM 结构化 JSON → verifier
       态度抽取另起一次 LLM，带角色视角 + 最近态度参考
       两条抽取 LLM 均显式 `enable_thinking: false`，避免 qwen3.5-flash 思考拖慢挂机收尾
       写 debug-dto/memory-commits/<sessionId>.json
  → SqliteMemoryPort.commitAfterCall
       transaction + content_hash 幂等
       至少 call_summary；结构化字段分层 insert
```

**不要**把抽取逻辑再塞回 `engineIOModule/memory` 或引擎包。

## 2. 落点

| 职责 | 路径 |
|------|------|
| 契约 | `packages/rpg-engine/src/memory/types.ts` |
| Engine 污染源投影 | `packages/rpg-engine/src/runtime/memoryCommitContext.ts` |
| Free / Story 挂机接线 | `freeCallPostPipeline.ts` / `storyCallMemoryCommit.ts` |
| 抽取 + verifier | `apps/studioV2/src/utils/server/memory/memoryCommitExtractor.server.ts` |
| Orchestrator | `.../memoryCommitMemoryPort.server.ts`（`createMemoryCommitOrchestratingPort`；旧名兼容） |
| Host 装配 | `apps/studioV2/src/utils/server/host/engineHost.server.ts` |
| SQLite 写入/投影 | `apps/studioV2/engineIOModule/memory/` |
| Trace 读 API | `GET /api/debug/call/memory-trace` ← `debuggerMemoryTrace.server.ts` |
| 挂机 overlay | `PostCallEffectOverlay.tsx` + `useDebuggerPrototypeSession.ts` |

## 3. 字段落层（实现已钉）

| 字段 | layer / kind |
|------|----------------|
| summaryText | episodic / call_summary |
| vignettes | episodic / vignette |
| userFacts | semantic / semantic |
| emotion | affect / emotion |
| sharedEvents | relational / shared_event |
| promises | commitments / promise |
| identityNote | profileNotes / identity_note |
| socialShareCandidates | relational / social_share |
| attitude | relational / attitude（text 人话 + payload_json 结构化） |

没有 userFacts 也要写 `call_summary`。NPC 自述 / 命理工具结果不得进 userFacts。

## 4. 已踩过的坑

- 用正则先切「只剩用户句」再喂 LLM：防污染过窄，共同经历/情绪抽不出来。正确姿势是完整 transcript + 程序字段审查。
- 「无候选就不调 LLM」会把空记忆伪装成成功。
- `writtenEpisodicIds` 已装各层 id；新代码用 `writtenEntryIds`。
- 根 `npm run typecheck` 可能因 `packages/rpg-engine/dist` 权限 `EACCES` 失败，不代表类型错误。
- `data/users/demo-user/profile.save.json`、`data/debug-dto/`、`data/memory/*.sqlite` 是运行态，不要当功能 diff 提交。

## 5. 已完成

- 态度记忆：`relational/attitude`，每次通话追加；带 `stance/summary/evidence/keywords` payload，供溯源。
- 独立 Memory Trace 成品面板：调试器右侧待机态「上下文 / Memory Trace」双 Tab，复用 DTO 与 API。
