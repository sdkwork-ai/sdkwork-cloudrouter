package types

// Admin service node item schema exposed by Claw Router.
type AdminServiceNodeItem struct {
	Domain string `json:"domain"`
	HealthStatus string `json:"healthStatus"`
	Id string `json:"id"`
	Ip string `json:"ip"`
	Name string `json:"name"`
	Remark string `json:"remark"`
	Status string `json:"status"`
	UpdatedAt string `json:"updatedAt"`
}
