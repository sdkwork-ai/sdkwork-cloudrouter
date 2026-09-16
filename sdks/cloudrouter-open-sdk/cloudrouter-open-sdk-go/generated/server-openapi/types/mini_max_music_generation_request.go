package types

// Mini max music generation request schema exposed by Cloud Router.
type MiniMaxMusicGenerationRequest struct {
	AudioSetting MiniMaxMusicAudioSetting `json:"audio_setting"`
	IsInstrumental bool `json:"is_instrumental"`
	Lyrics string `json:"lyrics"`
	LyricsOptimizer bool `json:"lyrics_optimizer"`
	Model string `json:"model"`
	OutputFormat string `json:"output_format"`
	Prompt string `json:"prompt"`
	Stream bool `json:"stream"`
}
