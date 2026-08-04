package types

// Model rankings list result schema exposed by Cloud Router.
type ModelRankingsListResult struct {
	Code int `json:"code"`
	Data interface{} `json:"data"`
	TraceId string `json:"traceId"`
}
