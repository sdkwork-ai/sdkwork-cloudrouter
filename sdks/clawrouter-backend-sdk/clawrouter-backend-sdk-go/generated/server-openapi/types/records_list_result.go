package types

// Records list result schema exposed by Claw Router.
type RecordsListResult struct {
	Code int `json:"code"`
	Data interface{} `json:"data"`
	TraceId string `json:"traceId"`
}
