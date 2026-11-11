package types

// DashScope asynchronous task record shared by task submission and task polling.
type AlibabaAsyncTask struct {
	Code string `json:"code"`
	EndTime string `json:"end_time"`
	Message string `json:"message"`
	OrigPrompt string `json:"orig_prompt"`
	Results []ProviderGeneratedMedia `json:"results"`
	ScheduledTime string `json:"scheduled_time"`
	SubmitTime string `json:"submit_time"`
	TaskId string `json:"task_id"`
	TaskStatus string `json:"task_status"`
	VideoUrl string `json:"video_url"`
}
