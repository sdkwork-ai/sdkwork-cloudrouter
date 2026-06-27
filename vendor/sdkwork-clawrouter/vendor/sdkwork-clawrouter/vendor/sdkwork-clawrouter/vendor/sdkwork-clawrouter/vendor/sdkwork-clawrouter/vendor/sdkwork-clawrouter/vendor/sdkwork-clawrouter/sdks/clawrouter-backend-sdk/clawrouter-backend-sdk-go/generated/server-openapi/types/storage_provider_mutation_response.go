package types

// Storage provider mutation response schema exposed by Claw Router.
type StorageProviderMutationResponse struct {
	Provider StorageProviderConfig `json:"provider"`
	RequestId string `json:"requestId"`
}
