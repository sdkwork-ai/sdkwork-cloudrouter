package types

// OpenAI-compatible role assignment object.
type OpenAiRoleAssignment struct {
	CreatedAt int `json:"created_at"`
	GroupId string `json:"group_id"`
	Id string `json:"id"`
	Object string `json:"object"`
	ProjectId string `json:"project_id"`
	RoleId string `json:"role_id"`
	UserId string `json:"user_id"`
}
