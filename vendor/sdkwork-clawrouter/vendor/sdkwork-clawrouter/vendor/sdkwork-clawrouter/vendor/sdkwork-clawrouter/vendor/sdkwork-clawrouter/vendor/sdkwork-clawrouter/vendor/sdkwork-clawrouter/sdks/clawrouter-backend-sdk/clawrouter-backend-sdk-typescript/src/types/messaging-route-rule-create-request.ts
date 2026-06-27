/** Messaging route rule create request schema exposed by Claw Router. */
export interface MessagingRouteRuleCreateRequest {
  /** Channel field on messaging route rule create request. */
  channel: string;
  /** Delivery purpose field on messaging route rule create request. */
  deliveryPurpose?: string;
  /** Priority field on messaging route rule create request. */
  priority?: string;
  /** Rule code field on messaging route rule create request. */
  ruleCode: string;
  /** Scene code field on messaging route rule create request. */
  sceneCode: string;
  /** Targets field on messaging route rule create request. */
  targets: Record<string, unknown>[];
}
