package types

// OpenAI-compatible batch object.
type OpenAiBatch struct {
	CancelledAt int `json:"cancelled_at"`
	CancellingAt int `json:"cancelling_at"`
	CompletedAt int `json:"completed_at"`
	CompletionWindow string `json:"completion_window"`
	CreatedAt int `json:"created_at"`
	Endpoint string `json:"endpoint"`
	ErrorFileId string `json:"error_file_id"`
	Errors ProviderJsonValue `json:"errors"`
	ExpiredAt int `json:"expired_at"`
	ExpiresAt int `json:"expires_at"`
	FailedAt int `json:"failed_at"`
	FinalizingAt int `json:"finalizing_at"`
	Id string `json:"id"`
	InProgressAt int `json:"in_progress_at"`
	InputFileId string `json:"input_file_id"`
	Metadata map[string]ProviderJsonValue `json:"metadata"`
	Object string `json:"object"`
	OutputFileId string `json:"output_file_id"`
	RequestCounts OpenAiBatchRequestCounts `json:"request_counts"`
	Status string `json:"status"`
}
