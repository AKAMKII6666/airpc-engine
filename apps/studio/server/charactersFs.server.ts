/**
 * 模块名称：角色目录读写（Content）
 */
import {
  access,
  mkdir,
  readdir,
  readFile,
  unlink,
  writeFile,
} from "node:fs/promises";
import path from "node:path";
import { getStudioDataRoot } from "@studio/server/dataRoot.server";

export interface CharacterSummary {
  agentId: string;
  displayName: string;
  dialable: boolean;
  isNarrativeOnly?: boolean;
  freeCardId?: string;
}

const AGENT_ID_RE = /^[a-z][a-z0-9_-]{0,63}$/;

export function isValidAgentId(agentId: string): boolean {
  return AGENT_ID_RE.test(agentId);
}

function charactersRoot(): string {
  return path.join(getStudioDataRoot(), "characters");
}

function characterPath(agentId: string): string {
  return path.join(charactersRoot(), `${agentId}.json`);
}

function freeCardPath(freeCardId: string): string {
  return path.join(charactersRoot(), "free-cards", `${freeCardId}.s-card.json`);
}

async function pathExists(p: string): Promise<boolean> {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

export async function listCharacters(): Promise<CharacterSummary[]> {
  const root = charactersRoot();
  const names = await readdir(root);
  const out: CharacterSummary[] = [];
  for (const name of names) {
    if (!name.endsWith(".json")) continue;
    try {
      const raw = JSON.parse(
        await readFile(path.join(root, name), "utf8"),
      ) as {
        agentId: string;
        displayName?: string;
        dialable?: boolean;
        isNarrativeOnly?: boolean;
        freeCardId?: string;
      };
      out.push({
        agentId: raw.agentId,
        displayName: raw.displayName ?? raw.agentId,
        dialable: Boolean(raw.dialable),
        isNarrativeOnly: raw.isNarrativeOnly,
        freeCardId: raw.freeCardId,
      });
    } catch {
      // skip broken
    }
  }
  return out.sort(function (a, b) {
    return a.agentId.localeCompare(b.agentId);
  });
}

export async function readCharacter(agentId: string): Promise<unknown> {
  return JSON.parse(await readFile(characterPath(agentId), "utf8"));
}

export async function writeCharacter(
  agentId: string,
  def: unknown,
): Promise<void> {
  const text = JSON.stringify(def, null, 2) + "\n";
  await writeFile(characterPath(agentId), text, "utf8");
}

export async function createCharacter(input: {
  agentId: string;
  displayName?: string;
  withFreeCard?: boolean;
}): Promise<CharacterSummary> {
  const agentId = input.agentId.trim();
  if (!isValidAgentId(agentId)) {
    throw Object.assign(
      new Error("agentId 须为小写字母开头的 snake_case／连字符"),
      { code: "VALIDATION_FAILED" },
    );
  }
  if (await pathExists(characterPath(agentId))) {
    throw Object.assign(new Error(`character already exists: ${agentId}`), {
      code: "VALIDATION_FAILED",
    });
  }
  const displayName = (input.displayName ?? agentId).trim() || agentId;
  const freeCardId =
    input.withFreeCard === false ? undefined : `${agentId}_free`;
  const def: Record<string, unknown> = {
    schemaVersion: 1,
    agentId,
    displayName,
    dialable: false,
    isNarrativeOnly: false,
    identity: {},
    persona: { systemPrompt: "" },
    social: [],
    defaultPromptScenes: [],
  };
  if (freeCardId) {
    def.freeCardId = freeCardId;
    await writeFreeCard(freeCardId, {
      cardId: freeCardId,
      cardKind: "free",
      ownerAgentId: agentId,
      title: `${displayName} Free`,
      entryMode: "inbound_user_dial",
      interactionMode: "realtime_dialogue",
      toolPolicy: { mode: "inherit_free" },
      exits: [],
      context: {},
    });
  }
  await writeCharacter(agentId, def);
  return {
    agentId,
    displayName,
    dialable: false,
    isNarrativeOnly: false,
    freeCardId,
  };
}

export async function deleteCharacter(agentId: string): Promise<void> {
  if (!isValidAgentId(agentId)) {
    throw Object.assign(new Error("invalid agentId"), {
      code: "VALIDATION_FAILED",
    });
  }
  let freeCardId: string | undefined;
  try {
    const raw = (await readCharacter(agentId)) as { freeCardId?: string };
    freeCardId =
      typeof raw.freeCardId === "string" ? raw.freeCardId : undefined;
  } catch {
    throw Object.assign(new Error(`character not found: ${agentId}`), {
      code: "NOT_FOUND",
    });
  }
  await unlink(characterPath(agentId));
  if (freeCardId) {
    try {
      await unlink(freeCardPath(freeCardId));
    } catch {
      // free 文件可缺
    }
  }
}

export async function readFreeCard(freeCardId: string): Promise<unknown> {
  return JSON.parse(await readFile(freeCardPath(freeCardId), "utf8"));
}

export async function writeFreeCard(
  freeCardId: string,
  card: unknown,
): Promise<void> {
  const dir = path.join(charactersRoot(), "free-cards");
  await mkdir(dir, { recursive: true });
  const text = JSON.stringify(card, null, 2) + "\n";
  await writeFile(freeCardPath(freeCardId), text, "utf8");
}
