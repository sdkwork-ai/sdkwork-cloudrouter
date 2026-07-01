export interface UpdateShopDepositAccountRequest {
  depositStatus?: string;
  currencyCode?: string;
  requiredAmount?: string;
  paidAmount?: string;
  frozenAmount?: string;
  accountRef?: string;
  dueAt?: string;
}
