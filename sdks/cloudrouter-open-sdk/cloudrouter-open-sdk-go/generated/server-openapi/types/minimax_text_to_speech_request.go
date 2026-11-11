package types

// MiniMax T2A v2 speech synthesis request (`POST /v1/t2a_v2`).
type MinimaxTextToSpeechRequest struct {
	AudioSetting map[string]ProviderJsonValue `json:"audio_setting"`
	LanguageBoost string `json:"language_boost"`
	Model string `json:"model"`
	OutputFormat string `json:"output_format"`
	PronunciationDict map[string]ProviderJsonValue `json:"pronunciation_dict"`
	Stream bool `json:"stream"`
	StreamOptions MinimaxStreamOptions `json:"stream_options"`
	SubtitleEnable bool `json:"subtitle_enable"`
	SubtitleType string `json:"subtitle_type"`
	Text string `json:"text"`
	TextNormalizationMode string `json:"text_normalization_mode"`
	TimbreWeights []MinimaxTimbreWeight `json:"timbre_weights"`
	VoiceModify MinimaxVoiceModify `json:"voice_modify"`
	VoiceSetting map[string]ProviderJsonValue `json:"voice_setting"`
}
