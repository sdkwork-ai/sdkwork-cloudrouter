export interface RefundRequestCreateCommand {
  amount: string | number;
  currencyCode: string;
  originalOrderId: string;
  reasonCode?: string;
  reasonDetail?: string;
  targetAsset: 'points' | 'token_bank' | 'cash';
}
