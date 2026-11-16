/**
 * App Store moderation read/decision models used by the App Center.
 *
 * The App Center owns no moderation storage: it reads the queue and records
 * decisions through the App Store backend contract. This module is the typed
 * seam between that contract and the admin UI so the page never depends on
 * untyped SDK payloads.
 */

/** Operator decision accepted by `appstore.moderation.decisions.create`. */
export type AppStoreModerationDecision = "APPROVE" | "REJECT" | "REQUEST_CHANGES";

/** One review task in the moderation queue. */
export interface AppStoreModerationQueueItem {
  reviewId: string;
  listingId?: string;
  listingName: string;
  submissionType: string;
  reviewStatus: string;
  assignedTo?: string;
  priority?: number;
  submittedAt?: string;
}

/** One cursor page of moderation tasks. */
export interface AppStoreModerationPage {
  items: readonly AppStoreModerationQueueItem[];
  nextCursor?: string;
  hasMore: boolean;
  /** Exact queued total when the backend reports it. */
  total?: number;
}

/** Server-side queue query. */
export interface AppStoreModerationQueueQuery {
  reviewStatus?: string;
  cursor?: string;
  pageSize?: number;
}

/** Operator decision payload; a reason is mandatory for non-approval. */
export interface AppStoreModerationDecisionInput {
  decisionType: AppStoreModerationDecision;
  reasonCode?: string;
  reasonDetail?: string;
}

export interface AppStoreModerationReview extends AppStoreModerationQueueItem {
  updatedAt?: string;
  /** Raw review payload for the detail inspector. */
  attributes: Readonly<Record<string, unknown>>;
}

/** One appeal against a moderation decision. */
export interface AppStoreModerationAppeal {
  appealId: string;
  reviewId?: string;
  listingId?: string;
  listingName?: string;
  appealStatus: string;
  appealReason: string;
  decision?: string;
  note?: string;
  submittedAt?: string;
  decidedAt?: string;
}

export interface AppStoreModerationAppealPage {
  items: readonly AppStoreModerationAppeal[];
  hasMore: boolean;
  nextCursor?: string;
  total?: number;
}

export interface AppStoreModerationAppealQuery {
  status?: string;
  cursor?: string;
  pageSize?: number;
}

export interface AppStoreModerationAppealDecisionInput {
  decision: "APPROVE" | "REJECT";
  note: string;
}

/** Page-facing moderation service boundary. */
export interface AppStoreModerationService {
  listQueue(query?: AppStoreModerationQueueQuery): Promise<AppStoreModerationPage>;
  decide(reviewId: string, input: AppStoreModerationDecisionInput): Promise<void>;
  /** Assign the review to an operator; optional so older hosts remain valid. */
  assign?(reviewId: string, assignedTo: string): Promise<void>;
  /** Load the review detail; optional so older hosts remain valid. */
  getReview?(reviewId: string): Promise<AppStoreModerationReview | undefined>;
  /** List appeals; optional so older hosts remain valid. */
  listAppeals?(query?: AppStoreModerationAppealQuery): Promise<AppStoreModerationAppealPage>;
  /** Decide an appeal; optional so older hosts remain valid. */
  decideAppeal?(appealId: string, input: AppStoreModerationAppealDecisionInput): Promise<void>;
}
