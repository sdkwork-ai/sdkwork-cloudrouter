/** Delete result schema exposed by Claw Router. */
export interface DeleteResult {
  /** Whether the resource was deleted. */
  deleted: boolean;
  /** Identifier of the deleted resource. */
  id: string;
  /** Deleted resource object type. */
  object: string;
}
