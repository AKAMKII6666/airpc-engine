/**
 * Prompt Provider Registry：把 provider 顺序从 composer 调用点外置出来。
 */
import type { PromptProvider } from "./composer.js";

export type PromptProviderRegistry = {
  providers: readonly PromptProvider[];
  getProviderIds(): string[];
};

function assertUniqueProviderIds(providers: readonly PromptProvider[]): void {
  const seen = new Set<string>();
  for (const provider of providers) {
    if (seen.has(provider.providerId)) {
      throw new Error(`duplicate prompt provider id: ${provider.providerId}`);
    }
    seen.add(provider.providerId);
  }
}

export function createPromptProviderRegistry(
  providers: readonly PromptProvider[],
): PromptProviderRegistry {
  const frozenProviders = Object.freeze([...providers]);
  assertUniqueProviderIds(frozenProviders);
  return Object.freeze({
    providers: frozenProviders,
    getProviderIds() {
      return frozenProviders.map(function (provider) {
        return provider.providerId;
      });
    },
  });
}
