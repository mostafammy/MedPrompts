import { NextResponse } from 'next/server';
import { executeWaterfall } from '../../../lib/ai/waterfall';
import { sanitizeTopic } from '../../../lib/ai/sanitize';

export const runtime = 'edge';
import {
  registry,
  budgetManager,
  ipLimits,
  RATE_LIMIT_WINDOW_MS,
  RATE_LIMIT_MAX_REQUESTS,
  MAX_EXHAUSTED_PROVIDERS_THRESHOLD,
  MAX_CONCURRENCY,
  MAX_QUEUE_SIZE,
  activeExecutions,
  executionQueue,
  getClientIp,
  areProvidersExhausted,
  acquireSlot,
  releaseSlot
} from './state';


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
