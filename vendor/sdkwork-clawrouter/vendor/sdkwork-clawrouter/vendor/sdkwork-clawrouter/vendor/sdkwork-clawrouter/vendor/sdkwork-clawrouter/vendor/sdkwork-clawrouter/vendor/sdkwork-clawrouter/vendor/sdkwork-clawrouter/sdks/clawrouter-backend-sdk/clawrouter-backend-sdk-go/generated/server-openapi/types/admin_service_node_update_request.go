package types

// Admin service node update request schema exposed by Claw Router.
type AdminServiceNodeUpdateRequest struct {
	Domain string `json:"domain"`
	Ip string `json:"ip"`
	Name string `json:"name"`
	Remark string `json:"remark"`
}
