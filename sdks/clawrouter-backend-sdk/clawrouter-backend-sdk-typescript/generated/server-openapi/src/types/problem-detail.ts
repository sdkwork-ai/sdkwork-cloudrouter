import type { FieldError } from './field-error';

export interface ProblemDetail {
  code?: string;
  detail?: string;
  errors?: FieldError[];
  instance?: string;
  /** Server-owned request correlation id. */
  requestId?: string;
  status: number;
  title: string;
  traceId?: string;
  type: string;
}
