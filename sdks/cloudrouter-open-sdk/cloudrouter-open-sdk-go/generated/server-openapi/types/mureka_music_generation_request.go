package types

// Mureka song generation request.
type MurekaMusicGenerationRequest struct {
	CallbackUrl string `json:"callback_url"`
	Duration int `json:"duration"`
	Lyrics string `json:"lyrics"`
	Model string `json:"model"`
	Prompt string `json:"prompt"`
	ReferenceAudioUrl string `json:"reference_audio_url"`
	Tags []string `json:"tags"`
	Title string `json:"title"`
}
