# 引擎 Composer / Prompt Provider 代码事实索引

> 对照：`packages/rpg-engine` + `apps/studioV2/src/utils/server/debugger/session/`。  
> 产品管道：[需求 50](../../AI和人类/需求/50-对话与模型适配.md) §5；Host 真源：[技术设计 19](../../AI和人类/技术设计文档/19-引擎宿主与会话模型.md) §2.1。  
> 更新：Opening / Prompt / Memory 补强后；本文只记录当前代码事实，不替代需求文。

## 1. 核心文件

| 文件 | 职责 |
|------|------|
| `packages/rpg-engine/src/runtime/composer.ts` | `composeRenderedPrompt`、`DraftPrompt`、`PromptProvider`、`PromptProviderContext`；循环执行 registry |
| `packages/rpg-engine/src/runtime/promptProviderRegistry.ts` | Provider Registry；冻结 provider 顺序；校验 `providerId` 唯一 |
| `packages/rpg-engine/src/runtime/defaultPromptProviders.ts` | 引擎内置 provider 链 |
| `packages/rpg-engine/src/runtime/openingSituationResolver.ts` | 判断 opening situation；不直接推进状态 |
| `packages/rpg-engine/src/runtime/promptPhoneBlocks.ts` | 电话口语、call source、scheduled callback、missed outbound、conversation inertia 等块 |
| `packages/rpg-engine/src/runtime/personalityPrompt.ts` | persona / personalityCode / 角色级风格 hard block |
| `packages/rpg-engine/src/host/createEngineHost.ts` | `beginCall` 提升 `RenderedPrompt.openingFirstTurn`；`consumeOpeningFirstTurn` 幂等消费 |
| `apps/studioV2/src/utils/server/debugger/session/debuggerConsumeOpeningFirstTurn.server.ts` | StudioV2 到 Host first-turn API 的薄适配 |
| `apps/studioV2/src/utils/server/debugger/session/debuggerLlmMessages.server.ts` | 开场 LLM 消息投影；按 `OpeningLlmContextPolicy` 裁剪 |
| `apps/studioV2/src/utils/server/debugger/session/projectors/promptTraceProject.server.ts` | `RenderedPrompt` → Prompt Trace DTO |

## 2. Provider Registry

`createPromptProviderRegistry(providers)`：

- 冻结 provider 数组
- 校验 `providerId` 不能重复
- 暴露 `getProviderIds()`

`composeRenderedPrompt(input)` 默认使用 `DEFAULT_PROMPT_PROVIDER_REGISTRY`；宿主可通过 `ComposeInput.promptProviderRegistry` 注入外部 registry。外部 provider 可以扩展能力，但不能绕过 Host / CallSession 去自行拼首句。

默认 provider 顺序：

```text
base.card_context
scene.card_promptScenes
opening.character_default
opening.phone_short_policy
opening.situation
hard.card_objective
style.phone_global
call.source
call.missed_outbound
conversation.inertia
call.scheduled_callback
opening.wrong_number_guard
persona.character
persona.style
identity.character
time.local
soft.extras
```

输出 `RenderedPrompt.debug.providerIds`，Studio Prompt Trace 用它展示 provider 顺序。

## 3. RenderedPrompt 输出

`composeRenderedPrompt` 输出：

```text
systemHard
openingSpeakable
openingPrivate
openingPolicy
openingFirstTurn
speakable
private
softContext
matchedLayerIds
debug.providerIds / debug.notes
```

`openingFirstTurn` 是 Composer 产物；`beginCall` 后由 Host 提升为 `CallSession.openingFirstTurn`。运行期是否发首句、是否调 LLM、是否已消费，以 `CallSession` 和 `consumeOpeningFirstTurn` 为真源。

## 4. Opening 机制

`openingSituationResolver.ts` 只判断“这通电话的接通事实”：

- `missed_outbound_resume`
- `scheduled_callback`
- `card_story`
- `late_night_inbound`
- `night_inbound`
- `early_morning_inbound`
- `morning_inbound`
- `noon_inbound`
- `afternoon_inbound`
- `evening_inbound`
- `inbound_unknown`
- `outbound_generic`
- `mailbox_playback`
- `unknown`

`opening.situation` provider 根据 situation：

- 可能覆盖 `openingSpeakable`
- 写入 `[opening.situation]` hard block，供 Trace 展示
- 写入 `draft.openingFirstTurn`

未知玩家呼入的 first-turn 事实：

```text
mode=direct_opening
callerVisibility=unknown
allowMemoryBeforeUserSpeaks=false
allowInertiaBeforeUserSpeaks=false
allowNameBeforeIdentified=false
```

Host 映射后进入 `CallSession.openingFirstTurn.mode="direct"`，`consumeOpeningFirstTurn` 首次消费时写 assistant `chatTurn`，再次消费返回 `already_emitted`。

预约 / 计划回电、未接外呼恢复等不是陌生来电，允许 LLM opening 或普通 LLM 结合对应 hard block 带出话题。

## 5. 电话口语与剧情开场边界

`style.phone_global` 提供全局电话口语 Style Policy：短句、自然接听、减少舞台描写，不走长篇自我介绍。

`opening.wrong_number_guard` 用于防止 Free / 日常入口继承“打错电话”剧情 opening。当前事实口径：

- Story opening 放在 Story 卡或明确 provider 规则
- Character default opening 只做角色日常兜底
- Free card 不承载剧情 opening

## 6. persona / personalityCode

`CharacterDef.persona.personalityCode?: string` 定义在 `packages/rpg-engine/src/schema/character.ts`。当前 Studio 约定用 MBTI 四字母；引擎不强制枚举，未知码 trim 后仍可注入。

相关文件：

- `runtime/personalityPrompt.ts`：`normalizePersonalityCode`、`buildPersonalityHardBlock`、`appendPersonaHardBlocks`、`buildPersonaStyleHardBlock`
- `runtime/defaultPromptProviders.ts`：
  - `persona.character`
  - `persona.style`
- 门面导出：`@airpc/rpg-engine` → `normalizePersonalityCode`、`buildPersonalityHardBlock`

Hard 块形态仍是：

```text
[persona.personality]
你扮演的人格类型为 {CODE}（MBTI / personalityCode）。
说话方式、情绪节奏、决策倾向须符合该人格；不要口头自称 MBTI 字母，除非剧情要求。
与 [objective] / [forbidden] 冲突时：objective / forbidden 优先，人格倾向仍尽量保持。
```

同时：非空 `persona.systemPrompt` 写入 `[persona.systemPrompt]` hard；`identity.character` 仍进 soft。

## 7. Memory / Inertia 投影

Host `beginCall` 通过 MemoryPort 生成本通 soft extras；Composer 的 `soft.extras` 注入 `softContext`。

`conversation.inertia` provider 根据近期通话上下文注入对话惯性。开场 LLM 并不天然能看到这些块，StudioV2 的 `debuggerLlmMessages.server.ts` 会读取 `session.openingFirstTurn.llmContextPolicy`：

- `includeSoftContext=false`：首句 LLM 不投影 softContext
- `includeMemory=false`：过滤 `[memory]`
- `includeInertia=false`：过滤 `[conversation.inertia...]`

因此 unknown inbound 首句前不会因为 Profile 里有姓名、长期记忆或近期对话而直呼用户。

## 8. StudioV2 Prompt Trace

`projectPromptTrace(session.renderedPrompt)` 输出：

- `providerIds`
- `providerRows`
- `notes`
- `matchedLayerIds`
- `openingSpeakable`
- `openingPolicy`
- `openingSituation`
- `systemHardBlocks`
- `softContextBlocks`

`openingSituation` 优先读取 `RenderedPrompt.openingFirstTurn`，补充：

- `firstTurnMode`
- `firstTurnStatus`
- `callerVisibility`
- `llmContextPolicy.includeSoftContext/includeMemory/includeInertia`

`[opening.situation]` 文本解析只作为旧快照展示兜底，不参与业务状态转移。

## 9. 测试索引

| 测试 | 覆盖 |
|------|------|
| `packages/rpg-engine/tests/host/opening-first-turn.test.ts` | Host first-turn direct / LLM / 幂等 |
| `packages/rpg-engine/tests/runtime/opening-situation-resolver.test.ts` | opening situation 规则 |
| `packages/rpg-engine/tests/runtime/prompt-provider-registry.test.ts` | registry 注入、provider 生效、sanitized opening |
| `packages/rpg-engine/tests/runtime/composer-golden.test.ts` | composer golden / openingFirstTurn |
| `packages/rpg-engine/tests/host/schedule-outbound.test.ts` | schedule / outbound / free inbound opening 回归 |
| `apps/studioV2/tests/debugger/debuggerConsumeOpeningFirstTurn.test.ts` | Studio first-turn API 薄适配 |
| `apps/studioV2/tests/debugger/debuggerCallSessionOpening.test.ts` | free inbound direct opening 不二次 record |
| `apps/studioV2/tests/debugger/debuggerIncomingCall.test.ts` | 接听外呼时 LLM opening 记录 assistant |
| `apps/studioV2/tests/debugger/debuggerLlmMessages.test.ts` | opening LLM context policy 裁剪 |
| `apps/studioV2/tests/debugger/debuggerToolCalling.test.ts` | Prompt Trace 投影与工具观测 |

## 10. 实现时踩过的门禁

历史上触碰 `composer.ts` 导致 `ENGINE-STRUCT-007`（effectiveLines 相对基线净增长）。纠正方式仍有效：

- 大块逻辑拆到 `personalityPrompt.ts`、`promptPhoneBlocks.ts`、`openingSituationResolver.ts`、`defaultPromptProviders.ts`
- `composer.ts` 只保留 registry 循环与最终 DTO 输出
- StudioV2 只做 server facade / projector，不把引擎状态机搬到 UI 或 Trace 层

详见 [06](./06-过程岔子与纠正记录.md)。
