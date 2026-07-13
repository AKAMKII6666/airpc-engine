# @airpc/rpg-engine

纯 TypeScript 引擎包（准 npm）。禁止依赖 `react` / `next` / `@xyflow/*`。

## 对外门面

```ts
import { createEngineHost, getEngineHost } from "@airpc/rpg-engine";
```

Studio/壳只经此入口；禁止深挖 `src/host/...`。

## P1 最小闭环

```text
loadWorkspace(data/)
ensureProfile(userId)
resolveAsync({ kind: "simulate_start", packageId, cardId })
beginCall(..., { channel: "manual" })
endCall(sessionId, manualOutcome)
  → ExitSelector → EffectExecutor → saveProfile
```

支持 Effect：`set_character_unlocked` / `attach_call_card` / `set_redial_slot` / `unmount_call_card` / `keep_card_pending`。

## P2 golden_handoff

`tests/host/golden-handoff.test.ts`：澜星 Manual 成功 → 小雨 `user_dial` → `meet_ok` unmount；`effectiveDialable`；layout 旁车可删仍可跑；卡按需载入。
