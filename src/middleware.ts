import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { rateLimit } from '@/lib/security/rateLimit';
import { securityHeaders } from '@/lib/security/headers';

export async function middleware(request: NextRequest) {
  // In a real CF Pages environment, RATE_LIMITER would be available in process.env or context.
  // We use a dummy implementation for local dev.
  const env = {
    RATE_LIMITER: {
      async limit() {
        return { success: true };
      }
    }
  };

  const rateLimitResponse = await rateLimit(request, env);
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  const response = NextResponse.next();
  const secureResponse = securityHeaders(response);
  
  // Set X-Cache
  secureResponse.headers.set('X-Cache', 'MISS');

  return secureResponse;
}

export const config = {
  matcher: ['/((?!_next/static|favicon.ico).*)'],
};
