package types

// Model mappings resolve create result schema exposed by Claw Router.
type ModelMappingsResolveCreateResult struct {
	Code string `json:"code"`
	Data AdminModelMappingResolveResponse `json:"data"`
	Msg string `json:"msg"`
}
