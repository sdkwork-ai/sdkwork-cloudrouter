import type { JsonValue } from './json-value';

/** Ai collection item input schema exposed by Cloud Router. */
export interface AiCollectionItemInput {
  /** Capability icon ref field on ai collection item input. */
  capabilityIconRef?: string | null;
  /** Capability key field on ai collection item input. */
  capabilityKey: string;
  /** Capability name field on ai collection item input. */
  capabilityName?: string | null;
  /** Capability type field on ai collection item input. */
  capabilityType: 'skill' | 'mcp' | 'agent' | 'plugin';
  /** Capability version field on ai collection item input. */
  capabilityVersion?: string | null;
  /** Config field on ai collection item input. */
  config?: Record<string, JsonValue> | null;
  /** Enabled field on ai collection item input. */
  enabled?: boolean | null;
  /** Sort order field on ai collection item input. */
  sortOrder?: number | null;
}
