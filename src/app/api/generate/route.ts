import { NextResponse } from 'next/server';
import { BudgetManager } from '../../../lib/ai/budget-manager';
import { ProviderRegistry } from '../../../lib/ai/providers';
import { executeWaterfall } from '../../../lib/ai/waterfall';
import { sanitizeTopic } from '../../../lib/ai/sanitize';

export const runtime = 'edge';

const registry = new ProviderRegistry();
const budgetManager = new BudgetManager(registry);

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { topic, subject } = body;

    if (!topic || !subject || typeof subject !== 'string' || subject.trim() === '') {
      return NextResponse.json(
        { error: 'Request must include non-empty `topic` and `subject` fields.' },
        { status: 400 }
      );
    }

    const sanitized = sanitizeTopic(topic);
    if (!sanitized.isValid) {
      return NextResponse.json(
        { error: sanitized.error || 'Invalid topic' },
        { status: 400 }
      );
    }

    const prompt = `You are an expert medical AI assistant.\nCreate a comprehensive study prompt for the subject "${subject.trim()}" focusing on the topic "${sanitized.sanitized}".\nPlease output the study prompt in Markdown format.`;

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
