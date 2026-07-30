/** Media ai provenance schema exposed by Claw Router. */
export interface MediaAiProvenance {
  /** Generation task id field on media ai provenance. */
  generationTaskId?: string;
  /** Model field on media ai provenance. */
  model?: string;
  /** Moderation status field on media ai provenance. */
  moderationStatus?: 'unknown' | 'pending' | 'approved' | 'rejected' | 'blocked';
  /** Prompt id field on media ai provenance. */
  promptId?: string;
  /** Provenance field on media ai provenance. */
  provenance?: 'uploaded' | 'generated' | 'edited' | 'imported';
  /** Provider field on media ai provenance. */
  provider?: string;
  /** Safety labels field on media ai provenance. */
  safetyLabels?: string[];
  /** Seed field on media ai provenance. */
  seed?: string;
  /** Source media ids field on media ai provenance. */
  sourceMediaIds?: string[];
}
