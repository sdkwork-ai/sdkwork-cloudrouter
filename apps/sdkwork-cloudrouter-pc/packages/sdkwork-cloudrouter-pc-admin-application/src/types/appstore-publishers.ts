/**
 * App Store publisher (developer) administration models.
 *
 * Publishers own listings and complete identity/business verification. The App
 * Center reads the operator catalog and records verification decisions through
 * the App Store backend contract.
 */

export type AppStorePublisherVerificationType = "IDENTITY" | "BUSINESS" | "TAX" | "PAYOUT";

export type AppStorePublisherVerificationDecision = "APPROVE" | "REJECT" | "REQUEST_MORE_INFO";

/** One publisher row shown to operators. */
export interface AppStorePublisher {
  publisherId: string;
  displayName: string;
  publisherType?: string;
  status?: string;
  verificationStatus?: string;
  supportEmail?: string;
  websiteUrl?: string;
  createdAt?: string;
}

/** One cursor page of publishers. */
export interface AppStorePublisherPage {
  items: readonly AppStorePublisher[];
  nextCursor?: string;
  hasMore: boolean;
  /** Exact publisher total when the backend reports it. */
  total?: number;
}

export interface AppStorePublisherQuery {
  cursor?: string;
  pageSize?: number;
}

export interface AppStorePublisherVerifyInput {
  verificationType: AppStorePublisherVerificationType;
  decision: AppStorePublisherVerificationDecision;
}

/** Page-facing publisher service boundary. */
export interface AppStorePublisherService {
  list(query?: AppStorePublisherQuery): Promise<AppStorePublisherPage>;
  verify(publisherId: string, input: AppStorePublisherVerifyInput): Promise<void>;
}
