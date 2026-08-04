package types

// Artifacts create result schema exposed by Cloud Router.
type ArtifactsCreateResult struct {
	Code int `json:"code"`
	Data interface{} `json:"data"`
	TraceId string `json:"traceId"`
}
