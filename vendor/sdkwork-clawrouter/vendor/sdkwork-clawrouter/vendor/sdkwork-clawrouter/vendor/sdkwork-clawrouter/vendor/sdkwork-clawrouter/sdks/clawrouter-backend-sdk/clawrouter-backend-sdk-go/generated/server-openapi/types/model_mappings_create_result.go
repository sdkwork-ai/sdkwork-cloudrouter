package types

// Model mappings create result schema exposed by Claw Router.
type ModelMappingsCreateResult struct {
	Code string `json:"code"`
	Data AdminModelMappingMutationResponse `json:"data"`
	Msg string `json:"msg"`
}
