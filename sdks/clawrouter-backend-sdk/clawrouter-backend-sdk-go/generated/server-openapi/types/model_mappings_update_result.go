package types

// Model mappings update result schema exposed by Claw Router.
type ModelMappingsUpdateResult struct {
	Code string `json:"code"`
	Data AdminModelMappingMutationResponse `json:"data"`
	Msg string `json:"msg"`
}
