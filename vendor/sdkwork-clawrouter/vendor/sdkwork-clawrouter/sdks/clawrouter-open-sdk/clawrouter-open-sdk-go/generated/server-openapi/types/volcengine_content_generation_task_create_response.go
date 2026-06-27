package types

// Volcengine Ark volcengine content generation task create response schema exposed by Claw Router vendor routing.
type VolcengineContentGenerationTaskCreateResponse struct {
	CreatedAt string `json:"created_at"`
	Id string `json:"id"`
	Status string `json:"status"`
	TaskId string `json:"task_id"`
}
