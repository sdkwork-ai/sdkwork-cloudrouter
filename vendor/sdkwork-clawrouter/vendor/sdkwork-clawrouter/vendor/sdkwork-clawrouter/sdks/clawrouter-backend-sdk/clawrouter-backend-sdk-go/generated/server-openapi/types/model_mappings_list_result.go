package types

// Model mappings list result schema exposed by Claw Router.
type ModelMappingsListResult struct {
	Code string `json:"code"`
	Data AdminModelMappingsResponse `json:"data"`
	Msg string `json:"msg"`
}
