/** Messaging route simulation request schema exposed by Claw Router. */
export interface MessagingRouteSimulationRequest {
  /** Channel field on messaging route simulation request. */
  channel: string;
  /** Delivery purpose field on messaging route simulation request. */
  deliveryPurpose?: string;
  /** Scene code field on messaging route simulation request. */
  sceneCode: string;
}
