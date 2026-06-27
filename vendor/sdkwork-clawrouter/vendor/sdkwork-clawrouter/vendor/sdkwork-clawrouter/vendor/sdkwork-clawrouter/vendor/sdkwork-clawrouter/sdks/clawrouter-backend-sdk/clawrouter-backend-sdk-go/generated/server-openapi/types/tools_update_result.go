package types

// Tools update result schema exposed by Claw Router.
type ToolsUpdateResult struct {
	Code string `json:"code"`
	Data AdminMcpToolMutationResponse `json:"data"`
	Msg string `json:"msg"`
}
