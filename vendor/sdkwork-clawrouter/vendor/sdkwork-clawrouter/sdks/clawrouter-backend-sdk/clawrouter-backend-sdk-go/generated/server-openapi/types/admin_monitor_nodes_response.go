package types

// Admin monitor nodes response schema exposed by Claw Router.
type AdminMonitorNodesResponse struct {
	Items []AdminMonitorNodeItem `json:"items"`
}
