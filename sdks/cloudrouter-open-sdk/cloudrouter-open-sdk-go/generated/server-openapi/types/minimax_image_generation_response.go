package types

// MiniMax image generation response.
type MinimaxImageGenerationResponse struct {
	BaseResp MinimaxBaseResp `json:"base_resp"`
	Data MinimaxImageData `json:"data"`
	Id string `json:"id"`
	Metadata map[string]ProviderJsonValue `json:"metadata"`
}
