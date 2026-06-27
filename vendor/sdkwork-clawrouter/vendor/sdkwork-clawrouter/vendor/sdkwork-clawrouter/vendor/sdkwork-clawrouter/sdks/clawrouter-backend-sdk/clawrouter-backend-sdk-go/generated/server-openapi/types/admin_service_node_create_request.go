package types

// Admin service node create request schema exposed by Claw Router.
type AdminServiceNodeCreateRequest struct {
	Domain string `json:"domain"`
	Ip string `json:"ip"`
	Name string `json:"name"`
	Remark string `json:"remark"`
	Status string `json:"status"`
}
