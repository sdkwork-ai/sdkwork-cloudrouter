package types

// Composition plan for the music_v2 and music_v2_5 models.
type ElevenLabsCompositionPlan struct {
	Chunks []map[string]ProviderJsonValue `json:"chunks"`
}
