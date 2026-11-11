package types

// Kling image task record.
type KlingImageTaskData struct {
	CreatedAt int `json:"created_at"`
	TaskId string `json:"task_id"`
	TaskInfo map[string]ProviderJsonValue `json:"task_info"`
	TaskResult KlingImageTaskResult `json:"task_result"`
	TaskStatus string `json:"task_status"`
	TaskStatusMsg string `json:"task_status_msg"`
	UpdatedAt int `json:"updated_at"`
}
