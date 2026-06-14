/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { IBudgetManager, IProviderRegistry, ProviderName } from '../../src/lib/ai/types';
import { executeWaterfall } from '../../src/lib/ai/waterfall';
import { generateText } from 'ai';

// Mock the 'ai' module's generateText to bypass actual network calls
vi.mock('ai', async (importOriginal) => {
  const actual = await importOriginal<typeof import('ai')>();
  return {
    ...actual,
    generateText: vi.fn(),
  };
});

import * as aiModule from 'ai';

class MockBudgetManager implements IBudgetManager {
  available: Set<ProviderName> = new Set(['groq', 'cerebras', 'deepinfra', 'togetherai', 'openrouter', 'google']);
  successes: ProviderName[] = [];
  rateLimits: ProviderName[] = [];
  errors: ProviderName[] = [];

  canUseProvider(provider: ProviderName): boolean {
    return this.available.has(provider);
  }
  recordSuccess(provider: ProviderName): void {
    this.successes.push(provider);
  }
  recordRateLimit(provider: ProviderName, retryAfterSeconds?: number): void {
    this.rateLimits.push(provider);
    this.available.delete(provider);
  }
  recordError(provider: ProviderName): void {
    this.errors.push(provider);
    this.available.delete(provider);
  }
  getStatuses(): Record<ProviderName, any> {
    return {} as Record<ProviderName, any>;
  }
}

class MockProviderRegistry implements IProviderRegistry {
  getWaterfallOrder(): ProviderName[] {
    return ['groq', 'cerebras', 'deepinfra', 'togetherai', 'openrouter', 'google'];
  }
  getModel(provider: ProviderName): any {
    // Return a dummy model
    return {
      specificationVersion: 'v1',
      provider: provider,
      modelId: 'mock-model',
      defaultObjectGenerationMode: 'json',
      doGenerate: async () => ({
        text: `Response from ${provider}`,
        finishReason: 'stop' as any,
        usage: { promptTokens: 10, completionTokens: 20 },
        rawCall: { rawPrompt: null, rawSettings: {} },
        warnings: [] as any[]
      })
    };
  }
  getConfig(provider: ProviderName) {
    return {
      name: provider,
      displayName: `Mock ${provider}`,
      rpm: 10,
      tpd: 0,
      p50LatencyMs: 100,
      defaultCooldownMs: 1000,
      createModel: () => this.getModel(provider)
    };
  }
}

describe('Waterfall Inference Engine', () => {
  let budgetManager: MockBudgetManager;
  let registry: MockProviderRegistry;

  beforeEach(() => {
    budgetManager = new MockBudgetManager();
    registry = new MockProviderRegistry();
    vi.clearAllMocks();
  });

  it('should succeed on the first provider if available', async () => {
    vi.mocked(aiModule.generateText).mockResolvedValueOnce({
      text: 'Response from groq',
      finishReason: 'stop',
      usage: { promptTokens: 10, completionTokens: 20, totalTokens: 30 },
      warnings: [],
      rawCall: { rawPrompt: null, rawSettings: {} },
      response: { messages: [] },
      steps: []
    } as any);

    const result = await executeWaterfall('test prompt', budgetManager, registry);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.provider).toBe('groq');
      expect(result.tier).toBe(1);
    }
    expect(budgetManager.successes).toContain('groq');
  });

  it('should fallback to second provider if first fails with rate limit', async () => {
    // First call throws a mock APICallError for 429
    const error429 = new Error('Rate limit exceeded');
    (error429 as any).statusCode = 429;

    vi.mocked(aiModule.generateText)
      .mockRejectedValueOnce(error429)
      .mockResolvedValueOnce({
        text: 'Response from cerebras',
        finishReason: 'stop',
        usage: { promptTokens: 10, completionTokens: 20, totalTokens: 30 },
        warnings: [],
        rawCall: { rawPrompt: null, rawSettings: {} },
        response: { messages: [] },
        steps: []
      } as any);

    const result = await executeWaterfall('test prompt', budgetManager, registry);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.provider).toBe('cerebras');
      expect(result.tier).toBe(2);
    }
    expect(budgetManager.rateLimits).toContain('groq');
    expect(budgetManager.successes).toContain('cerebras');
  });

  it('should skip provider if budget manager says it cannot be used', async () => {
    budgetManager.available.delete('groq');

    vi.mocked(aiModule.generateText).mockResolvedValueOnce({
      text: 'Response from cerebras',
      finishReason: 'stop',
      usage: { promptTokens: 10, completionTokens: 20, totalTokens: 30 },
      warnings: [],
      rawCall: { rawPrompt: null, rawSettings: {} },
      response: { messages: [] },
      steps: []
    } as any);

    const result = await executeWaterfall('test prompt', budgetManager, registry);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.provider).toBe('cerebras');
      expect(result.tier).toBe(2);
    }
    // We shouldn't even call generateText for groq
    expect(vi.mocked(aiModule.generateText)).toHaveBeenCalledTimes(1);
  });

  it('should fail if all providers are exhausted', async () => {
    // All providers fail
    const error500 = new Error('Internal server error');
    (error500 as any).statusCode = 500;

    vi.mocked(aiModule.generateText).mockRejectedValue(error500);

    const result = await executeWaterfall('test prompt', budgetManager, registry);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.exhaustedProviders.length).toBe(6);
    }
  });
});
