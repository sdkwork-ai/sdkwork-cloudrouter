import type { WalletHoldsReleasesCreateResult } from './wallet-holds-releases-create-result';

export interface WalletHoldsReleasesCreateResponse {
  code: 0;
  data: unknown & Record<string, unknown>;
  /** Server-owned request correlation id. */
  traceId: string;
}
