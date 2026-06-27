package types

// Suno-compatible suno music generation response schema exposed by Claw Router vendor routing.
type SunoMusicGenerationResponse struct {
	CreatedAt string `json:"created_at"`
	Id string `json:"id"`
	Status string `json:"status"`
	TaskId string `json:"task_id"`
}
