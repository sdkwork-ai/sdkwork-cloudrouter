package types

// Mini max music generation response schema exposed by Cloud Router.
type MiniMaxMusicGenerationResponse struct {
	BaseResp MiniMaxMusicBaseResp `json:"base_resp"`
	Data MiniMaxMusicData `json:"data"`
	TraceId string `json:"trace_id"`
}
