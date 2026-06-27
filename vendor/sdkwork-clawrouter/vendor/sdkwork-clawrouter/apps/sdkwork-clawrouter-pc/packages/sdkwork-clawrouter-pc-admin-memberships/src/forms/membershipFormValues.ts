export type MembershipFormValidationRule =
  | 'moneyAmount'
  | 'nonNegativeInteger'
  | 'positiveInteger'
  | 'required';

export class MembershipFormValidationError extends Error {
  readonly fieldLabel: string;
  readonly rule: MembershipFormValidationRule;

  constructor(fieldLabel: string, rule: MembershipFormValidationRule) {
    super(defaultMembershipFormValidationMessage(rule, fieldLabel));
    this.name = 'MembershipFormValidationError';
    this.fieldLabel = fieldLabel;
    this.rule = rule;
  }
}

type MembershipFormTranslate = (
  key: string,
  fallback: string,
  options?: Record<string, unknown>,
) => string;

const INTEGER_PATTERN = /^\d+$/;
const MONEY_AMOUNT_PATTERN = /^\d+(?:\.\d{1,2})?$/;

export function parseRequiredPositiveIntegerField(value: string, fieldLabel: string): number {
  const normalized = requireMembershipFormText(value, fieldLabel);
  const parsed = parseIntegerText(normalized);
  if (parsed === null || parsed <= 0) {
    throw new MembershipFormValidationError(fieldLabel, 'positiveInteger');
  }
  return parsed;
}

export function parseRequiredNonNegativeIntegerField(value: string, fieldLabel: string): number {
  const normalized = requireMembershipFormText(value, fieldLabel);
  return parseNonNegativeIntegerText(normalized, fieldLabel);
}

export function parseOptionalNonNegativeIntegerField(value: string, fieldLabel: string): number | undefined {
  const normalized = value.trim();
  if (!normalized) {
    return undefined;
  }
  return parseNonNegativeIntegerText(normalized, fieldLabel);
}

export function parseRequiredMoneyAmountField(value: string, fieldLabel: string): string {
  const normalized = requireMembershipFormText(value, fieldLabel);
  if (!MONEY_AMOUNT_PATTERN.test(normalized)) {
    throw new MembershipFormValidationError(fieldLabel, 'moneyAmount');
  }
  return normalized;
}

export function formatMembershipFormValidationError(
  error: unknown,
  t: MembershipFormTranslate,
  fallback: string,
): string {
  if (error instanceof MembershipFormValidationError) {
    return t(
      `admin.commerce.memberships.formValidation.${error.rule}`,
      defaultMembershipFormValidationMessage(error.rule, error.fieldLabel),
      { field: error.fieldLabel },
    );
  }
  return error instanceof Error ? error.message : fallback;
}

function requireMembershipFormText(value: string, fieldLabel: string): string {
  const normalized = value.trim();
  if (!normalized) {
    throw new MembershipFormValidationError(fieldLabel, 'required');
  }
  return normalized;
}

function parseNonNegativeIntegerText(value: string, fieldLabel: string): number {
  const parsed = parseIntegerText(value);
  if (parsed === null || parsed < 0) {
    throw new MembershipFormValidationError(fieldLabel, 'nonNegativeInteger');
  }
  return parsed;
}

function parseIntegerText(value: string): number | null {
  if (!INTEGER_PATTERN.test(value)) {
    return null;
  }
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) ? parsed : null;
}

function defaultMembershipFormValidationMessage(
  rule: MembershipFormValidationRule,
  fieldLabel: string,
): string {
  if (rule === 'required') {
    return `${fieldLabel} is required`;
  }
  if (rule === 'positiveInteger') {
    return `${fieldLabel} must be a positive integer`;
  }
  if (rule === 'nonNegativeInteger') {
    return `${fieldLabel} must be a non-negative integer`;
  }
  return `${fieldLabel} must be a valid amount`;
}
