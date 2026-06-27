package types

// Routing usage data schema exposed by Claw Router.
type RoutingUsageData struct {
	Latency string `json:"latency"`
	Requests string `json:"requests"`
	Time string `json:"time"`
}
