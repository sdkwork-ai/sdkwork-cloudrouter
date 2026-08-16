/** Dashboard modality distribution schema exposed by Cloud Router. */
export interface DashboardModalityDistribution {
  /** Modality field on dashboard modality distribution. */
  modality: 'text' | 'image' | 'video' | 'audio' | 'music' | 'unknown';
  /** Requests field on dashboard modality distribution. */
  requests: string;
}
