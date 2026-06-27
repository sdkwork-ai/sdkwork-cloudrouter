package types

// Suno-compatible suno music generation task response schema exposed by Claw Router vendor routing.
type SunoMusicGenerationTaskResponse struct {
	CreatedAt string `json:"created_at"`
	Error ProviderTaskError `json:"error"`
	Id string `json:"id"`
	Status string `json:"status"`
	TaskId string `json:"task_id"`
	Title string `json:"title"`
	Tracks []SunoMusicTrack `json:"tracks"`
	UpdatedAt string `json:"updated_at"`
}
