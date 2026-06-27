import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

export const portalQueryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
      refetchOnWindowFocus: false,
    },
  },
});

export function PortalQueryProvider({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={portalQueryClient}>{children}</QueryClientProvider>;
}
