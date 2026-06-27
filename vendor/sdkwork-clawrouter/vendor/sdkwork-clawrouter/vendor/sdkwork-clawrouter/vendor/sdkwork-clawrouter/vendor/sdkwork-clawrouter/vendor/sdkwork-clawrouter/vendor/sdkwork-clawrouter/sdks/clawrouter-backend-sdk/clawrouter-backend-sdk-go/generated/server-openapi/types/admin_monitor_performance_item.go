package types

// Admin monitor performance item schema exposed by Claw Router.
type AdminMonitorPerformanceItem struct {
	Cpu float64 `json:"cpu"`
	Memory float64 `json:"memory"`
	Network float64 `json:"network"`
	Time string `json:"time"`
}
