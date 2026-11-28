import type { JsonValue } from './json-value';

/** Ai collection item schema exposed by Cloud Router. */
export interface AiCollectionItem {
  /** Capability icon ref field on ai collection item. */
  capabilityIconRef: string;
  /** Capability key field on ai collection item. */
  capabilityKey: string;
  /** Capability name field on ai collection item. */
  capabilityName: string;
  /** Capability type field on ai collection item. */
  capabilityType: 'skill' | 'mcp' | 'agent' | 'plugin';
  /** Capability version field on ai collection item. */
  capabilityVersion: string;
  /** Collection id field on ai collection item. */
  collectionId: string;
  /** Config field on ai collection item. */
  config: Record<string, JsonValue>;
  /** Created at field on ai collection item. */
  createdAt: string;
  /** Enabled field on ai collection item. */
  enabled: boolean;
  /** Id field on ai collection item. */
  id: string;
  /** Sort order field on ai collection item. */
  sortOrder: number;
  /** Updated at field on ai collection item. */
  updatedAt: string;
}
