package types

// MiniMax file metadata and its download URL.
type MinimaxFileRetrieveResponse struct {
	BaseResp MinimaxBaseResp `json:"base_resp"`
	File map[string]ProviderJsonValue `json:"file"`
}
