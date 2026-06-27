package types

// Oss usage ledger list result schema exposed by Claw Router.
type OssUsageLedgerListResult struct {
	Code string `json:"code"`
	Data StorageUsageLedgerListResponse `json:"data"`
	Msg string `json:"msg"`
}
