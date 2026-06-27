package types

// Storage garbage collection job list response schema exposed by Claw Router.
type StorageGarbageCollectionJobListResponse struct {
	Items []StorageGarbageCollectionJob `json:"items"`
	NextCursor string `json:"nextCursor"`
	RequestId string `json:"requestId"`
}
