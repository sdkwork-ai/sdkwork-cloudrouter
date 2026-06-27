package types

// OpenAI-compatible skill object exposed by Claw Router.
type OpenAiSkill struct {
	CreatedAt int `json:"created_at"`
	Description string `json:"description"`
	Id string `json:"id"`
	LatestVersion string `json:"latest_version"`
	Metadata map[string]ProviderJsonValue `json:"metadata"`
	Name string `json:"name"`
	Object string `json:"object"`
	Status string `json:"status"`
	UpdatedAt int `json:"updated_at"`
	Versions []OpenAiSkillVersion `json:"versions"`
}
