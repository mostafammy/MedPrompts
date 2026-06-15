import { describe, it, expect, vi } from 'vitest';
import { rateLimit, RateLimit } from '../../src/lib/security/rateLimit';

describe('rateLimit', () => {
  it('should return null if limit is not reached', async () => {
    const mockRateLimiter: RateLimit = {
      limit: vi.fn().mockResolvedValue({ success: true })
    };
    const request = new Request('https://test.com', { headers: { 'CF-Connecting-IP': '1.1.1.1' } });
    
    const response = await rateLimit(request, { RATE_LIMITER: mockRateLimiter });
    expect(response).toBeNull();
  });

  it('should return 429 response if limit is reached', async () => {
    const mockRateLimiter: RateLimit = {
      limit: vi.fn().mockResolvedValue({ success: false })
    };
    const request = new Request('https://test.com', { headers: { 'CF-Connecting-IP': '1.1.1.1' } });
    
    const response = await rateLimit(request, { RATE_LIMITER: mockRateLimiter });
    expect(response).not.toBeNull();
    expect(response?.status).toBe(429);
    expect(response?.headers.get('Retry-After')).toBe('60');
  });
});
