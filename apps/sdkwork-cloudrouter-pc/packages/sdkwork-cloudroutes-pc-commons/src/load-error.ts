import { isBlank, trim } from './sdkwork-utils.ts';

export function getLoadErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && !isBlank(trim(error.message)) ? error.message : fallback;
}
