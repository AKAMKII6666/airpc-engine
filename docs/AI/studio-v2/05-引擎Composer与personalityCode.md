# 引擎 Composer 与 personalityCode（代码事实）

> 对照：`packages/rpg-engine`。  
> 产品管道：[需求 50](../../AI和人类/需求/50-对话与模型适配.md) §5；字段：[需求 11](../../AI和人类/需求/11-角色与社交.md)。  
> 固化：2026-07-22。

## 1. Schema

`CharacterDef.persona.personalityCode?: string`  
（`packages/rpg-engine/src/schema/character.ts`）

约定：当前 Studio 用 MBTI 四字母；引擎**不强制**枚举，未知码 trim 后仍可注入。

## 2. 组装位置

文件：

- `runtime/personalityPrompt.ts`：`normalizePersonalityCode`、`buildPersonalityHardBlock`、`appendPersonaHardBlocks`  
- `runtime/composer.ts`：在 objective / forbidden / emotion / toneHint 之后调用 `appendPersonaHardBlocks`  
- 门面导出：`@airpc/rpg-engine` → `normalizePersonalityCode`、`buildPersonalityHardBlock`

Hard 块形态：

```text
[persona.personality]
你扮演的人格类型为 {CODE}（MBTI / personalityCode）。
说话方式、情绪节奏、决策倾向须符合该人格；不要口头自称 MBTI 字母，除非剧情要求。
与 [objective] / [forbidden] 冲突时：objective / forbidden 优先，人格倾向仍尽量保持。
```

同时：非空 `persona.systemPrompt` 写入 `[persona.systemPrompt]` hard；`identity` 仍进 soft。

## 3. 管道顺序（实现口径）

```text
base card.context
  → 本通 promptScenes
  → 无 opening 时 CharacterDef.defaultPromptScenes
  → persona.systemPrompt + personalityCode（hard）
  → identity（soft）
  → 用户本地时间 hard
  → softExtras …
```

## 4. 测试

`packages/rpg-engine/tests/runtime/composer.personality.test.ts`  
（故意**不**继续膨胀 `composer.test.ts`，避免结构基线复杂度增长。）

## 5. 实现时踩过的门禁

触碰 `composer.ts` 导致 `ENGINE-STRUCT-007`（effectiveLines 相对基线净增长）。  
纠正：人格逻辑拆到 `personalityPrompt.ts`，`appendPersonaHardBlocks` 也外移；composer 只保留一行调用。  
详见 [06](./06-过程岔子与纠正记录.md)。
