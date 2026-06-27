package types

// Servers bindings list result schema exposed by Claw Router.
type ServersBindingsListResult struct {
	Code string `json:"code"`
	Data AdminMcpBindingListResponse `json:"data"`
	Msg string `json:"msg"`
}
