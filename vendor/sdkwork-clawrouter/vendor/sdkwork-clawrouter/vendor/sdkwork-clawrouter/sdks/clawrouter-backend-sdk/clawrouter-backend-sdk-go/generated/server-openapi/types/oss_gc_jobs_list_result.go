package types

// Oss gc jobs list result schema exposed by Claw Router.
type OssGcJobsListResult struct {
	Code string `json:"code"`
	Data StorageGarbageCollectionJobListResponse `json:"data"`
	Msg string `json:"msg"`
}
