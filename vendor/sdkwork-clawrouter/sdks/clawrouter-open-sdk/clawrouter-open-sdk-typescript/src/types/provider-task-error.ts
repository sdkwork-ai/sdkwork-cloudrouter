import type { ProviderJsonValue } from './provider-json-value';

/** Reusable provider provider task error schema shared by Claw Router vendor modules. */
export interface ProviderTaskError {
  /** Provider error code. */
  code?: string;
  /** Provider error message. */
  message?: string;
  /** Provider error type. */
  type?: string;
}
