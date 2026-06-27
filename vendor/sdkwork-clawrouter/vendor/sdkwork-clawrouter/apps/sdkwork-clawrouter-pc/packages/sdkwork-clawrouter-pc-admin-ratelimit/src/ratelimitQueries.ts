import { useQuery } from '@tanstack/react-query';

import { RateLimitService } from './ratelimitService';

export const rateLimitQueryKeys = {
  all: ['admin', 'ratelimit'] as const,
  ipLimits: () => [...rateLimitQueryKeys.all, 'ip-limits'] as const,
  tokenLimits: () => [...rateLimitQueryKeys.all, 'token-limits'] as const,
  modelLimits: () => [...rateLimitQueryKeys.all, 'model-limits'] as const,
  firewalls: () => [...rateLimitQueryKeys.all, 'firewalls'] as const,
  dashboard: () => [...rateLimitQueryKeys.all, 'dashboard'] as const,
};

export function useRateLimitDashboardQuery() {
  return useQuery({
    queryKey: rateLimitQueryKeys.dashboard(),
    queryFn: async () => {
      const [ipLimits, tokenLimits, modelLimits, firewallRules] = await Promise.all([
        RateLimitService.fetchIpLimits(),
        RateLimitService.fetchTokenLimits(),
        RateLimitService.fetchModelLimits(),
        RateLimitService.fetchFirewalls(),
      ]);
      return { ipLimits, tokenLimits, modelLimits, firewallRules };
    },
  });
}

export function useIpRateLimitsQuery() {
  return useQuery({
    queryKey: rateLimitQueryKeys.ipLimits(),
    queryFn: () => RateLimitService.fetchIpLimits(),
  });
}

export function useTokenRateLimitsQuery() {
  return useQuery({
    queryKey: rateLimitQueryKeys.tokenLimits(),
    queryFn: () => RateLimitService.fetchTokenLimits(),
  });
}

export function useModelRateLimitsQuery() {
  return useQuery({
    queryKey: rateLimitQueryKeys.modelLimits(),
    queryFn: () => RateLimitService.fetchModelLimits(),
  });
}

export function useFirewallRulesQuery() {
  return useQuery({
    queryKey: rateLimitQueryKeys.firewalls(),
    queryFn: () => RateLimitService.fetchFirewalls(),
  });
}
