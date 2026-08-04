package types


type PageInfo struct {
	HasMore bool `json:"hasMore"`
	Mode string `json:"mode"`
	NextCursor string `json:"nextCursor"`
	Page int `json:"page"`
	PageSize int `json:"pageSize"`
	TotalItems string `json:"totalItems"`
	TotalPages int `json:"totalPages"`
}
