package types

// Alibaba DashScope asynchronous video task submission acknowledgement.
type AlibabaVideoGenerationResponse struct {
	Code string `json:"code"`
	Message string `json:"message"`
	Output AlibabaAsyncTask `json:"output"`
	RequestId string `json:"request_id"`
	Usage AlibabaTaskUsage `json:"usage"`
}
