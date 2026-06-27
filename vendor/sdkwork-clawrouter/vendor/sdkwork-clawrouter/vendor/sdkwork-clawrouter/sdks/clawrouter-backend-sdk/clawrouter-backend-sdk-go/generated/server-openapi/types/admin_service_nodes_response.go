package types

// Admin service nodes response schema exposed by Claw Router.
type AdminServiceNodesResponse struct {
	Items []AdminServiceNodeItem `json:"items"`
}
