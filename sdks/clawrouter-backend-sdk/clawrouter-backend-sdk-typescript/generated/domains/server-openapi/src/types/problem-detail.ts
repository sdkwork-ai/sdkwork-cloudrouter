import type { FieldError } from './field-error';
import type { SdkWorkPlatformErrorCode } from './sdk-work-platform-error-code';

export interface ProblemDetail {
  code: SdkWorkPlatformErrorCode;
  detail?: string;
  errors?: FieldError[];
  /** Optional stable localization key such as errors.result.40001. */
  i18nKey?: string;
  instance?: string;
  /** Optional effective BCP 47 locale used by framework message mapping. */
  locale?: string;
  status: number;
  title: string;
  /** Server-owned request correlation id. */
  traceId: string;
  type: string;
}
