package types

// OpenAI-compatible skill version object exposed by Claw Router.
type OpenAiSkillVersion struct {
	CreatedAt int `json:"created_at"`
	Id string `json:"id"`
	Metadata map[string]ProviderJsonValue `json:"metadata"`
	Object string `json:"object"`
	PackageSha256 string `json:"package_sha256"`
	SkillId string `json:"skill_id"`
	Status string `json:"status"`
	Version string `json:"version"`
}
