package types

// Admin pie chart item schema exposed by Claw Router.
type AdminPieChartItem struct {
	Color string `json:"color"`
	Name string `json:"name"`
	Value float64 `json:"value"`
}
