package types

// Kling sound-effect task (text-to-audio / video-to-audio) and its status.
type KlingAudioTask struct {
	Code int `json:"code"`
	Data map[string]ProviderJsonValue `json:"data"`
	Message string `json:"message"`
	RequestId string `json:"request_id"`
}
