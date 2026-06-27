package types

// Definition bindings list result schema exposed by Claw Router.
type DefinitionBindingsListResult struct {
	Code string `json:"code"`
	Data AdminPromptBindingListResponse `json:"data"`
	Msg string `json:"msg"`
}
