import type { LumaGenerationAssets } from './luma-generation-assets';
import type { ProviderJsonValue } from './provider-json-value';

/** Luma Dream Machine generation record and its assets. */
export interface LumaVideoGenerationTask {
  /** Generated assets. */
  assets?: LumaGenerationAssets;
  /** Generation creation timestamp. */
  created_at?: string;
  /** Failure reason when the generation did not complete. */
  failure_reason?: string;
  /** Generation type. */
  generation_type?: 'video' | 'image';
  /** Luma generation identifier. */
  id?: string;
  /** Model used for the generation. */
  model?: string;
  /** Request parameters echoed back by Luma. */
  request?: Record<string, ProviderJsonValue>;
  /** Generation state. */
  state?: 'queued' | 'dreaming' | 'completed' | 'failed';
}
