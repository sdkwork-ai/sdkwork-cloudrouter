/** Catalog spus update result schema exposed by Claw Router. */
export interface CatalogSpusUpdateResult {
  /** Business response code. */
  code: string;
  /** No business data returned by this operation. */
  data?: never;
  /** Human-readable response message. */
  msg?: string;
}
