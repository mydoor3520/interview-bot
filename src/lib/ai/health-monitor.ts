/**
 * Passive health monitoring for AI providers
 * No active polling - only tracks success/failure of actual requests
 */

export type ProviderType = 'proxy' | 'api';
export type HealthStatus = 'healthy' | 'degraded' | 'down';

export interface ProviderHealth {
  provider: ProviderType;
  status: HealthStatus;
  lastCheck: number; // Date.now()
  consecutiveFailures: number;
  lastError?: string;
  avgLatencyMs: number; // rolling avg of last 10 requests
}

class HealthMonitor {
  private static instance: HealthMonitor;
  private health: Map<ProviderType, ProviderHealth>;
  private latencyWindows: Map<ProviderType, number[]>;

  private constructor() {
    this.health = new Map();
    this.latencyWindows = new Map();
  }

  static getInstance(): HealthMonitor {
    if (!HealthMonitor.instance) {
      HealthMonitor.instance = new HealthMonitor();
    }
    return HealthMonitor.instance;
  }

  private getDefaultHealth(provider: ProviderType): ProviderHealth {
    return {
      provider,
      status: 'healthy',
      lastCheck: Date.now(),
      consecutiveFailures: 0,
      avgLatencyMs: 0,
    };
  }

  private updateLatency(provider: ProviderType, latencyMs: number): number {
    let window = this.latencyWindows.get(provider);
    if (!window) {
      window = [];
      this.latencyWindows.set(provider, window);
    }

    window.push(latencyMs);
    if (window.length > 10) {
      window.shift(); // Keep only last 10
    }

    return window.reduce((sum, val) => sum + val, 0) / window.length;
  }

  recordSuccess(provider: ProviderType, latencyMs: number): void {
    const avgLatencyMs = this.updateLatency(provider, latencyMs);

    this.health.set(provider, {
      provider,
      status: 'healthy',
      lastCheck: Date.now(),
      consecutiveFailures: 0,
      avgLatencyMs,
    });
  }

  recordFailure(provider: ProviderType, error: string): void {
    const current = this.health.get(provider) || this.getDefaultHealth(provider);
    const consecutiveFailures = current.consecutiveFailures + 1;

    let status: HealthStatus;
    if (consecutiveFailures >= 3) {
      status = 'down';
    } else if (consecutiveFailures >= 1) {
      status = 'degraded';
    } else {
      status = 'healthy';
    }

    this.health.set(provider, {
      provider,
      status,
      lastCheck: Date.now(),
      consecutiveFailures,
      lastError: error,
      avgLatencyMs: current.avgLatencyMs, // Preserve last known latency
    });
  }

  getHealth(provider: ProviderType): ProviderHealth {
    return this.health.get(provider) || this.getDefaultHealth(provider);
  }

  shouldTryProvider(provider: ProviderType): boolean {
    const health = this.getHealth(provider);

    if (health.status === 'healthy' || health.status === 'degraded') {
      return true;
    }

    // Provider is down - allow retry after 30 seconds (passive recovery)
    if (health.status === 'down') {
      const timeSinceLastCheck = Date.now() - health.lastCheck;
      return timeSinceLastCheck >= 30000;
    }

    return false;
  }

  getAllHealth(): Record<ProviderType, ProviderHealth> {
    return {
      proxy: this.getHealth('proxy'),
      api: this.getHealth('api'),
    };
  }
}

export const healthMonitor = HealthMonitor.getInstance();
