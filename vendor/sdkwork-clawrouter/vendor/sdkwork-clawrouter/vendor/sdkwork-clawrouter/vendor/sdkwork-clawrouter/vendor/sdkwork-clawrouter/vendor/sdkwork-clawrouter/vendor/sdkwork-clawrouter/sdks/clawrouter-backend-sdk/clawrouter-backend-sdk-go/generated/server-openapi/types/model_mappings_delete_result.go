package types

// Model mappings delete result schema exposed by Claw Router.
type ModelMappingsDeleteResult struct {
	Code string `json:"code"`
	Data AdminModelMappingDeleteResponse `json:"data"`
	Msg string `json:"msg"`
}
