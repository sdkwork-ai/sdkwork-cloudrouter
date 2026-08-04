package types

// Api keys create result schema exposed by Cloud Router.
type ApiKeysCreateResult struct {
	Code int `json:"code"`
	Data interface{} `json:"data"`
	TraceId string `json:"traceId"`
}
