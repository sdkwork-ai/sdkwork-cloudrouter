package types

// Admin monitor node item schema exposed by Claw Router.
type AdminMonitorNodeItem struct {
	Cpu float64 `json:"cpu"`
	Id string `json:"id"`
	Ip string `json:"ip"`
	Memory float64 `json:"memory"`
	Name string `json:"name"`
	Region string `json:"region"`
	Status string `json:"status"`
	Uptime string `json:"uptime"`
}
