package types

// Model mappings delete result schema exposed by Claw Router.
type ModelMappingsDeleteResult struct {
	Code int `json:"code"`
	Data interface{} `json:"data"`
	TraceId string `json:"traceId"`
}
