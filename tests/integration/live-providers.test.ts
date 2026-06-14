import './setup';

import { describe, it, expect } from 'vitest';
import { ProviderRegistry, PROVIDERS } from '../../src/lib/ai/providers';
import { BudgetManager } from '../../src/lib/ai/budget-manager';
import { executeWaterfall } from '../../src/lib/ai/waterfall';
import { generateText } from 'ai';
import { ProviderName } from '../../src/lib/ai/types';

describe('Live AI Providers Connectivity & Integration', () => {
  const registry = new ProviderRegistry();
  const budgetManager = new BudgetManager(registry);

  // Helper to check if a key is present and looks valid
  const hasKey = (keyName: string) => {
    const key = process.env[keyName];
    return typeof key === 'string' && key.trim().length > 0 && !key.includes('placeholder');
  };

  const describeIf = (condition: boolean) => (condition ? describe : describe.skip);

  describe('Individual Provider Smoke Tests', () => {
    // 1. Groq
    const groqKeyExists = hasKey('GROQ_API_KEY');
    it.runIf(groqKeyExists)('should connect to Groq and generate response', async () => {
      console.log('Testing live Groq API connection...');
      const model = registry.getModel('groq');
      const startTime = Date.now();
      const result = await generateText({
        model,
        prompt: 'Respond with exactly the word "Success".',
      });
      const latency = Date.now() - startTime;
      console.log(`Groq response: "${result.text.trim()}" in ${latency}ms`);
      expect(result.text).toBeDefined();
      expect(result.text.toLowerCase()).toContain('success');
    });

    // 2. Cerebras
    const cerebrasKeyExists = hasKey('CEREBRAS_API_KEY');
    it.runIf(cerebrasKeyExists)('should connect to Cerebras and generate response', async () => {
      console.log('Testing live Cerebras API connection...');
      const model = registry.getModel('cerebras');
      const startTime = Date.now();
      const result = await generateText({
        model,
        prompt: 'Respond with exactly the word "Success".',
      });
      const latency = Date.now() - startTime;
      console.log(`Cerebras response: "${result.text.trim()}" in ${latency}ms`);
      expect(result.text).toBeDefined();
      expect(result.text.toLowerCase()).toContain('success');
    });

    // 3. Google Gemini
    const googleKeyExists = hasKey('GOOGLE_API_KEY') || hasKey('GEMINI_API_KEY');
    it.runIf(googleKeyExists)('should connect to Google Gemini and generate response', async () => {
      console.log('Testing live Google Gemini API connection...');
      // Sync GEMINI_API_KEY to GOOGLE_API_KEY if needed (Vercel SDK looks for GOOGLE_API_KEY)
      if (!process.env.GOOGLE_API_KEY && process.env.GEMINI_API_KEY) {
        process.env.GOOGLE_API_KEY = process.env.GEMINI_API_KEY;
      }
      const model = registry.getModel('google');
      const startTime = Date.now();
      const result = await generateText({
        model,
        prompt: 'Respond with exactly the word "Success".',
      });
      const latency = Date.now() - startTime;
      console.log(`Google Gemini response: "${result.text.trim()}" in ${latency}ms`);
      expect(result.text).toBeDefined();
      expect(result.text.toLowerCase()).toContain('success');
    });
  });

  describe('E2E Waterfall & Fallback Integration', () => {
    const keysAvailable = hasKey('GROQ_API_KEY') || hasKey('CEREBRAS_API_KEY') || hasKey('GOOGLE_API_KEY');

    it.runIf(keysAvailable)('should execute E2E waterfall prompt successfully with live keys', async () => {
      // Sync GEMINI_API_KEY to GOOGLE_API_KEY if needed
      if (!process.env.GOOGLE_API_KEY && process.env.GEMINI_API_KEY) {
        process.env.GOOGLE_API_KEY = process.env.GEMINI_API_KEY;
      }
      console.log('Testing live executeWaterfall with available providers...');
      const testPrompt = 'Write a short study tip for medical students studying cardiology. Max 1 sentence.';
      
      const result = await executeWaterfall(testPrompt, budgetManager, registry);
      
      expect(result.success).toBe(true);
      if (result.success) {
        console.log(`Waterfall succeeded using provider: ${result.provider} (Tier ${result.tier})`);
        console.log(`Generated Text: "${result.text.trim()}"`);
        expect(result.text).toBeDefined();
        expect(result.text.length).toBeGreaterThan(0);
        expect(result.provider).toBeDefined();
      }
    }, 20000);

    it.runIf(keysAvailable)('should fallback successfully to a working provider if a provider fails', async () => {
      // Create a registry where the first provider (groq) fails dynamically
      class CustomFailingRegistry extends ProviderRegistry {
        override getModel(provider: ProviderName) {
          if (provider === 'groq') {
            return {
              specificationVersion: 'v1',
              provider: 'groq',
              modelId: 'invalid-model',
              defaultObjectGenerationMode: 'json',
              doGenerate: async () => {
                throw new Error('Simulated mock failure for live waterfall integration test');
              }
            } as any;
          }
          return super.getModel(provider);
        }
      }

      console.log('Testing waterfall fallback with simulated failure on groq...');
      const failingRegistry = new CustomFailingRegistry();
      const freshBudgetManager = new BudgetManager(failingRegistry);
      
      const testPrompt = 'Write a 1-sentence cardiology study tip.';
      const result = await executeWaterfall(testPrompt, freshBudgetManager, failingRegistry);
      
      expect(result.success).toBe(true);
      if (result.success) {
        console.log(`Waterfall fallback succeeded using provider: ${result.provider} (Tier ${result.tier})`);
        // It should not be groq
        expect(result.provider).not.toBe('groq');
        expect(result.tier).toBeGreaterThan(1);
      }
    }, 20000);
  });
});
