package types

// Model rankings status retrieve result schema exposed by Cloud Router.
type ModelRankingsStatusRetrieveResult struct {
	Code int `json:"code"`
	Data interface{} `json:"data"`
	TraceId string `json:"traceId"`
}
