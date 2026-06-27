package types

// Servers bindings update result schema exposed by Claw Router.
type ServersBindingsUpdateResult struct {
	Code string `json:"code"`
	Data AdminMcpBindingMutationResponse `json:"data"`
	Msg string `json:"msg"`
}
