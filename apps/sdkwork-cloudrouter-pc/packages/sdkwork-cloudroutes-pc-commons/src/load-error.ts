import { isBlank, trim } from './sdkwork-utils.ts';
import {
  resolveProblemMessage,
  type ProblemMessageTranslate,
} from './problem-message.ts';

/**
 * Returns a user-facing message for a load error.
 *
 * When a translation function is supplied, backend problem messages resolve
 * through `resolveProblemMessage` (`I18N_SPEC.md` §7): `i18nKey` first,
 * then `errors.result.<code>`, then the raw backend detail.
 */
export function getLoadErrorMessage(
  error: unknown,
  fallback: string,
  t?: ProblemMessageTranslate,
): string {
  if (t) {
    return resolveProblemMessage(error, t, fallback);
  }
  return error instanceof Error && !isBlank(trim(error.message)) ? error.message : fallback;
}
