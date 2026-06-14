import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { BudgetManager } from '../../src/lib/ai/budget-manager';
import { ProviderRegistry } from '../../src/lib/ai/providers';

describe('Budget Manager', () => {
  let budgetManager: BudgetManager;
  let registry: ProviderRegistry;

  beforeEach(() => {
    vi.useFakeTimers();
    registry = new ProviderRegistry();
    budgetManager = new BudgetManager(registry);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should allow provider when READY and under budget', () => {
    expect(budgetManager.canUseProvider('groq')).toBe(true);
    // After checking, state becomes PENDING, so checking again shouldn't fail unless budget is hit
  });

  it('should restrict provider if requests exceed RPM', () => {
    // groq RPM is 30
    for (let i = 0; i < 30; i++) {
      expect(budgetManager.canUseProvider('groq')).toBe(true);
      budgetManager.recordSuccess('groq');
    }
    // The 31st request should be rejected
    expect(budgetManager.canUseProvider('groq')).toBe(false);
  });

  it('should reset minute window after 60 seconds', () => {
    for (let i = 0; i < 30; i++) {
      budgetManager.canUseProvider('groq');
      budgetManager.recordSuccess('groq');
    }
    expect(budgetManager.canUseProvider('groq')).toBe(false);

    // Advance time by 60 seconds
    vi.advanceTimersByTime(60000);

    // Now it should be allowed again
    expect(budgetManager.canUseProvider('groq')).toBe(true);
  });

  it('should handle rate limits correctly with default cooldown', () => {
    budgetManager.canUseProvider('groq');
    budgetManager.recordRateLimit('groq'); // 10000ms default cooldown

    expect(budgetManager.canUseProvider('groq')).toBe(false);

    vi.advanceTimersByTime(5000);
    expect(budgetManager.canUseProvider('groq')).toBe(false); // Still cooling

    vi.advanceTimersByTime(5000);
    // After 10s cooldown, it enters COOLING until the end of the minute
    expect(budgetManager.canUseProvider('groq')).toBe(false);

    // Advance time to next minute window
    vi.advanceTimersByTime(50000); // 60s total
    expect(budgetManager.canUseProvider('groq')).toBe(true);
  });

  it('should handle custom retry-after cooldowns', () => {
    budgetManager.canUseProvider('groq');
    budgetManager.recordRateLimit('groq', 30); // 30 seconds

    expect(budgetManager.canUseProvider('groq')).toBe(false);

    vi.advanceTimersByTime(20000);
    expect(budgetManager.canUseProvider('groq')).toBe(false);

    vi.advanceTimersByTime(10000);
    // After 30s it goes to COOLING until minute ends
    expect(budgetManager.canUseProvider('groq')).toBe(false);

    vi.advanceTimersByTime(30000); // end of minute
    expect(budgetManager.canUseProvider('groq')).toBe(true);
  });

  it('should handle degraded states with 15s cooldown', () => {
    budgetManager.canUseProvider('groq');
    budgetManager.recordError('groq'); // DEGRADED => 15s cooldown

    expect(budgetManager.canUseProvider('groq')).toBe(false);

    vi.advanceTimersByTime(10000);
    expect(budgetManager.canUseProvider('groq')).toBe(false);

    vi.advanceTimersByTime(5000); // 15s total
    // DEGRADED state rests directly to READY after TTL
    expect(budgetManager.canUseProvider('groq')).toBe(true);
  });
});
