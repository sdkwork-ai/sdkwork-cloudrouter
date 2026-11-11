package types

// PixVerse video generation status and its outputs.
type PixverseVideoGenerationTask struct {
	ErrCode int `json:"ErrCode"`
	ErrMsg string `json:"ErrMsg"`
	Error PixverseErrorDetail `json:"Error"`
	Resp PixverseTaskResp `json:"Resp"`
}
