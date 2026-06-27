package types

// Oss reconciliation runs list result schema exposed by Claw Router.
type OssReconciliationRunsListResult struct {
	Code string `json:"code"`
	Data StorageReconciliationRunListResponse `json:"data"`
	Msg string `json:"msg"`
}
