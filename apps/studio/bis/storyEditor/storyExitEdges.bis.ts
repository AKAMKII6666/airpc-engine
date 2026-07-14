/**
 * 模块名称：从卡 exits[].effects 投影 / 写回 Exit 连线
 * 模块说明：真源 = exits[].effects；边为 UX 投影。连线须显式出口类型。
 */

export type ExitConnectKind =
  | "user_dial"
  | "outbound_callback"
  | "status_only"
  | "terminal";

export const EXIT_CONNECT_KIND_OPTIONS: Array<{
  value: ExitConnectKind;
  label: string;
  hint: string;
}> = [
  {
    value: "user_dial",
    label: "用户去打（挂 inbound 卡）",
    hint: "attach_call_card + activation=inbound_user_dial",
  },
  {
    value: "outbound_callback",
    label: "角色外呼／回拨",
    hint: "schedule_call_card + attach（outbound_auto）",
  },
  {
    value: "status_only",
    label: "仅状态（不连卡）",
    hint: "keep_card_pending；不产生画布边",
  },
  {
    value: "terminal",
    label: "终止",
    hint: "exitKind=terminal；不挂目标卡",
  },
];

export interface StoryExitShape {
  exitId: string;
  exitKind?: string;
  title?: string;
  priority: number;
  condition: unknown;
  effects: Array<Record<string, unknown>>;
}

export interface StoryCardShape {
  cardId: string;
  ownerAgentId?: string;
  exits?: StoryExitShape[];
  [key: string]: unknown;
}

export interface ExitEdgeProjection {
  id: string;
  source: string;
  target: string;
  exitId: string;
  effectId: string;
  label: string;
  connectKind?: ExitConnectKind | "legacy";
}

function asCard(raw: unknown): StoryCardShape | null {
  if (!raw || typeof raw !== "object") return null;
  const card = raw as StoryCardShape;
  if (typeof card.cardId !== "string") return null;
  return card;
}

function edgeEffectKind(
  effect: Record<string, unknown>,
): ExitConnectKind | "legacy" | null {
  if (effect.effect === "attach_call_card") {
    const act = effect.activation;
    if (act === "outbound_auto" || act === "outbound" || act === "agent_outbound") {
      return "outbound_callback";
    }
    if (act === "inbound_user_dial" || act === "inbound" || act === "either") {
      return "user_dial";
    }
    return "legacy";
  }
  if (effect.effect === "schedule_call_card" && typeof effect.cardId === "string") {
    return "outbound_callback";
  }
  return null;
}

export function projectExitEdges(
  cards: Record<string, unknown>,
): ExitEdgeProjection[] {
  const edges: ExitEdgeProjection[] = [];
  const seen = new Set<string>();
  for (const raw of Object.values(cards)) {
    const card = asCard(raw);
    if (!card?.exits) continue;
    for (const exit of card.exits) {
      for (const effect of exit.effects ?? []) {
        const kind = edgeEffectKind(effect);
        if (!kind) continue;
        const targetId = effect.cardId;
        if (typeof targetId !== "string") continue;
        const effectId =
          typeof effect.id === "string" ? effect.id : `fx_${targetId}`;
        const id = `${card.cardId}::${exit.exitId}::${effectId}`;
        if (seen.has(id)) continue;
        seen.add(id);
        edges.push({
          id,
          source: card.cardId,
          target: targetId,
          exitId: exit.exitId,
          effectId,
          label: exit.title ?? exit.exitId,
          connectKind: kind,
        });
      }
    }
  }
  return edges;
}

/** 有 terminal 出口（或 end_story effect）的卡 → 汇入 End 虚拟节点 */
export function listTerminalSourceCardIds(
  cards: Record<string, unknown>,
): Array<{ cardId: string; exitId: string; label: string }> {
  const out: Array<{ cardId: string; exitId: string; label: string }> = [];
  for (const raw of Object.values(cards)) {
    const card = asCard(raw);
    if (!card?.exits) continue;
    for (const exit of card.exits) {
      const hasEndStory = (exit.effects ?? []).some(function (ef) {
        return ef.effect === "end_story";
      });
      if (exit.exitKind === "terminal" || hasEndStory) {
        out.push({
          cardId: card.cardId,
          exitId: exit.exitId,
          label: exit.title ?? exit.exitId,
        });
        break;
      }
    }
  }
  return out;
}

/** 删除目标卡时，从其它卡的 attach/schedule effect 中清引用 */
export function stripCardReferences(
  cards: Record<string, unknown>,
  removedCardIds: Set<string>,
): Record<string, unknown> {
  const next: Record<string, unknown> = {};
  for (const [id, raw] of Object.entries(cards)) {
    if (removedCardIds.has(id)) continue;
    const card = asCard(raw);
    if (!card?.exits) {
      next[id] = raw;
      continue;
    }
    const exits = card.exits.map(function (exit) {
      return {
        ...exit,
        effects: (exit.effects ?? []).filter(function (ef) {
          if (
            ef.effect !== "attach_call_card" &&
            ef.effect !== "schedule_call_card"
          ) {
            return true;
          }
          return typeof ef.cardId !== "string" || !removedCardIds.has(ef.cardId);
        }),
      };
    });
    next[id] = { ...card, exits };
  }
  return next;
}

export function findExitOnCard(
  card: StoryCardShape,
  exitId: string,
): StoryExitShape | null {
  return (
    card.exits?.find(function (e) {
      return e.exitId === exitId;
    }) ?? null
  );
}

export interface ApplyExitConnectionOpts {
  packageId: string;
  kind: ExitConnectKind;
}

export function applyExitConnection(
  sourceCardRaw: unknown,
  targetCardRaw: unknown,
  targetCardId: string,
  opts: ApplyExitConnectionOpts,
): { card: StoryCardShape; exitId: string; createsEdge: boolean } | null {
  const source = asCard(sourceCardRaw);
  if (!source) return null;
  const target = asCard(targetCardRaw);
  const agentId =
    (target?.ownerAgentId as string | undefined) ??
    source.ownerAgentId ??
    "unknown";

  const exits = [...(source.exits ?? [])];
  const kind = opts.kind;

  if (kind === "status_only") {
    const exitId = `status_${Date.now().toString(36)}`;
    exits.push({
      exitId,
      exitKind: "recovery",
      title: "仅状态",
      priority: 40,
      condition: { op: "always" },
      effects: [
        {
          id: `keep_${exitId}`,
          effect: "keep_card_pending",
        },
      ],
    });
    return { card: { ...source, exits }, exitId, createsEdge: false };
  }

  if (kind === "terminal") {
    const exitId = `terminal_${Date.now().toString(36)}`;
    exits.push({
      exitId,
      exitKind: "terminal",
      title: "终止",
      priority: 10,
      condition: { op: "always" },
      effects: [],
    });
    return { card: { ...source, exits }, exitId, createsEdge: false };
  }

  const exitId = `edge_to_${targetCardId}`;
  let exit = exits.find(function (e) {
    return e.exitId === exitId;
  });
  if (!exit) {
    exit = {
      exitId,
      exitKind: kind === "outbound_callback" ? "callback" : "handoff",
      title:
        kind === "outbound_callback"
          ? `外呼/回拨 → ${targetCardId}`
          : `用户去打 → ${targetCardId}`,
      priority: 50,
      condition: { op: "always" },
      effects: [],
    };
    exits.push(exit);
  } else {
    exit = { ...exit, effects: [...(exit.effects ?? [])] };
    const idx = exits.findIndex(function (e) {
      return e.exitId === exitId;
    });
    exits[idx] = exit;
  }

  if (kind === "user_dial") {
    const effectId = `attach_${targetCardId}`;
    const hasAttach = (exit.effects ?? []).some(function (ef) {
      return ef.effect === "attach_call_card" && ef.cardId === targetCardId;
    });
    if (!hasAttach) {
      exit.effects = [
        ...(exit.effects ?? []),
        {
          id: effectId,
          effect: "attach_call_card",
          agentId,
          cardId: targetCardId,
          activation: "inbound_user_dial",
        },
      ];
    }
    return { card: { ...source, exits }, exitId, createsEdge: true };
  }

  // outbound_callback
  const attachId = `attach_out_${targetCardId}`;
  const scheduleId = `sched_${targetCardId}`;
  const hasAttach = (exit.effects ?? []).some(function (ef) {
    return ef.effect === "attach_call_card" && ef.cardId === targetCardId;
  });
  const hasSched = (exit.effects ?? []).some(function (ef) {
    return ef.effect === "schedule_call_card" && ef.cardId === targetCardId;
  });
  const nextEffects = [...(exit.effects ?? [])];
  if (!hasAttach) {
    nextEffects.push({
      id: attachId,
      effect: "attach_call_card",
      agentId,
      cardId: targetCardId,
      activation: "outbound_auto",
    });
  }
  if (!hasSched) {
    nextEffects.push({
      id: scheduleId,
      effect: "schedule_call_card",
      agentId,
      cardId: targetCardId,
      packageId: opts.packageId,
      delayMinutes: 5,
    });
  }
  exit.effects = nextEffects;
  return { card: { ...source, exits }, exitId, createsEdge: true };
}

/** @deprecated 使用 applyExitConnection(..., { kind: "user_dial" }) */
export function addAttachEdgeToCard(
  sourceCardRaw: unknown,
  targetCardRaw: unknown,
  targetCardId: string,
  packageId = "unknown_package",
): { card: StoryCardShape; exitId: string } | null {
  const result = applyExitConnection(
    sourceCardRaw,
    targetCardRaw,
    targetCardId,
    { packageId, kind: "user_dial" },
  );
  if (!result) return null;
  return { card: result.card, exitId: result.exitId };
}

export function removeAttachEdgeFromCard(
  sourceCardRaw: unknown,
  exitId: string,
  effectId: string,
): StoryCardShape | null {
  const source = asCard(sourceCardRaw);
  if (!source?.exits) return null;
  const exits = source.exits.map(function (exit) {
    if (exit.exitId !== exitId) return exit;
    return {
      ...exit,
      effects: (exit.effects ?? []).filter(function (ef) {
        const idMatch = ef.id === effectId;
        const edgeFx =
          ef.effect === "attach_call_card" ||
          ef.effect === "schedule_call_card";
        return !(idMatch && edgeFx);
      }),
    };
  });
  return { ...source, exits };
}

export function buildStoryCardTemplate(opts: {
  cardId: string;
  ownerAgentId: string;
  title?: string;
}): StoryCardShape {
  return {
    cardId: opts.cardId,
    cardKind: "story",
    title: opts.title ?? opts.cardId,
    ownerAgentId: opts.ownerAgentId,
    entryMode: "inbound_user_dial",
    interactionMode: "realtime_dialogue",
    context: {
      privateBrief: "",
      speakableBrief: "",
      background: "",
      premise: "",
      emotion: "",
      objective: "",
      forbidden: [],
      promptScenes: [],
    },
    objectives: { requiredBeats: [] },
    toolPolicy: { mode: "allowlist", allowedToolIds: [] },
    exits: [],
  };
}
