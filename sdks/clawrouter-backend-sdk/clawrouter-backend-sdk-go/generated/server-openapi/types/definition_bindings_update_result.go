package types

// Definition bindings update result schema exposed by Claw Router.
type DefinitionBindingsUpdateResult struct {
	Code string `json:"code"`
	Data AdminPromptBindingMutationResponse `json:"data"`
	Msg string `json:"msg"`
}
