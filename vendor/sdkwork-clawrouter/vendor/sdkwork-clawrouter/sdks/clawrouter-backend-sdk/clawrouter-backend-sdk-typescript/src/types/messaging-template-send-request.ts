/** Messaging template send request schema exposed by Claw Router. */
export interface MessagingTemplateSendRequest {
  /** Channel field on messaging template send request. */
  channel: string;
  /** Delivery purpose field on messaging template send request. */
  deliveryPurpose: string;
  /** Dry run field on messaging template send request. */
  dryRun?: boolean;
  /** Scene code field on messaging template send request. */
  sceneCode: string;
  /** Target hash field on messaging template send request. */
  targetHash: string;
  /** Target masked field on messaging template send request. */
  targetMasked: string;
  /** Template code field on messaging template send request. */
  templateCode: string;
}
