package types

// Api keys list result schema exposed by Claw Router.
type ApiKeysListResult struct {
	Code int `json:"code"`
	Data interface{} `json:"data"`
	TraceId string `json:"traceId"`
}
