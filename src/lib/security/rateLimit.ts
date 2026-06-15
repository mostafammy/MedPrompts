export interface RateLimit {
  limit(options: { key: string }): Promise<{ success: boolean }>;
}

export async function rateLimit(request: Request, env: { RATE_LIMITER: RateLimit }): Promise<Response | null> {
  const ip = request.headers.get('CF-Connecting-IP') || 'anonymous';
  
  const result = await env.RATE_LIMITER.limit({ key: ip });
  
  if (!result.success) {
    return new Response('Too Many Requests', {
      status: 429,
      headers: {
        'Retry-After': '60',
        'Content-Type': 'text/plain'
      }
    });
  }

  return null;
}
