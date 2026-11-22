import type { AppRoutingModelGroupOption } from './app-routing-model-group-option';

/** App routing model groups schema exposed by Cloud Router. */
export interface AppRoutingModelGroups {
  /** Groups field on app routing model groups. */
  groups: AppRoutingModelGroupOption[];
  /** Model field on app routing model groups. */
  model: string;
}
