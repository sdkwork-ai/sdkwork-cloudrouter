package types

// MiniMax asynchronous video generation task, its status, and the produced file id.
type MinimaxVideoGenerationTask struct {
	BaseResp MinimaxBaseResp `json:"base_resp"`
	FileId string `json:"file_id"`
	Status string `json:"status"`
	TaskId string `json:"task_id"`
	VideoHeight int `json:"video_height"`
	VideoWidth int `json:"video_width"`
}
