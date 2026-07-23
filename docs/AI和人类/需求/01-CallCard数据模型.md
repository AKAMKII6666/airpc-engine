# 01. CallCard 数据模型

本文定义 CallCard 体系的静态与运行时数据结构。实现时以 Zod（或等价）schema 为真源；本文为需求级描述。

**存档口径**：`CallCardInstance` / `CallCardBoard` 挂在当前用户的 [PlayerProfile](./10-用户与存档.md) 下，不是全局单例。

相关：[02-运行时协议](./02-运行时协议.md) · [11-角色与社交](./11-角色与社交.md) · [07-壳嵌入与导出契约](../技术设计文档/07-壳嵌入与导出契约.md) · [语音留言改造需求](../里程碑/v2.0/语音留言改造需求.md)

## 1. 两层对象

| 层 | 类型 | 说明 |
|----|------|------|
| 静态 | `CallCardDefinition` | 写在 StoryPackage 里；可版本化、可编辑 |
| 运行时 | `CallCardInstance` | 挂在某角色身上；带 status 与来源 |

**禁止**把运行状态写回 Definition。同一张 Definition 可在不同 StoryInstance / 模拟中产生多个 Instance。

## 2. CallCardDefinition

```ts
type CardKind = "free" | "story" | "system" | "schedule" | "voicemail"
type InteractionMode = "realtime_dialogue" | "playback_only" | "hybrid"
type EntryMode = "inbound_user_dial" | "outbound_auto" | "either" | "mailbox_open"

interface CallCardDefinition {
  cardId: string
  cardKind: CardKind
  title: string
  ownerAgentId: string
  entryMode: EntryMode
  interactionMode: InteractionMode

  context: CallCardContext
  objectives: CallCardObjectives
  toolPolicy: ToolPolicy
  assets?: CardAssets

  exits: CallCardExit[]
}
```

### 2.1 cardKind

| 值 | 含义 |
|----|------|
| `free` | 自由通话默认卡；每角色应有且仅有一份默认 FreeCallCard（可在角色库配置） |
| `story` | 强约束剧情卡 |
| `system` | 系统/媒介卡（过场播放、系统提示等） |
| `schedule` | 调度卡；**磁盘落点按用途分两路**，见 §8.1（禁止混用） |
| `voicemail` | **语音留言卡**：进信箱、听完走本卡 exits；**永不**进入 `Board.pending`；不可经普通 `user_dial` / `agent_outbound` 解析为待接通剧情卡 |

**`voicemail` 强制组合（校验 error，Studio 锁定 disable）：**

| 字段 | 必须 |
|------|------|
| `interactionMode` | **仅** `playback_only` |
| `entryMode` | **仅** `mailbox_open`（界面文案「信箱打开」） |
| `toolPolicy` | 必须等价 `deny_all`（与 `playback_only` 一致） |

`context` 对 voicemail 仍是剧情/生成合同：物化端口消费 `speakableBrief` / `privateBrief` / `objective` 等；若 `assets.playbackClipId` 已有成品片，物化可跳过 LLM 直接引用。详见 [语音留言改造需求 §3](../里程碑/v2.0/语音留言改造需求.md)。

### 2.2 entryMode

| 值 | 含义 |
|----|------|
| `inbound_user_dial` | 用户主动拨该角色才激活 |
| `outbound_auto` | 系统安排角色外呼用户时激活 |
| `either` | 两者皆可 |
| `mailbox_open` | **信箱打开**：用户/调试从信箱条目进入听留言；**仅**与 `cardKind=voicemail` 配对 |

### 2.3 interactionMode

| 值 | 含义 | 工具 | 用户语音 |
|----|------|------|----------|
| `realtime_dialogue` | LLM 实时对话 | 按 toolPolicy | 允许 |
| `playback_only` | 接通后只播 WAV/TTS | **强制禁用** | **强制禁用** |
| `hybrid` | 先播固定音频，再进对话 | 播放阶段禁用；对话阶段按 toolPolicy | 播放阶段禁用 |

### 2.4 context（可说 / 不可说分区 + 多场景组装）

```ts
interface CallCardContext {
  /** 模型可知，但不得直接告诉用户 */
  privateBrief: string
  /** 可自然告知用户 */
  speakableBrief: string
  background: string
  premise: string
  emotion: string
  /** 本轮通话要干什么（给人看的目标描述） */
  objective: string
  forbidden: string[]
  revealPolicy?: {
    maxRevealLevel: number
    mustNotReveal: string[]
  }
  /**
   * 可选：多场景提示词片段（呼入/呼出开场、本地小时语气等）。
   * 缺省则仅用基线 context + Composer 强制时间注入。
   * 详见 [50](./50-对话与模型适配.md)。
   */
  promptScenes?: PromptSceneLayer[]
}

interface PromptSceneLayer {
  layerId: string
  /** 同批命中时数值大者后应用（可覆盖 opening*）；默认 0 */
  priority?: number
  match: {
    /** 不写 = 任意方向 */
    callDirection?: "inbound" | "outbound" | "either"
    /** 可选：本地小时半开窗 [from, to)；不写 = 任意小时 */
    localHourRange?: { from: number; to: number }
  }
  patch: {
    openingSpeakable?: string
    openingPrivate?: string
    emotion?: string
    toneHint?: string
    appendSpeakable?: string
    appendPrivate?: string
  }
}
```

**组装口径（定稿）：**

- `context` 基线 = 本通**剧情合同**；`promptScenes` = 声明式「怎么开口/时段语气」，效果对齐老话机呼入呼出/按时段切词，但由 Composer 统一按 `localHourRange` 组装。
- **禁止** `match.timeBuckets`（已删除；含该字段的内容 **拒载**）。
- **禁止** `patch` 覆盖 `objective` / `forbidden`（校验器拒绝此类字段）。
- 目标相同、仅开场不同 → 一张卡 + `promptScenes`；目标/出口都不同 → 仍拆多卡 + `entryMode`。

### 2.5 objectives / beats

供 Outcome 与 Exit 条件使用：

```ts
interface CallCardObjectives {
  requiredBeats: string[]   // 稳定 id，如 "tell_user_call_xiaoyu"
  optionalBeats?: string[]
}
```

v1 调试器通过**手动勾选** beat 完成情况与电话事件 flags 模拟 Outcome，不接 LLM。

### 2.6 toolPolicy

见 [13-工具与能力注册](./13-工具与能力注册.md)。`allowedToolIds` 必须落在 ToolRegistry；`playback_only` 强制无工具。

```ts
interface ToolPolicy {
  mode: "inherit_free" | "allowlist" | "deny_all"
  /** mode=allowlist 时生效；id 须在 ToolRegistry */
  allowedToolIds?: string[]
}
```

- `free` 卡默认 `inherit_free`（= Registry 中全部 `allowedCardKinds` 含 `free` 的工具；实机常态全开）。
- `story` 卡默认建议 `allowlist`。
- `playback_only` 导出校验时必须等价于 `deny_all`。

### 2.7 assets

见 [14-资源与媒体资产](./14-资源与媒体资产.md)。卡只引用全局库 `assetId`。

```ts
interface CardAssets {
  playbackClipId?: string   // 资产库 assetId
  systemPromptClipId?: string
}
```

## 3. CallCardExit

```ts
type ExitKind =
  | "handoff"     // 引导用户去拨另一角色等
  | "callback"    // 安排角色回拨
  | "recovery"    // 未达标/困惑等恢复
  | "failure"     // 未接、占线、提前挂断等失败路径
  | "terminal"    // 结束故事或明确终局

interface CallCardExit {
  exitId: string
  exitKind: ExitKind
  title: string
  priority: number          // 数值越大越优先；同 priority 时按声明顺序
  condition: ExitCondition
  effects: Effect[]         // effect plan；可为空仅当 terminal 且无副作用（校验器警告）
}
```

### 3.1 铁律

- **不设**卡级 `fallback` 字段。失败、未接、重播、留言全部用 exit 表达。
- **不设**底层必填的 `nextCardId`。挂下一张卡必须通过 effect（如 `attach_call_card`）。编辑器可提供「挂卡并连线」语法糖，保存时展开为 effects。
- 一张 story 卡应至少有一条可命中的 exit（校验 `EXIT_EMPTY_STORY`）；是否再分 failure/recovery 等 `exitKind` 为可选标签，不参与运行时选出口。voicemail 允许无 exits。

### 3.2 ExitCondition（结构化谓词，v1）

不做自由脚本。条件为 JSON 谓词树：

```ts
type ExitCondition =
  | { op: "always" }
  | { op: "and" | "or"; items: ExitCondition[] }
  | { op: "not"; item: ExitCondition }
  | { op: "outcome_flag"; flag: OutcomeFlag; equals?: boolean }
  | { op: "beat_completed"; beatId: string }
  | { op: "beat_missing"; beatId: string }
  | { op: "all_required_beats_completed" }
  | { op: "world_fact"; factId: string; equals: boolean | string | number }
  | { op: "variable"; key: string; equals: boolean | string | number }
```

编辑器用表单拼装条件，不手写代码。

## 4. Effect Registry（v1 白名单）

所有 effect 必须带稳定 `id`（包内唯一），供幂等 key 使用。

```ts
interface EffectBase {
  id: string
  effect: string
  /** 为 true 时该条失败则中止后续 effect（见 16） */
  critical?: boolean
}
```

| effect | 参数要点 | 语义 |
|--------|----------|------|
| `attach_call_card` | `agentId`, `cardId`, `activation?` | 见下方 **挂卡分流表**（普通卡 → Board.pending；voicemail → 进信箱生成栈） |
| `unmount_call_card` | `agentId`, `cardId?`（缺省卸该角色匹配卡） | 卸卡 |
| `schedule_call_card` | `agentId`, `cardId`, `delay: { minMs, maxMs }` | 见下方 **挂卡分流表**（普通卡 → 延迟外呼；voicemail → 延迟进信箱） |
| `set_redial_slot` | `agentId`, `cardId?` | 设置重播槽指向该角色（及可选卡） |
| ~~`create_voicemail`~~ | — | **已废弃**：校验 error / Schema 拒识；Studio 下拉删除。留言一律用 `cardKind=voicemail` + `attach_call_card` / `schedule_call_card` |
| `keep_card_pending` | `cardId?`（默认当前卡） | 通话结束后保持 pending |
| `set_world_fact` | `factId`, `value` | 写 **Profile.world.facts** |
| `update_npc_knowledge` | `agentId`, `factId`, `known: boolean` | 更新 **Profile.world.knowledge**（`agentId` 可≠当前通话角色） |
| `patch_memory` | `agentId`, `layer`, 层载荷 | 写 **Profile.characters[agentId].memory**（见下） |
| `set_character_unlocked` | `agentId`, `unlocked: boolean` | 写 **Profile.characters[agentId].unlocked**（覆盖 dialable 默认） |
| `update_user_profile` | `nickname?`, `fullName?`, … | 写 **Profile.user**（来自工具 `record_user_name`） |
| `schedule_recurring_call` | `agentId`, `topicHint`, cron 字段 | 写入 `Profile.schedule.intents` 且 `kind: "recurring"` |
| `create_research_commitment` | `question`, `notifyMode?`, `agentId?` | **唯一落点** `Profile.research.commitments`（见 [10](./10-用户与存档.md)） |
| `update_variable` | `key`, `value` \| `delta` | 写 Profile.stories[].variables |
| `play_system_prompt` | `clipId` | 播放系统提示/过场音（壳执行） |
| `end_story` | `reason?` | 结束当前故事实例 |

**不设**独立 `create_relay` / Relay 子系统。旧「带话」语义一律用 `attach_call_card`（或 `schedule_call_card`）+ 目标卡的 `privateBrief` / `speakableBrief` 表达；设计期是否允许引荐见角色 `social.canIntroduce`（[11](./11-角色与社交.md)）。

#### 挂卡 / 延迟分流（目标 `cardKind`）

| Effect | 目标为普通卡（非 voicemail） | 目标为 `cardKind=voicemail` |
|--------|------------------------------|------------------------------|
| `attach_call_card` | 写 `Board.pending`（引荐/带话 + 卡上下文） | **不写 Board**；push **VoicemailGenStack**（立即）；plan 终态后物化进信箱 |
| `schedule_call_card` | 写 once intent → 到点 `agent_outbound`（外呼响铃） | **不写 Board**；写 once intent，到点 **入栈/物化进信箱**（**不是**外呼响铃） |

延迟语义钉死：「N 分钟后信箱多一条留言」，不是「N 分钟后电话响铃播留言卡」。到点若用户正在通话：**仍写入信箱槽**，不打断当前 CallSession。运行时细节见 [02 §8.4–§8.5](./02-运行时协议.md)。

未知 `effect` 名：校验失败，运行时拒绝执行。包内若仍出现 `create_voicemail`：校验 **error**，并指引改为 `attach_call_card` / `schedule_call_card` 指向 `cardKind=voicemail` 卡。

事实与 knowledge 的 schema 见 [40-世界柱](./40-世界柱.md)；记忆层见 [12-记忆模型](./12-记忆模型.md)。

### 4.0 `patch_memory`（挂机后 / 出口阶段）

仅允许在 **Exit → EffectExecutor** 阶段执行（与其它推进类 effect 相同）。**禁止**在接通时（onConnect）或通话进行中执行。

```ts
type MemoryLayer =
  | "episodic"
  | "semantic"
  | "relational"
  | "affect"
  | "commitments"
  | "profileNotes"

interface PatchMemoryEffect {
  id: string
  effect: "patch_memory"
  agentId: string                 // 可≠当前通话角色：跨角色改记忆
  layer: MemoryLayer
  /** 按 layer 解释：append 条目、merge 关系轴、替换 affect 等；实现用 Zod 分 branch */
  op: "append" | "upsert" | "remove" | "set"
  payload: unknown
}
```

| 与 `update_npc_knowledge` | 分工 |
|---------------------------|------|
| knowledge / `set_world_fact` | 客观「谁知道哪个 factId」 |
| `patch_memory` | 主观层：情节摘要、信念文案、关系轴、情绪、约定 |

例：澜星卡出口可对强叔叔 `patch_memory(semantic, …)` 或 `update_npc_knowledge(qiang-uncle, factId)`，即使用户尚未拨打强叔叔。

### 4.0a `set_character_unlocked`

仅挂机后 Effect / Free 管线发出的 Effect 可执行；**禁止**接通时或通话中。

```ts
interface SetCharacterUnlockedEffect {
  id: string
  effect: "set_character_unlocked"
  agentId: string
  unlocked: boolean
}
```

与 `dialable`：Def 表示设计默认；Runtime.`unlocked===true` 时 `user_dial` 视为可拨（见 [11](./11-角色与社交.md)）。

工具 → Effect 展开见 [13 §7](./13-工具与能力注册.md)（能力对标旧话机 FC；挂机后执行；schema 用 Zod 重写）。

### 4.1 幂等 key（逻辑约定）

```text
{storyInstanceId}:{cardInstanceId|cardId}:{exitId}:{effect.id}
```

同一 key 已成功执行则 `skipped: true`。调试器必须能演示幂等 skip。

## 5. CallCardInstance

```ts
type InstanceStatus =
  | "pending"
  | "active"
  | "completed"
  | "expired"
  | "cancelled"

interface CallCardInstance {
  instanceId: string
  definitionId: string      // = cardId
  storyInstanceId: string
  ownerAgentId: string
  status: InstanceStatus
  entryMode: EntryMode
  /** 同角色多 pending 时，数值越大越优先；缺省则按 createdAt 最新优先 */
  priority?: number
  tags?: string[]
  expiresAt?: string
  cancelledReason?: string
  sourceEventId?: string
  createdBy?: {
    fromCardId?: string
    fromExitId?: string
    fromEffectId?: string
  }
  createdAt: string
  activatedAt?: string
  completedAt?: string
  lastOutcome?: OutcomeSummary
}
```

### 5.1 生命周期

```text
pending → active → completed
    ↘ cancelled / expired
active 也可能因强制卸卡 → cancelled
```

### 5.2 Board 规则（v1）

- 同一 `ownerAgentId` 可有**多张** `pending`。
- 同一角色同一时刻最多一张 `active`。
- Resolver 在多张可激活 pending 中：先比 `priority`（大者优先），同 priority 则 **createdAt 最新**；细则见 [02](./02-运行时协议.md)。
- 已 `expiresAt` 过期的 pending 视为不可激活（可标 expired）。

## 6. CallCardBoard

```ts
interface CallCardBoard {
  storyInstanceId?: string
  byAgent: Record<string, {
    pending: CallCardInstance[]
    active: CallCardInstance | null
  }>
}
```

存放于 `PlayerProfile.callCards.board`。调试器与编辑器预览都以 **当前用户** Board 为「谁身上挂了什么」的视图模型。

## 7. FreeCallCard 规则

1. 每个可参与通话的角色在 CharacterDef 上配置 `freeCardId`（见 [11](./11-角色与社交.md)）。
2. Resolver 在该角色**没有**可激活的 story/system pending 时使用 FreeCallCard。
3. FreeCallCard 的 **静态 exits 可以为空**；无静态出口 ≠ 无后处理。
4. 挂机走 `FreeCallPostPipeline`（见 [19 §5](../技术设计文档/19-引擎宿主与会话模型.md)）：有效聊天 → MemoryCommit；若有 `RuntimeExitCandidate` 再跑 ExitSelector → Effect。
5. **禁止**从 transcript 隐式扫描「约定/介绍」写 Profile；推进须来自工具候选或故事卡 Exit。
6. **toolPolicy**：默认开放所有 Registry 中 `free` 可用工具（`inherit_free`）；作者可收紧。
7. Free 通话上下文主要来自 [记忆](./12-记忆模型.md) + persona，而非强 beats。
8. Free 会话 `packageId` 使用哨兵 `__free__`（见 [19](../技术设计文档/19-引擎宿主与会话模型.md)）。
## 8. StoryPackage（静态包）

```ts
interface StoryPackage {
  schemaVersion: 1
  packageId: string
  title: string
  /**
   * 遗留可选字段；路径 B 下**不是**角色白名单。
   * 新包可不写；保存推荐不写。校验按 cards/effects 派生引用集合，见 [08](./08-内容校验规则.md)。
   */
  participants?: string[]
  entryCardId: string
  /** 逻辑组装视图；磁盘上 conf 仅索引，见 19 */
  cards: CallCardDefinition[]
  worldFacts?: FactMeta[]
  variables?: VariableMeta[]
  /** 本包用到的 assetId 列表（可选，便于导出打包）；元数据真源在全局资产库 */
  assetRefs?: string[]
  meta?: {
    conflictsWith?: string[]
    imports?: { facts?: string[] }
    exports?: { facts?: string[] }
  }
}
```

**角色真源**仅 `data/characters/<agentId>.json`。「本包用到谁」由 `cards[].ownerAgentId`、effects 内 `agentId`、attach 目标归属等**派生**，**禁止**把 `participants` 当白名单或作者手维护清单。

**禁止**在包内维护 `agents[]` 第二份角色定义（避免与 `data/characters/` 双真源）。显示名 / Free 卡一律读角色库。

完整 JSON 字段见卡文件；包目录与分文件约定见 [07](../技术设计文档/07-壳嵌入与导出契约.md)、[19 §3](../技术设计文档/19-引擎宿主与会话模型.md)。  
**磁盘真源**：`story.conf.json` 的 `cards[]` 仅为索引；上表 `cards: CallCardDefinition[]` 表示 Host **组装后的逻辑视图**，非单文件内联编辑真源。

### 8.1 Schedule 落盘分工（钉死）

| 用途 | 落盘 | 运行 `packageId` | 谁维护 |
|------|------|------------------|--------|
| 角色日常 / 周期性外呼目标 | `data/characters/schedule-cards/<cardId>.s-card.json` | `__schedule__` | 角色库 / 专用路径（Studio `POST /api/schedule-cards`） |
| 故事包内剧情调度节点 | `data/storis-packages/<pkg>/cards/<cardId>.s-card.json`（`cardKind=schedule`） | 真实故事包 id | 故事编辑器画布 |

铁律：

1. `schedule_recurring_call` 的目标**只**认 `scheduleCardId` → `characters/schedule-cards/`，或 `cardId` + `packageId=__schedule__`（同目录）；可选 `__free__` 下 free/schedule fallback。
2. **禁止**把故事包内 `cardKind=schedule` 节点当作 recurring 目标（校验 `SCHEDULE_CARD_KIND`）。
3. StoryCard 上挂 `schedule_recurring_call` → `SCHEDULE_RECURRING_IN_STORY` error。
4. 画布把卡改成 `cardKind=schedule` 仍写回**本包** `cards/`（剧情节点）；日常调度卡必须走 schedule-cards 专用创建口，不得只靠改 cardKind「伪装」。

详见 [19 §3.4](../技术设计文档/19-引擎宿主与会话模型.md)、[08](./08-内容校验规则.md) SCHEDULE_*。

## 9. Outcome（通话结果，供条件使用）

```ts
type OutcomeFlag =
  | "answered_completed"    // 正常接通并结束
  | "missed"                // 未接
  | "busy"                  // 占线
  | "hangup_early"          // 提前挂断
  | "playback_completed"    // 过场播放完成
  | "playback_skipped"
  | "user_redial_pressed"   // 用户按重播（作为独立模拟事件时）
  | "voicemail_listened"
  | "callback_fired"        // 调度的回拨已触发
  | "timeout"

interface Outcome {
  flags: Partial<Record<OutcomeFlag, boolean>>
  completedBeats: string[]
  missedRequiredBeats: string[]
  /** 预留；v1 可空 */
  narrativeVariableDelta?: Record<string, number>
}
```

v1 由调试器 UI 构造 Outcome；引擎只消费结构化 Outcome，不关心它来自人工还是未来的 LLM Evaluator。
