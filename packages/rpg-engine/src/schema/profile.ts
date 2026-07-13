/**
 * 模块名称：User / PlayerProfile Zod（薄存档）
 */
import { z } from "zod";

export const UserSchema = z.object({
  userId: z.string(),
  nickname: z.string(),
  fullName: z.string().optional(),
  location: z
    .object({
      country: z.string(),
      province: z.string(),
      city: z.string(),
      district: z.string().optional(),
    })
    .optional(),
  preferences: z.record(z.string(), z.unknown()).optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type User = z.infer<typeof UserSchema>;

export const CallCardInstanceSchema = z.object({
  instanceId: z.string(),
  cardId: z.string(),
  packageId: z.string(),
  agentId: z.string(),
  status: z.enum(["pending", "active", "completed", "cancelled"]),
  entryMode: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string().optional(),
});

export type CallCardInstance = z.infer<typeof CallCardInstanceSchema>;

export const CharacterRuntimeSchema = z
  .object({
    agentId: z.string(),
    unlocked: z.boolean().optional(),
  })
  .passthrough();

export const PlayerProfileSchema = z
  .object({
    schemaVersion: z.literal(1),
    userId: z.string(),
    user: UserSchema,
    characters: z.record(z.string(), CharacterRuntimeSchema).default({}),
    stories: z.record(z.string(), z.unknown()).default({}),
    callCards: z
      .object({
        board: z
          .object({
            byAgent: z
              .record(
                z.string(),
                z.object({
                  pending: z.array(CallCardInstanceSchema).default([]),
                }),
              )
              .default({}),
          })
          .default({ byAgent: {} }),
      })
      .default({ board: { byAgent: {} } }),
    telephony: z
      .object({
        redialSlot: z
          .object({
            agentId: z.string(),
            cardId: z.string().optional(),
          })
          .nullable()
          .optional(),
      })
      .optional(),
    world: z
      .object({
        lore: z.unknown().nullable().optional(),
        facts: z.array(z.unknown()).default([]),
        knowledge: z.record(z.string(), z.unknown()).default({}),
      })
      .default({ lore: null, facts: [], knowledge: {} }),
    schedule: z
      .object({
        clockMs: z.number().default(0),
        intents: z.array(z.unknown()).default([]),
      })
      .default({ clockMs: 0, intents: [] }),
    research: z
      .object({
        commitments: z.array(z.unknown()).default([]),
      })
      .default({ commitments: [] }),
    meta: z.record(z.string(), z.unknown()).optional(),
  })
  .passthrough();

export type PlayerProfile = z.infer<typeof PlayerProfileSchema>;
