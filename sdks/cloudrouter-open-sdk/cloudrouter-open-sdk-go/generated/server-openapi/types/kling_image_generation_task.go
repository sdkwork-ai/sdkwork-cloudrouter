package types

// Kling image task envelope returned by the create and query endpoints.
type KlingImageGenerationTask struct {
	Code int `json:"code"`
	Data KlingImageTaskData `json:"data"`
	Message string `json:"message"`
	RequestId string `json:"request_id"`
}
