// Money input handling for community admin forms. Amounts arrive as
// user-typed decimal strings and are validated by pattern (at most two
// fraction digits, no exponent notation) before a single Number() parse.
// The previous `Math.round(value * 100) / 100` clamping performed
// authoritative arithmetic in binary floating point and produced rounding
// artifacts (e.g. 1.005 -> 1); the wire contract is owned by the federated
// community backend, so this module only guarantees clean decimal input.
const DECIMAL_MONEY_PATTERN = /^(?:0|[1-9][0-9]*)(?:\.[0-9]{1,2})?$/;

export function parseDecimalMoney(value: string): number | undefined {
  const trimmed = value.trim();
  if (trimmed === '') {
    return undefined;
  }
  if (!DECIMAL_MONEY_PATTERN.test(trimmed)) {
    return undefined;
  }
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
}
