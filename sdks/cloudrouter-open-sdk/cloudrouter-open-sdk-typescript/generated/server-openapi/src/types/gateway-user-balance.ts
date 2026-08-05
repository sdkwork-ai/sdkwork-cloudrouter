/** Token Bank balance snapshot for the authenticated relay API key owner. Amounts follow the account platform wallet convention (minor-unit integer strings). */
export interface GatewayUserBalance {
  /** Object type discriminator; always 'balance'. */
  object: string;
  /** Available balance (stored minor-unit string). */
  balance: string;
  /** Frozen (held) balance (stored minor-unit string). */
  frozen: string;
  /** Asset unit label; TOKEN_BANK for the token bank wallet. */
  unit: string;
}
