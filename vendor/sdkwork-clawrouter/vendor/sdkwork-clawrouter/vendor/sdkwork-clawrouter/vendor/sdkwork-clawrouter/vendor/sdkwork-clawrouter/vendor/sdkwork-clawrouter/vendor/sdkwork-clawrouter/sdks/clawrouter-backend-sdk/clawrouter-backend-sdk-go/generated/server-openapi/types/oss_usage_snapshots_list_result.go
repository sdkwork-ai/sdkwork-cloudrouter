package types

// Oss usage snapshots list result schema exposed by Claw Router.
type OssUsageSnapshotsListResult struct {
	Code string `json:"code"`
	Data StorageUsageSnapshotListResponse `json:"data"`
	Msg string `json:"msg"`
}
