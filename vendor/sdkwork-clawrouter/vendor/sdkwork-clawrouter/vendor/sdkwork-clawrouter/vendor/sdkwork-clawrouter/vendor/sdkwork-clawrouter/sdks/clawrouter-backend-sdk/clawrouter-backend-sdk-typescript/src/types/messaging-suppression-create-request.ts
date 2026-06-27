/** Messaging suppression create request schema exposed by Claw Router. */
export interface MessagingSuppressionCreateRequest {
  /** Channel field on messaging suppression create request. */
  channel: string;
  /** Reason code field on messaging suppression create request. */
  reasonCode: string;
  /** Starts at field on messaging suppression create request. */
  startsAt: string;
  /** Target hash field on messaging suppression create request. */
  targetHash: string;
  /** Target masked field on messaging suppression create request. */
  targetMasked: string;
}
