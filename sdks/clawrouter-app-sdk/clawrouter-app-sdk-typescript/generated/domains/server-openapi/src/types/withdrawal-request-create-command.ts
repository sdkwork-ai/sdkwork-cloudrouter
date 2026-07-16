export interface WithdrawalRequestCreateCommand {
  amount: string | number;
  asset?: 'cash';
  currencyCode: string;
  payoutAccountRef?: string;
  payoutMethod?: string;
  reasonCode?: string;
}
