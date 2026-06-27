import { isBlank, trim } from '@sdkwork/utils';

export type MarketplaceServerLike = {
  server_key: string;
  name: string;
  description?: string | null;
  category_code?: string | null;
  tags?: string[];
  transport: string;
  visibility: string;
};

export type MarketplaceFilterState = {
  query: string;
  categoryCode: string | null;
  transport: string | null;
};

export function filterMarketplaceServers<T extends MarketplaceServerLike>(
  servers: T[],
  filters: MarketplaceFilterState,
): T[] {
  const query = trim(filters.query).toLowerCase();
  return servers.filter((server) => {
    if (filters.categoryCode && server.category_code !== filters.categoryCode) {
      return false;
    }
    if (filters.transport && server.transport !== filters.transport) {
      return false;
    }
    if (isBlank(query)) {
      return true;
    }
    const haystack = [
      server.name,
      server.server_key,
      server.description ?? '',
      server.category_code ?? '',
      ...(server.tags ?? []),
    ]
      .join(' ')
      .toLowerCase();
    return haystack.includes(query);
  });
}

export function uniqueTransports(servers: MarketplaceServerLike[]): string[] {
  return [...new Set(servers.map((server) => server.transport))].sort();
}
