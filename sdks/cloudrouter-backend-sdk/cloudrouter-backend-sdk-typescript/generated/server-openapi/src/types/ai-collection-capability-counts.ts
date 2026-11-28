/** Number of enabled items per capability type; useful for the list badges without walking the item array. */
export interface AiCollectionCapabilityCounts {
  /** Agent field on ai collection capability counts. */
  agent: string;
  /** Mcp field on ai collection capability counts. */
  mcp: string;
  /** Plugin field on ai collection capability counts. */
  plugin: string;
  /** Skill field on ai collection capability counts. */
  skill: string;
}
