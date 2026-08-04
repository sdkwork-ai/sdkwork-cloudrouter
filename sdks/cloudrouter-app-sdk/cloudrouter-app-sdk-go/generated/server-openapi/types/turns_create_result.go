package types

// Turns create result schema exposed by Cloud Router.
type TurnsCreateResult struct {
	Code int `json:"code"`
	Data interface{} `json:"data"`
	TraceId string `json:"traceId"`
}
