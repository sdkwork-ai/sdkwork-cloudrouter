package types

// PixVerse generation submission acknowledgement.
type PixverseVideoGenerationResponse struct {
	ErrCode int `json:"ErrCode"`
	ErrMsg string `json:"ErrMsg"`
	Error PixverseErrorDetail `json:"Error"`
	Resp PixverseTaskResp `json:"Resp"`
}
