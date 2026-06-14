/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { POST, GET, budgetManager, resetRequestDefensesState } from '../../src/app/api/generate/route';

vi.mock('ai', async (importOriginal) => {
  const actual = await importOriginal<typeof import('ai')>();
  return {
    ...actual,
    generateText: vi.fn(),
  };
});

import * as aiModule from 'ai';

describe('API Route /api/generate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.HEALTH_CHECK_SECRET = 'super-secret';
    resetRequestDefensesState();
    (budgetManager as any).statuses.clear();
  });

  afterEach(() => {
    delete process.env.HEALTH_CHECK_SECRET;
  });

  it('should return 400 if topic or subject is missing', async () => {
    const req = new Request('http://localhost/api/generate', {
      method: 'POST',
      body: JSON.stringify({}),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain('topic');
  });

  it('should return 400 if topic fails sanitization', async () => {
    const req = new Request('http://localhost/api/generate', {
      method: 'POST',
      body: JSON.stringify({ topic: '<script>alert(1)</script>', subject: 'Cardiology' }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('should return 200 and custom headers on successful generation', async () => {
    vi.mocked(aiModule.generateText).mockResolvedValueOnce({
      text: 'Mocked generation',
      usage: { totalTokens: 10 }
    } as any);

    const req = new Request('http://localhost/api/generate', {
      method: 'POST',
      body: JSON.stringify({ topic: 'Diabetes', subject: 'Endocrinology' }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);

    expect(res.headers.get('X-Provider')).toBe('groq'); // Groq is first in waterfall
    expect(res.headers.get('X-Provider-Tier')).toBe('1');
    expect(res.headers.has('X-Latency-Ms')).toBe(true);
    expect(res.headers.get('Cache-Control')).toBe('no-store');

    const data = await res.json();
    expect(data.data).toBe('Mocked generation');
  });

  it('should return 429 if all providers fail', async () => {
    vi.mocked(aiModule.generateText).mockRejectedValue(new Error('Mocked error'));

    const req = new Request('http://localhost/api/generate', {
      method: 'POST',
      body: JSON.stringify({ topic: 'Hypertension', subject: 'Cardiology' }),
    });

    const res = await POST(req);
    expect(res.status).toBe(429);

    const data = await res.json();
    expect(data.error).toContain('overloaded');
    expect(data.exhaustedProviders.length).toBe(6);
  });

  it('GET should return operational without providers if unauthorized', async () => {
    const req = new Request('http://localhost/api/generate', {
      method: 'GET',
    });
    const res = await GET(req);
    expect(res.status).toBe(200);
    
    const data = await res.json();
    expect(data.status).toBeDefined();
    expect(data.timestamp).toBeDefined();
    expect(data.providers).toBeUndefined();
  });

  it('GET should return full statuses if authorized', async () => {
    const req = new Request('http://localhost/api/generate', {
      method: 'GET',
      headers: {
        'x-health-secret': 'super-secret'
      }
    });
    const res = await GET(req);
    expect(res.status).toBe(200);
    
    const data = await res.json();
    expect(data.status).toBeDefined();
    expect(data.providers).toBeDefined();
    expect(data.providers.groq).toBeDefined();
  });

  describe('Request-level defenses', () => {
    it('should rate limit requests by IP after 10 requests', async () => {
      vi.mocked(aiModule.generateText).mockResolvedValue({
        text: 'Mocked generation',
        usage: { totalTokens: 10 }
      } as any);

      // Send 10 successful requests
      for (let i = 0; i < 10; i++) {
        const req = new Request('http://localhost/api/generate', {
          method: 'POST',
          headers: { 'x-forwarded-for': '1.2.3.4' },
          body: JSON.stringify({ topic: 'Diabetes', subject: 'Endocrinology' }),
        });
        const res = await POST(req);
        expect(res.status).toBe(200);
      }

      // The 11th request should be rate limited
      const req11 = new Request('http://localhost/api/generate', {
        method: 'POST',
        headers: { 'x-forwarded-for': '1.2.3.4' },
        body: JSON.stringify({ topic: 'Diabetes', subject: 'Endocrinology' }),
      });
      const res11 = await POST(req11);
      expect(res11.status).toBe(429);
      const data = await res11.json();
      expect(data.error).toContain('Too many requests');

      // Request from a different IP should succeed
      const reqDiff = new Request('http://localhost/api/generate', {
        method: 'POST',
        headers: { 'x-forwarded-for': '5.6.7.8' },
        body: JSON.stringify({ topic: 'Diabetes', subject: 'Endocrinology' }),
      });
      const resDiff = await POST(reqDiff);
      expect(resDiff.status).toBe(200);
    });

    it('should reject requests with 429 when concurrency queue is full', async () => {
      // Mock generateText to hang so we can test concurrency
      let resolvePromise: any;
      const hangPromise = new Promise((resolve) => {
        resolvePromise = resolve;
      });
      vi.mocked(aiModule.generateText).mockReturnValue(hangPromise as any);

      const promises: Promise<Response>[] = [];
      
      // Fire 15 requests (MAX_CONCURRENCY=5 + MAX_QUEUE_SIZE=10 = 15 total allowed in queue/active)
      // Use different IPs so we don't trigger IP rate limiting
      for (let i = 0; i < 15; i++) {
        const req = new Request('http://localhost/api/generate', {
          method: 'POST',
          headers: { 'x-forwarded-for': `1.1.1.${i}` },
          body: JSON.stringify({ topic: 'Diabetes', subject: 'Endocrinology' }),
        });
        promises.push(POST(req));
      }

      // The 16th request should fail immediately with 429 busy error
      const req16 = new Request('http://localhost/api/generate', {
        method: 'POST',
        headers: { 'x-forwarded-for': '1.1.1.16' },
        body: JSON.stringify({ topic: 'Diabetes', subject: 'Endocrinology' }),
      });
      const res16 = await POST(req16);
      expect(res16.status).toBe(429);
      const data16 = await res16.json();
      expect(data16.error).toContain('Service is busy');

      // Resolve the AI calls so the test finishes cleanly
      resolvePromise({
        text: 'Mocked generation',
        usage: { totalTokens: 10 }
      });

      await Promise.all(promises);
    });

    it('should exit early with 429 if 4 or more providers are exhausted', async () => {
      // Mark 4 providers as RATE_LIMITED in budget manager
      budgetManager.recordRateLimit('groq');
      budgetManager.recordRateLimit('cerebras');
      budgetManager.recordRateLimit('deepinfra');
      budgetManager.recordRateLimit('togetherai');

      const req = new Request('http://localhost/api/generate', {
        method: 'POST',
        body: JSON.stringify({ topic: 'Diabetes', subject: 'Endocrinology' }),
      });

      // Should exit early with 429
      const res = await POST(req);
      expect(res.status).toBe(429);
      const data = await res.json();
      expect(data.error).toContain('overloaded');
      expect(data.exhaustedProviders).toEqual(
        expect.arrayContaining(['groq', 'cerebras', 'deepinfra', 'togetherai'])
      );
    });
  });
});
