import { BudgetManager } from '../../../lib/ai/budget-manager';
import { ProviderRegistry } from '../../../lib/ai/providers';
import { ProviderName } from '../../../lib/ai/types';

export const registry = new ProviderRegistry();
export const budgetManager = new BudgetManager(registry);

// Request-level defenses state
export const ipLimits = new Map<string, { count: number; resetAt: number }>();
export const RATE_LIMIT_WINDOW_MS = 60 * 1000;
export const RATE_LIMIT_MAX_REQUESTS = 10;

export const MAX_EXHAUSTED_PROVIDERS_THRESHOLD = 4;

export const MAX_CONCURRENCY = 5;
export const MAX_QUEUE_SIZE = 10;
export let activeExecutions = 0;
export const executionQueue: (() => void)[] = [];

export function resetRequestDefensesState() {
  ipLimits.clear();
  activeExecutions = 0;
  executionQueue.length = 0;
}

export function getClientIp(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  return req.headers.get('x-real-ip') || req.headers.get('cf-connecting-ip') || '127.0.0.1';
}

export function areProvidersExhausted(
  bm: BudgetManager,
  reg: ProviderRegistry,
  thresholdN: number
): { exhausted: boolean; exhaustedProviders: ProviderName[] } {
  const statuses = bm.getStatuses();
  const order = reg.getWaterfallOrder();
  const exhaustedProviders: ProviderName[] = [];

  for (const provider of order) {
    const status = statuses[provider];
    const config = reg.getConfig(provider);
    const isExhausted = status.state !== 'READY' || status.requestsThisMinute >= config.rpm;
    if (isExhausted) {
      exhaustedProviders.push(provider);
    }
  }

  return {
    exhausted: exhaustedProviders.length >= thresholdN,
    exhaustedProviders
  };
}

export async function acquireSlot(): Promise<void> {
  if (activeExecutions < MAX_CONCURRENCY) {
    activeExecutions++;
    return;
  }
  return new Promise<void>((resolve) => {
    executionQueue.push(resolve);
  });
}

export function releaseSlot(): void {
  activeExecutions--;
  const next = executionQueue.shift();
  if (next) {
    activeExecutions++;
    next();
  }
}
