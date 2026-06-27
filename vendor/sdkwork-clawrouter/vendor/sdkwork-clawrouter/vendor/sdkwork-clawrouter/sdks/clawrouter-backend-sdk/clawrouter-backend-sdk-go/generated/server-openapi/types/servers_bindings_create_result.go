package types

// Servers bindings create result schema exposed by Claw Router.
type ServersBindingsCreateResult struct {
	Code string `json:"code"`
	Data AdminMcpBindingMutationResponse `json:"data"`
	Msg string `json:"msg"`
}
