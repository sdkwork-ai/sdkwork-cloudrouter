package types

// ElevenLabs per-request voice settings.
type ElevenLabsVoiceSettings struct {
	CloneStrength float64 `json:"clone_strength"`
	SimilarityBoost float64 `json:"similarity_boost"`
	Speed float64 `json:"speed"`
	Stability float64 `json:"stability"`
	Style float64 `json:"style"`
	UseSpeakerBoost bool `json:"use_speaker_boost"`
}
