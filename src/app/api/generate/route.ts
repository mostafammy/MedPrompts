import { NextResponse } from 'next/server';
import { BudgetManager } from '../../../lib/ai/budget-manager';
import { ProviderRegistry } from '../../../lib/ai/providers';
import { executeWaterfall } from '../../../lib/ai/waterfall';
import { sanitizeTopic } from '../../../lib/ai/sanitize';
import { ProviderName } from '../../../lib/ai/types';

export const runtime = 'edge';

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

function getClientIp(req: Request): string {
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

async function acquireSlot(): Promise<void> {
  if (activeExecutions < MAX_CONCURRENCY) {
    activeExecutions++;
    return;
  }
  return new Promise<void>((resolve) => {
    executionQueue.push(resolve);
  });
}

function releaseSlot(): void {
  activeExecutions--;
  const next = executionQueue.shift();
  if (next) {
    activeExecutions++;
    next();
  }
}

export async function POST(req: Request) {
  try {
    // 1. Per-IP Rate Limiting (before parsing body)
    const ip = getClientIp(req);
    const now = Date.now();
    let limit = ipLimits.get(ip);

    if (!limit || now >= limit.resetAt) {
      limit = { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS };
      ipLimits.set(ip, limit);
    } else {
      if (limit.count >= RATE_LIMIT_MAX_REQUESTS) {
        return NextResponse.json(
          { error: 'Too many requests. Please try again in 60 seconds.' },
          { status: 429 }
        );
      }
      limit.count++;
    }

    // 2. Early-Exit for Provider Exhaustion
    const { exhausted, exhaustedProviders } = areProvidersExhausted(
      budgetManager,
      registry,
      MAX_EXHAUSTED_PROVIDERS_THRESHOLD
    );
    if (exhausted) {
      return NextResponse.json(
        {
          error: 'Service temporarily overloaded. Please try again in 60 seconds.',
          exhaustedProviders
        },
        { status: 429 }
      );
    }

    const body = await req.json();
    const { topic, subject } = body;

    if (!topic || !subject || typeof subject !== 'string' || subject.trim() === '') {
      return NextResponse.json(
        { error: 'Request must include non-empty `topic` and `subject` fields.' },
        { status: 400 }
      );
    }

    const sanitizedTopic = sanitizeTopic(topic);
    if (!sanitizedTopic.isValid) {
      return NextResponse.json(
        { error: sanitizedTopic.error || 'Invalid topic' },
        { status: 400 }
      );
    }

    const sanitizedSubject = sanitizeTopic(subject);
    if (!sanitizedSubject.isValid) {
      return NextResponse.json(
        { error: sanitizedSubject.error ? sanitizedSubject.error.replace('Topic', 'Subject') : 'Invalid subject' },
        { status: 400 }
      );
    }

    const prompt = `You are an expert medical AI assistant.\nCreate a comprehensive study prompt for the subject "${sanitizedSubject.sanitized}" focusing on the topic "${sanitizedTopic.sanitized}".\nPlease output the study prompt in Markdown format.`;

    // 3. Concurrency Limiter: reject if queue and concurrency are both full
    if (activeExecutions >= MAX_CONCURRENCY && executionQueue.length >= MAX_QUEUE_SIZE) {
      return NextResponse.json(
        { error: 'Service is busy. Please try again in 60 seconds.' },
        { status: 429 }
      );
    }

    await acquireSlot();

    try {
      const result = await executeWaterfall(prompt, budgetManager, registry);

      if (!result.success) {
        return NextResponse.json(
          { 
            error: 'Service temporarily overloaded. Please try again in 60 seconds.',
            exhaustedProviders: result.exhaustedProviders
          },
          { status: 429 }
        );
      }

      return NextResponse.json(
        { data: result.text },
        { 
          status: 200,
          headers: {
            'X-Provider': result.provider,
            'X-Provider-Tier': String(result.tier),
            'X-Latency-Ms': String(result.latencyMs),
            'Cache-Control': 'no-store'
          }
        }
      );
    } finally {
      releaseSlot();
    }

  } catch {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(req: Request) {
  const secret = req.headers.get('x-health-secret');
  const validSecret = process.env.HEALTH_CHECK_SECRET;

  const isAuthorized = validSecret && secret === validSecret;
  
  // Calculate if overall status is degraded (e.g. if any provider is not READY)
  // For simplicity, if tier 1 (groq) is not READY, we can say degraded, or just operational by default.
  let status = 'operational';
  
  const statuses = budgetManager.getStatuses();
  if (statuses['groq'].state !== 'READY') {
    status = 'degraded';
  }

  if (isAuthorized) {
    return NextResponse.json({
      status,
      timestamp: new Date().toISOString(),
      providers: statuses
    }, { status: 200 });
  }

  return NextResponse.json({
    status,
    timestamp: new Date().toISOString()
  }, { status: 200 });
}
