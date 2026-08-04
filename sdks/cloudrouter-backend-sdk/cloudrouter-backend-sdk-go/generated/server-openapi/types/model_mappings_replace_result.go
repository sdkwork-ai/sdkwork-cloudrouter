package types

// Model mappings replace result schema exposed by Cloud Router.
type ModelMappingsReplaceResult struct {
	Code int `json:"code"`
	Data interface{} `json:"data"`
	TraceId string `json:"traceId"`
}
