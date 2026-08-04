/** Admin storage garbage collection job schema exposed by Claw Router. */
export interface AdminStorageGarbageCollectionJob {
  /** Candidate count field on admin storage garbage collection job. */
  candidateCount: string;
  /** Completed at field on admin storage garbage collection job. */
  completedAt: string;
  /** Created at field on admin storage garbage collection job. */
  createdAt: string;
  /** Dry run field on admin storage garbage collection job. */
  dryRun: boolean;
  /** Id field on admin storage garbage collection job. */
  id: string;
  /** Job id field on admin storage garbage collection job. */
  jobId: string;
  /** Job type field on admin storage garbage collection job. */
  jobType: string;
  /** Retention field on admin storage garbage collection job. */
  retention: string;
  /** Status field on admin storage garbage collection job. */
  status: string;
  /** Target field on admin storage garbage collection job. */
  target: string;
}
