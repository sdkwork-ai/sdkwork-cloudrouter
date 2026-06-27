package types

// Storage garbage collection job mutation response schema exposed by Claw Router.
type StorageGarbageCollectionJobMutationResponse struct {
	Job StorageGarbageCollectionJob `json:"job"`
	RequestId string `json:"requestId"`
}
