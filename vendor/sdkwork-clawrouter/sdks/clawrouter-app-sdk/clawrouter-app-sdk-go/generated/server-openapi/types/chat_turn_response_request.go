package types

// Chat turn response request schema exposed by Claw Router.
type ChatTurnResponseRequest struct {
	Message string `json:"message"`
	Metadata map[string]JsonValue `json:"metadata"`
	Model string `json:"model"`
	Provider string `json:"provider"`
	Runtime string `json:"runtime"`
	RuntimeInvocationId string `json:"runtimeInvocationId"`
	Status string `json:"status"`
	Usage map[string]interface{} `json:"usage"`
	UsageFactId string `json:"usageFactId"`
}
