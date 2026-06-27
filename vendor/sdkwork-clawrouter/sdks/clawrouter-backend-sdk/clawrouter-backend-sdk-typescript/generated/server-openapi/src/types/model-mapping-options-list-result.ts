import type { AdminModelMappingOptionsCatalogResponse } from './admin-model-mapping-options-catalog-response';

/** Model mapping options list result schema exposed by Claw Router. */
export interface ModelMappingOptionsListResult {
  /** Business response code. */
  code: string;
  /** Data field on model mapping options list result. */
  data?: AdminModelMappingOptionsCatalogResponse;
  /** Human-readable response message. */
  msg?: string;
}
