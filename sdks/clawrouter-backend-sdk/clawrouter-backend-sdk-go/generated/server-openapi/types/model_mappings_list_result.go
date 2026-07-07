package types

// Model mappings list result schema exposed by Claw Router.
type ModelMappingsListResult struct {
	Code int `json:"code"`
	Data interface{} `json:"data"`
	TraceId string `json:"traceId"`
}
