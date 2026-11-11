package types

// MiniMax T2A v2 response. data.audio is hex-encoded audio; usage_characters is the billed count.
type MinimaxTextToSpeechResponse struct {
	BaseResp MinimaxBaseResp `json:"base_resp"`
	Data map[string]ProviderJsonValue `json:"data"`
	ExtraInfo map[string]ProviderJsonValue `json:"extra_info"`
	TraceId string `json:"trace_id"`
}
