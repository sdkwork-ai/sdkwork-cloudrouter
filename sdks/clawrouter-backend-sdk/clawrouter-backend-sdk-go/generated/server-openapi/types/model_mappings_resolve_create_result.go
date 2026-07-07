package types

// Model mappings resolve create result schema exposed by Claw Router.
type ModelMappingsResolveCreateResult struct {
	Code int `json:"code"`
	Data interface{} `json:"data"`
	TraceId string `json:"traceId"`
}
