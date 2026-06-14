# Dependency Injection Contracts: Resilient Waterfall Inference Engine

This document outlines the interfaces used to achieve full decoupling and testability of the waterfall fallback loop.

---

## 1. IBudgetManager

Tracks rate-limits, errors, and successes. Decouples the storage and logic of rate-limit detection from the core loop execution.

```typescript
export interface IBudgetManager {
  /**
   * Pre-flight availability check.
   * Returns true if the provider can accept requests.
   * Returns false if cooling, degraded, rate-limited, or over RPM capacity.
   */
  canUseProvider(provider: ProviderName): boolean;

  /**
   * Records a successful inference execution.
   */
  recordSuccess(provider: ProviderName): void;

  /**
   * Records a reactive rate-limit error (HTTP 429).
   * @param provider The name of the throttled provider.
   * @param retryAfterSeconds Optional cooldown value parsed from the Retry-After header.
   */
  recordRateLimit(provider: ProviderName, retryAfterSeconds?: number): void;

  /**
   * Records a hard error (5xx, network failure, or timeout).
   */
  recordError(provider: ProviderName): void;
}
```

---

## 2. IProviderRegistry

Resolves active provider models, configurations, and waterfall priorities. Allows swapping models or provider order without updating the waterfall engine.

```typescript
export interface IProviderRegistry {
  /**
   * Returns the prioritized array of provider names representing the waterfall chain.
   */
  getWaterfallOrder(): ProviderName[];

  /**
   * Resolves and returns the Vercel AI SDK LanguageModel instance.
   */
  getModel(provider: ProviderName): LanguageModel;

  /**
   * Returns the static configuration block for a given provider.
   */
  getConfig(provider: ProviderName): ProviderConfig;
}
```
