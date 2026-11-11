package types

// MiniMax music generation request (`POST /v1/music_generation`).
type MiniMaxMusicGenerationRequest struct {
	AudioBase64 string `json:"audio_base64"`
	AudioSetting MiniMaxMusicAudioSetting `json:"audio_setting"`
	AudioUrl string `json:"audio_url"`
	CoverFeatureId string `json:"cover_feature_id"`
	IsInstrumental bool `json:"is_instrumental"`
	Lyrics string `json:"lyrics"`
	LyricsOptimizer bool `json:"lyrics_optimizer"`
	Model string `json:"model"`
	OutputFormat string `json:"output_format"`
	Prompt string `json:"prompt"`
	Stream bool `json:"stream"`
}
