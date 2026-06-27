package types

// Admin dashboard traffic item schema exposed by Claw Router.
type AdminDashboardTrafficItem struct {
	Cost float64 `json:"cost"`
	Requests float64 `json:"requests"`
	Time string `json:"time"`
	Tokens float64 `json:"tokens"`
}
