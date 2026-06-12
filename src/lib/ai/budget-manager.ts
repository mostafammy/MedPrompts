import { IBudgetManager, IProviderRegistry, ProviderName, ProviderStatus } from './types';

export class BudgetManager implements IBudgetManager {
  private statuses: Map<ProviderName, ProviderStatus> = new Map();
  private registry: IProviderRegistry;

  constructor(registry: IProviderRegistry) {
    this.registry = registry;
  }

  private getStatus(provider: ProviderName): ProviderStatus {
    const now = Date.now();
    let status = this.statuses.get(provider);

    if (!status) {
      status = {
        state: 'READY',
        cooldownUntil: 0,
        requestsThisMinute: 0,
        lastResetAt: now,
        totalRequestsToday: 0,
        totalFailures: 0,
      };
      this.statuses.set(provider, status);
    }

    // Reset minute window if 60 seconds have passed
    if (now - status.lastResetAt >= 60000) {
      status.requestsThisMinute = 0;
      status.lastResetAt = now;
      if (status.state === 'COOLING' || status.state === 'RATE_LIMITED' || status.state === 'DEGRADED') {
        // RATE_LIMITED and DEGRADED wait for their TTL, but if minute passed and TTL is expired, reset.
        if (now >= status.cooldownUntil) {
          status.state = 'READY';
        } else if (status.state === 'RATE_LIMITED') {
           // still rate limited
        } else if (status.state === 'DEGRADED') {
           // still degraded
        } else {
           status.state = 'READY';
        }
      }
    } else {
      // Check if cooldowns expired mid-minute
      if (now >= status.cooldownUntil) {
        if (status.state === 'RATE_LIMITED') {
          status.state = 'COOLING'; // Wait for minute window to reset
        } else if (status.state === 'DEGRADED') {
          status.state = 'READY';
        }
      }
    }

    return status;
  }

  canUseProvider(provider: ProviderName): boolean {
    const status = this.getStatus(provider);
    const config = this.registry.getConfig(provider);

    if (status.state !== 'READY') {
      return false;
    }

    if (status.requestsThisMinute >= config.rpm) {
      status.state = 'COOLING'; // Exceeded RPM budget
      return false;
    }

    status.state = 'PENDING';
    return true;
  }

  recordSuccess(provider: ProviderName): void {
    const status = this.getStatus(provider);
    status.requestsThisMinute++;
    status.totalRequestsToday++;
    status.state = 'READY';
  }

  recordRateLimit(provider: ProviderName, retryAfterSeconds?: number): void {
    const status = this.getStatus(provider);
    const config = this.registry.getConfig(provider);
    const now = Date.now();

    status.requestsThisMinute++;
    status.totalFailures++;
    status.state = 'RATE_LIMITED';
    
    const cooldownMs = retryAfterSeconds !== undefined ? retryAfterSeconds * 1000 : config.defaultCooldownMs;
    status.cooldownUntil = now + cooldownMs;
  }

  recordError(provider: ProviderName): void {
    const status = this.getStatus(provider);
    const now = Date.now();

    status.requestsThisMinute++;
    status.totalFailures++;
    status.state = 'DEGRADED';
    status.cooldownUntil = now + 15000; // 15 seconds hard error backoff
  }

  getStatuses(): Record<ProviderName, ProviderStatus> {
    const result = {} as Record<ProviderName, ProviderStatus>;
    const order = this.registry.getWaterfallOrder();
    for (const p of order) {
      result[p] = this.getStatus(p); // This also forces a refresh of the minute window if needed
    }
    return result;
  }
}
