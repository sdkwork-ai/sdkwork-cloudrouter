package types

// Oss gc jobs create result schema exposed by Claw Router.
type OssGcJobsCreateResult struct {
	Code string `json:"code"`
	Data StorageGarbageCollectionJobMutationResponse `json:"data"`
	Msg string `json:"msg"`
}
