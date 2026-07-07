package types

// Shops resume result schema exposed by Claw Router.
type ShopsResumeResult struct {
	Code int `json:"code"`
	Data interface{} `json:"data"`
	TraceId string `json:"traceId"`
}
