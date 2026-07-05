import { useQuery } from '@tanstack/react-query';

import {
  RATE_LIMIT_DASHBOARD_SAMPLE_PAGE_SIZE,
  RateLimitService,
  type RateLimitListFilters,
} from './ratelimitService';

export const rateLimitQueryKeys = {
  all: ['admin', 'ratelimit'] as const,
  ipLimits: (filters: RateLimitListFilters = {}) => [...rateLimitQueryKeys.all, 'ip-limits', filters] as const,
  tokenLimits: (filters: RateLimitListFilters = {}) => [...rateLimitQueryKeys.all, 'token-limits', filters] as const,
  modelLimits: (filters: RateLimitListFilters = {}) => [...rateLimitQueryKeys.all, 'model-limits', filters] as const,
  firewalls: (filters: RateLimitListFilters = {}) => [...rateLimitQueryKeys.all, 'firewalls', filters] as const,
  dashboard: () => [...rateLimitQueryKeys.all, 'dashboard'] as const,
};

const dashboardSampleFilters: RateLimitListFilters = {
  page: 1,
  pageSize: RATE_LIMIT_DASHBOARD_SAMPLE_PAGE_SIZE,
};

export function useRateLimitDashboardQuery() {
  return useQuery({
    queryKey: rateLimitQueryKeys.dashboard(),
    queryFn: async () => {
      const [ipLimits, tokenLimits, modelLimits, firewallRules] = await Promise.all([
        RateLimitService.fetchIpLimits(dashboardSampleFilters),
        RateLimitService.fetchTokenLimits(dashboardSampleFilters),
        RateLimitService.fetchModelLimits(dashboardSampleFilters),
        RateLimitService.fetchFirewalls(dashboardSampleFilters),
      ]);
      return {
        ipLimits: ipLimits.items,
        ipLimitsTotal: ipLimits.total,
        tokenLimits: tokenLimits.items,
        tokenLimitsTotal: tokenLimits.total,
        modelLimits: modelLimits.items,
        modelLimitsTotal: modelLimits.total,
        firewallRules: firewallRules.items,
        firewallRulesTotal: firewallRules.total,
      };
    },
  });
}

export function useIpRateLimitsQuery(filters: RateLimitListFilters = {}) {
  return useQuery({
    queryKey: rateLimitQueryKeys.ipLimits(filters),
    queryFn: () => RateLimitService.fetchIpLimits(filters),
  });
}

export function useTokenRateLimitsQuery(filters: RateLimitListFilters = {}) {
  return useQuery({
    queryKey: rateLimitQueryKeys.tokenLimits(filters),
    queryFn: () => RateLimitService.fetchTokenLimits(filters),
  });
}

export function useModelRateLimitsQuery(filters: RateLimitListFilters = {}) {
  return useQuery({
    queryKey: rateLimitQueryKeys.modelLimits(filters),
    queryFn: () => RateLimitService.fetchModelLimits(filters),
  });
}

export function useFirewallRulesQuery(filters: RateLimitListFilters = {}) {
  return useQuery({
    queryKey: rateLimitQueryKeys.firewalls(filters),
    queryFn: () => RateLimitService.fetchFirewalls(filters),
  });
}
