/**
 * 模块名称：工作区加载（storis-packages 分文件）
 */
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import {
  CallCardDefinitionSchema,
  StoryPackageConfSchema,
  type CallCardDefinition,
  type StoryPackageConf,
} from "../schema/callCard.js";
import { PlayerProfileSchema, type PlayerProfile } from "../schema/profile.js";
import {
  CharacterDefSchema,
  type CharacterDef,
} from "../schema/character.js";
import { engineError, type EngineError } from "../host/errors.js";

const SUPPORTED_SCHEMA = 1;

export interface LoadedPackage {
  conf: StoryPackageConf;
  dir: string;
  /** 按需填充；不在 loadWorkspace 时预读全部卡 / layout */
  cards: Map<string, CallCardDefinition>;
}

export interface WorkspaceState {
  rootDir: string;
  packages: Map<string, LoadedPackage>;
  characters: Map<string, CharacterDef>;
}

export async function loadWorkspaceState(rootDir: string): Promise<WorkspaceState> {
  const workspacePath = path.join(rootDir, "workspace.json");
  const raw = JSON.parse(await readFile(workspacePath, "utf8")) as {
    schemaVersion?: number;
  };
  if (raw.schemaVersion !== SUPPORTED_SCHEMA) {
    throw engineError(
      "SCHEMA_UNSUPPORTED",
      `workspace schemaVersion ${String(raw.schemaVersion)} unsupported`,
    );
  }

  const packages = new Map<string, LoadedPackage>();
  const packagesRoot = path.join(rootDir, "storis-packages");
  let entries: string[] = [];
  try {
    entries = await readdir(packagesRoot);
  } catch {
    entries = [];
  }

  for (const name of entries) {
    const dir = path.join(packagesRoot, name);
    const confPath = path.join(dir, "story.conf.json");
    let confRaw: string;
    try {
      confRaw = await readFile(confPath, "utf8");
    } catch {
      continue;
    }
    const conf = StoryPackageConfSchema.parse(JSON.parse(confRaw));
    if (conf.schemaVersion !== SUPPORTED_SCHEMA) {
      throw engineError(
        "SCHEMA_UNSUPPORTED",
        `package ${conf.packageId} schemaVersion unsupported`,
      );
    }
    // 故意不读 canvas.layout.json / 不预载 cards/*.s-card.json
    packages.set(conf.packageId, {
      conf,
      dir,
      cards: new Map(),
    });
  }

  const characters = new Map<string, CharacterDef>();
  const charactersRoot = path.join(rootDir, "characters");
  let charFiles: string[] = [];
  try {
    charFiles = await readdir(charactersRoot);
  } catch {
    charFiles = [];
  }
  for (const name of charFiles) {
    if (!name.endsWith(".json")) continue;
    const text = await readFile(path.join(charactersRoot, name), "utf8");
    const def = CharacterDefSchema.parse(JSON.parse(text));
    characters.set(def.agentId, def);
  }

  return { rootDir, packages, characters };
}

export async function loadCard(
  ws: WorkspaceState,
  packageId: string,
  cardId: string,
): Promise<CallCardDefinition | EngineError> {
  const pkg = ws.packages.get(packageId);
  if (!pkg) {
    return engineError("NOT_FOUND", `package not found: ${packageId}`);
  }
  const cached = pkg.cards.get(cardId);
  if (cached) {
    return cached;
  }
  const cardPath = path.join(pkg.dir, "cards", `${cardId}.s-card.json`);
  let text: string;
  try {
    text = await readFile(cardPath, "utf8");
  } catch {
    return engineError("NOT_FOUND", `card not found: ${packageId}/${cardId}`);
  }
  const card = CallCardDefinitionSchema.parse(JSON.parse(text));
  pkg.cards.set(cardId, card);
  return card;
}

export async function readProfile(
  rootDir: string,
  userId: string,
): Promise<PlayerProfile | EngineError> {
  const profilePath = path.join(rootDir, "users", userId, "profile.save.json");
  let text: string;
  try {
    text = await readFile(profilePath, "utf8");
  } catch {
    return engineError("NOT_FOUND", `profile not found: ${userId}`);
  }
  try {
    return PlayerProfileSchema.parse(JSON.parse(text));
  } catch (err) {
    return engineError("VALIDATION_FAILED", "profile parse failed", err);
  }
}

export function profilePath(rootDir: string, userId: string): string {
  return path.join(rootDir, "users", userId, "profile.save.json");
}
