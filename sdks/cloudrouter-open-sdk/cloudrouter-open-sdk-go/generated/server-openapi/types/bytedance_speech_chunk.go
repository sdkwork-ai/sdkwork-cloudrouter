package types

// One streamed Seed TTS frame. The vendor answers NDJSON frames carrying base64 `data`; the final frame has `code` 20000000.
type BytedanceSpeechChunk struct {
	Code int `json:"code"`
	Data string `json:"data"`
	Message string `json:"message"`
	Sequence int `json:"sequence"`
}
