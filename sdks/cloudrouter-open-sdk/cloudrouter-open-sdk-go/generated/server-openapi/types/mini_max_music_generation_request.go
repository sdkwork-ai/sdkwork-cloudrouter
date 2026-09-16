package types

// MiniMax music generation request payload.
type MiniMaxMusicGenerationRequest struct {
	Model string `json:"model"`
	Prompt string `json:"prompt"`
	Lyrics string `json:"lyrics"`
	Stream bool `json:"stream"`
	OutputFormat string `json:"output_format"`
	IsInstrumental bool `json:"is_instrumental"`
	LyricsOptimizer bool `json:"lyrics_optimizer"`
	AudioSetting MiniMaxMusicAudioSetting `json:"audio_setting"`
}
