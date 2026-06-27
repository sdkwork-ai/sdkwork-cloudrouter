/** Messaging test send request schema exposed by Claw Router. */
export interface MessagingTestSendRequest {
  /** Channel field on messaging test send request. */
  channel: string;
  /** Dry run field on messaging test send request. */
  dryRun?: boolean;
  /** Scene code field on messaging test send request. */
  sceneCode: string;
  /** Target hash field on messaging test send request. */
  targetHash: string;
  /** Target masked field on messaging test send request. */
  targetMasked: string;
}
