package types

// Update storage provider request schema exposed by Claw Router.
type UpdateStorageProviderRequest struct {
	Reason string `json:"reason"`
	Status string `json:"status"`
}
