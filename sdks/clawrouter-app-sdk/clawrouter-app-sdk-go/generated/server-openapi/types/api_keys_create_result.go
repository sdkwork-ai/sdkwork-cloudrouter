package types

// Api keys create result schema exposed by Claw Router.
type ApiKeysCreateResult struct {
	Code int `json:"code"`
	Data interface{} `json:"data"`
	TraceId string `json:"traceId"`
}
