package types

// Volcengine Ark image generation response.
type VolcengineImageGenerationResponse struct {
	Created int `json:"created"`
	Data []ArkImageGenerationData `json:"data"`
	Error ProviderTaskError `json:"error"`
	Model string `json:"model"`
	Tools []ArkWebSearchTool `json:"tools"`
	Usage ArkImageUsage `json:"usage"`
}
