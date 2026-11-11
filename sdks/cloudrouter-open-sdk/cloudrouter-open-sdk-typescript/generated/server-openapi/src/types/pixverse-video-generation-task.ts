import type { PixverseErrorDetail } from './pixverse-error-detail';
import type { PixverseTaskResp } from './pixverse-task-resp';
import type { ProviderJsonValue } from './provider-json-value';

/** PixVerse video generation status and its outputs. */
export interface PixverseVideoGenerationTask {
  /** PixVerse business result code; a nonzero code indicates failure even with HTTP 200. */
  ErrCode?: number;
  /** PixVerse response message. */
  ErrMsg?: string;
  /** Supplemental error details when available. */
  Error?: PixverseErrorDetail;
  /** Task payload. */
  Resp?: PixverseTaskResp;
}
