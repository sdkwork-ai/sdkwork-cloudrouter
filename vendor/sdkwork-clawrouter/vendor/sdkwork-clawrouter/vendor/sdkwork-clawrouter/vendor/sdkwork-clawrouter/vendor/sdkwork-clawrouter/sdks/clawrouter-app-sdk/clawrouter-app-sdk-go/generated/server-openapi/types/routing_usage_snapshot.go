package types

// Routing usage snapshot schema exposed by Claw Router.
type RoutingUsageSnapshot struct {
	ChartData []RoutingUsageData `json:"chartData"`
	ModelStats []RoutingModelStats `json:"modelStats"`
}
