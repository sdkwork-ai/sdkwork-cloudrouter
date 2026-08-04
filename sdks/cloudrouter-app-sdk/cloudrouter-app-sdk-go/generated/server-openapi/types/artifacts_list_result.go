package types

// Artifacts list result schema exposed by Cloud Router.
type ArtifactsListResult struct {
	Code int `json:"code"`
	Data interface{} `json:"data"`
	TraceId string `json:"traceId"`
}
