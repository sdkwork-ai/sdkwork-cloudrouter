package types

// ByteDance Seed TTS 2.0 request (`POST /api/v3/tts/unidirectional`). The vendor nests every synthesis field under `req_params`.
type BytedanceSpeechRequest struct {
	ReqParams BytedanceTtsRequestParams `json:"req_params"`
}
