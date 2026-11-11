package types

// Alibaba DashScope asynchronous task status and its generated video.
type AlibabaVideoGenerationTask struct {
	Output AlibabaAsyncTask `json:"output"`
	RequestId string `json:"request_id"`
	Usage AlibabaTaskUsage `json:"usage"`
}
