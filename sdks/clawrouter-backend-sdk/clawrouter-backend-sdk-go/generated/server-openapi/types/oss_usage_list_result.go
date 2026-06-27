package types

// Oss usage list result schema exposed by Claw Router.
type OssUsageListResult struct {
	Code string `json:"code"`
	Data StorageUsageCounterListResponse `json:"data"`
	Msg string `json:"msg"`
}
