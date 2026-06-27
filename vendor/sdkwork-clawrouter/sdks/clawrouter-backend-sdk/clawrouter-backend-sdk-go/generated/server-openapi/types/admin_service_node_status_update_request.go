package types

// Admin service node status update request schema exposed by Claw Router.
type AdminServiceNodeStatusUpdateRequest struct {
	Status string `json:"status"`
}
