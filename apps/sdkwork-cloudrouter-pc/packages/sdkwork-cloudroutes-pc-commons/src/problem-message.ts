import { isBlank, trim } from './sdkwork-utils.ts';

/**
 * Backend `ProblemDetail` shape as carried by SDK errors (`error.problem`),
 * including the sanitized interpolation `params` extension
 * (`I18N_SPEC.md` §9).
 */
export type SdkProblemDetailWithParams = {
  i18nKey?: string;
  code?: number | string;
  locale?: string;
  detail?: string;
  errors?: Array<{
    field?: string;
    i18nKey?: string;
    message?: string;
    params?: Record<string, string | number | boolean>;
  }>;
  params?: Record<string, string | number | boolean | string[]>;
  [key: string]: unknown;
};

/**
 * Minimal translation-function contract (`i18next.t`). Kept structural so this
 * package does not depend on an i18n runtime directly.
 */
export type ProblemMessageTranslate = (
  key: string,
  options?: { defaultValue?: string } & Record<string, unknown>,
) => string;

function readProblem(error: unknown): SdkProblemDetailWithParams | undefined {
  if (!error || typeof error !== 'object') {
    return undefined;
  }
  const candidate = (error as { problem?: unknown }).problem;
  if (!candidate || typeof candidate !== 'object') {
    return undefined;
  }
  return candidate as SdkProblemDetailWithParams;
}

function readErrorText(error: unknown): string {
  if (error instanceof Error) {
    return trim(error.message);
  }
  if (error && typeof error === 'object') {
    const candidate = (error as { message?: unknown }).message;
    if (typeof candidate === 'string') {
      return trim(candidate);
    }
  }
  return '';
}

function readParams(problem: SdkProblemDetailWithParams): Record<string, unknown> {
  if (!problem.params || typeof problem.params !== 'object') {
    return {};
  }
  return problem.params as Record<string, unknown>;
}

/**
 * Resolves the user-facing message for a backend problem
 * (`I18N_SPEC.md` §7): translate by `ProblemDetail.i18nKey` in the active
 * locale, fall back to the `errors.result.<code>` platform key, then to the
 * raw backend detail / error message as the safe display fallback.
 *
 * Interpolation `params` from the problem payload are passed to the key
 * template (`{{field}}`, `{{maxLength}}`, …).
 */
export function resolveProblemMessage(
  error: unknown,
  t: ProblemMessageTranslate,
  fallback: string,
): string {
  const problem = readProblem(error);
  const errorText = readErrorText(error);
  const problemDetail = problem?.detail ? trim(problem.detail) : '';
  const rawMessage = !isBlank(problemDetail) ? problemDetail : errorText;
  const safeFallback = !isBlank(rawMessage) ? rawMessage : fallback;

  if (problem) {
    const params = readParams(problem);
    if (problem.i18nKey && !isBlank(problem.i18nKey)) {
      return t(problem.i18nKey, { defaultValue: safeFallback, ...params });
    }
    if (typeof problem.code === 'number' && Number.isInteger(problem.code)) {
      const platformKey = `errors.result.${problem.code}`;
      return t(platformKey, { defaultValue: safeFallback });
    }
    if (typeof problem.code === 'string' && !isBlank(problem.code)) {
      const platformKey = `errors.result.${problem.code}`;
      return t(platformKey, { defaultValue: safeFallback });
    }
  }

  // Legacy convention: backend messages that are themselves i18n keys
  // (e.g. `console.gateway.states.*`) are translated when the catalog knows
  // them, otherwise the raw text is shown.
  if (rawMessage.includes('.') && /^[a-z][a-z0-9.-]*$/i.test(rawMessage)) {
    const translated = t(rawMessage, { defaultValue: safeFallback });
    if (translated !== rawMessage) {
      return translated;
    }
  }
  return safeFallback;
}

/**
 * Resolves a message when only an error object is available and the caller
 * supplies its own translation function — convenience for error boundaries
 * that already hold a `t` instance.
 */
export function getLoadErrorMessageI18n(
  error: unknown,
  fallback: string,
  t: ProblemMessageTranslate,
): string {
  return resolveProblemMessage(error, t, fallback);
}
