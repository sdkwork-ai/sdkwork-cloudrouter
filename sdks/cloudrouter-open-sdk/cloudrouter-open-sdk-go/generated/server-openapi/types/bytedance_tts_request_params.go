package types

// ByteDance Seed TTS synthesis parameters.
type BytedanceTtsRequestParams struct {
	Additions string `json:"additions"`
	AudioParams BytedanceTtsAudioParams `json:"audio_params"`
	Model string `json:"model"`
	PronunciationDict map[string]ProviderJsonValue `json:"pronunciation_dict"`
	Speaker string `json:"speaker"`
	Ssml string `json:"ssml"`
	Text string `json:"text"`
	Tone []string `json:"tone"`
}
