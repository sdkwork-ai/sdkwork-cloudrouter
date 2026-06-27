package types

// Oss reconciliation runs create result schema exposed by Claw Router.
type OssReconciliationRunsCreateResult struct {
	Code string `json:"code"`
	Data StorageReconciliationRunMutationResponse `json:"data"`
	Msg string `json:"msg"`
}
