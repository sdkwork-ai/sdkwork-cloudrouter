package types

// Suno-compatible suno music generation request schema exposed by Claw Router vendor routing.
type SunoMusicGenerationRequest struct {
	CallbackUrl string `json:"callback_url"`
	Duration float64 `json:"duration"`
	Model string `json:"model"`
	NegativeTags string `json:"negative_tags"`
	Prompt string `json:"prompt"`
	Tags string `json:"tags"`
	Title string `json:"title"`
}
