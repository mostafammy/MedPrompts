/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { POST, GET } from '../../src/app/api/generate/route';

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
});
