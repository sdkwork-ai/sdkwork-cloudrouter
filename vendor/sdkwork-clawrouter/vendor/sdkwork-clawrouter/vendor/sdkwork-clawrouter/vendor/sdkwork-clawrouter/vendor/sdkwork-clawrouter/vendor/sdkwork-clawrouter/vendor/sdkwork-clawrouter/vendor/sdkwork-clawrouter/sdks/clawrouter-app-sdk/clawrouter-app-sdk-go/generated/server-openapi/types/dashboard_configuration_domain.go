package types

// Dashboard configuration domain schema exposed by Claw Router.
type DashboardConfigurationDomain struct {
	Domain string `json:"domain"`
	Id string `json:"id"`
	Ip string `json:"ip"`
	Name string `json:"name"`
	Remark string `json:"remark"`
	Status string `json:"status"`
}
