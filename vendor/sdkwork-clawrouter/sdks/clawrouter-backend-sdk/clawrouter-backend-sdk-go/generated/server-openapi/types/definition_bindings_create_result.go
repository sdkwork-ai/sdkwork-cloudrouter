package types

// Definition bindings create result schema exposed by Claw Router.
type DefinitionBindingsCreateResult struct {
	Code string `json:"code"`
	Data AdminPromptBindingMutationResponse `json:"data"`
	Msg string `json:"msg"`
}
