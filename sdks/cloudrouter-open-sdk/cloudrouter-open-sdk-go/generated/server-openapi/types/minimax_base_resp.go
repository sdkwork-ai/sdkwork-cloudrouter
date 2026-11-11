package types

// MiniMax business status envelope returned by every media endpoint.
type MinimaxBaseResp struct {
	StatusCode int `json:"status_code"`
	StatusMsg string `json:"status_msg"`
}
