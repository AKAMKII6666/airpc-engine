/**
 * 模块名称：rpg-engine 包入口（统一门面）
 * 模块说明：Studio/壳只从此导入；禁止深挖内部路径。
 */

export { ENGINE_PACKAGE_NAME, getEnginePackageName } from "./packageMeta.js";

export {
  createEngineHost,
  getEngineHost,
  resetEngineHostForTests,
  type EngineHost,
  type CreateEngineHostOptions,
} from "./host/createEngineHost.js";

export {
  engineError,
  isEngineError,
  type EngineError,
  type EngineErrorCode,
} from "./host/errors.js";

export type {
  BeginCallOpts,
  CallIntent,
  CallSession,
  CallSessionStatus,
  ComposeScene,
  EndCallResult,
  EffectPlanResult,
  LogRecord,
  ResolveResult,
  SaveReason,
} from "./host/types.js";

export {
  PlayerProfileSchema,
  UserSchema,
  type PlayerProfile,
  type User,
} from "./schema/profile.js";

export {
  CallCardDefinitionSchema,
  StoryPackageConfSchema,
  type CallCardDefinition,
} from "./schema/callCard.js";

export {
  CharacterDefSchema,
  isEffectiveDialable,
  type CharacterDef,
} from "./schema/character.js";

export {
  OutcomeSchema,
  type Outcome,
} from "./schema/outcome.js";
