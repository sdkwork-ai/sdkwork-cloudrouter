/** Messaging template create request schema exposed by Claw Router. */
export interface MessagingTemplateCreateRequest {
  /** Body template field on messaging template create request. */
  bodyTemplate: string;
  /** Category field on messaging template create request. */
  category: string;
  /** Channel field on messaging template create request. */
  channel: string;
  /** Content format field on messaging template create request. */
  contentFormat?: string;
  /** Delivery purpose field on messaging template create request. */
  deliveryPurpose?: string;
  /** Locale field on messaging template create request. */
  locale?: string;
  /** Scene code field on messaging template create request. */
  sceneCode: string;
  /** Subject template field on messaging template create request. */
  subjectTemplate?: string;
  /** Template code field on messaging template create request. */
  templateCode: string;
  /** Template name field on messaging template create request. */
  templateName: string;
}
