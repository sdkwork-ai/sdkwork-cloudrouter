package api

import (
    "encoding/json"
    "fmt"
    "net/url"
    "strings"
    sdktypes "github.com/sdkwork/clawrouter-open-sdk/types"
    sdkhttp "github.com/sdkwork/clawrouter-open-sdk/http"
)

type OrganizationApi struct {
    client *sdkhttp.Client
}

func NewOrganizationApi(client *sdkhttp.Client) *OrganizationApi {
    return &OrganizationApi{client: client}
}

// List organization admin API keys
func (a *OrganizationApi) ListAdminApiKeys(limit *int, order *string, after *string, before *string) (sdktypes.OpenAiOrganizationAdminApiKeyList, error) {
    query := BuildQueryString([]QueryParameterSpec{
        {Name: "page_size", Value: func() interface{} { if limit == nil { return nil }; return *limit }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "order", Value: func() interface{} { if order == nil { return nil }; return *order }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "after", Value: func() interface{} { if after == nil { return nil }; return *after }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "before", Value: func() interface{} { if before == nil { return nil }; return *before }(), Style: "form", Explode: true, AllowReserved: false},
    })
    raw, err := a.client.Get(AppendQueryString(AiApiPath("/organization/admin_api_keys"), query), nil, nil)
    if err != nil {
        var zero sdktypes.OpenAiOrganizationAdminApiKeyList
        return zero, err
    }
    return decodeResult[sdktypes.OpenAiOrganizationAdminApiKeyList](raw)
}

// Create organization admin API key
func (a *OrganizationApi) CreateAdminApiKey(body sdktypes.OpenAiOrganizationAdminApiKeyCreateRequest) (sdktypes.OpenAiOrganizationAdminApiKey, error) {
    raw, err := a.client.Post(AiApiPath("/organization/admin_api_keys"), body, nil, nil, "application/json")
    if err != nil {
        var zero sdktypes.OpenAiOrganizationAdminApiKey
        return zero, err
    }
    return decodeResult[sdktypes.OpenAiOrganizationAdminApiKey](raw)
}

// Delete organization admin API key
func (a *OrganizationApi) DeleteAdminApiKeys(keyId string) (sdktypes.DeleteResult, error) {
    raw, err := a.client.Delete(AiApiPath(fmt.Sprintf("/organization/admin_api_keys/%s", SerializePathParameter(keyId, PathParameterSpec{Name: "key_id", Style: "simple", Explode: false}))), nil, nil)
    if err != nil {
        var zero sdktypes.DeleteResult
        return zero, err
    }
    return decodeResult[sdktypes.DeleteResult](raw)
}

// List organization audit logs
func (a *OrganizationApi) ListAuditLogs(effectiveAtGte *int, effectiveAtLte *int, projectIds []string, eventTypes []string, actorIds []string, actorEmails []string, resourceIds []string, limit *int, after *string, before *string) (sdktypes.OpenAiOrganizationAuditLogList, error) {
    query := BuildQueryString([]QueryParameterSpec{
        {Name: "effective_at[gte]", Value: func() interface{} { if effectiveAtGte == nil { return nil }; return *effectiveAtGte }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "effective_at[lte]", Value: func() interface{} { if effectiveAtLte == nil { return nil }; return *effectiveAtLte }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "project_ids[]", Value: func() interface{} { if projectIds == nil { return nil }; return *projectIds }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "event_types[]", Value: func() interface{} { if eventTypes == nil { return nil }; return *eventTypes }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "actor_ids[]", Value: func() interface{} { if actorIds == nil { return nil }; return *actorIds }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "actor_emails[]", Value: func() interface{} { if actorEmails == nil { return nil }; return *actorEmails }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "resource_ids[]", Value: func() interface{} { if resourceIds == nil { return nil }; return *resourceIds }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "limit", Value: func() interface{} { if limit == nil { return nil }; return *limit }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "after", Value: func() interface{} { if after == nil { return nil }; return *after }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "before", Value: func() interface{} { if before == nil { return nil }; return *before }(), Style: "form", Explode: true, AllowReserved: false},
    })
    raw, err := a.client.Get(AppendQueryString(AiApiPath("/organization/audit_logs"), query), nil, nil)
    if err != nil {
        var zero sdktypes.OpenAiOrganizationAuditLogList
        return zero, err
    }
    return decodeResult[sdktypes.OpenAiOrganizationAuditLogList](raw)
}

// List organization certificates
func (a *OrganizationApi) ListCertificates(limit *int, order *string, after *string, before *string) (sdktypes.OpenAiCertificateList, error) {
    query := BuildQueryString([]QueryParameterSpec{
        {Name: "page_size", Value: func() interface{} { if limit == nil { return nil }; return *limit }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "order", Value: func() interface{} { if order == nil { return nil }; return *order }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "after", Value: func() interface{} { if after == nil { return nil }; return *after }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "before", Value: func() interface{} { if before == nil { return nil }; return *before }(), Style: "form", Explode: true, AllowReserved: false},
    })
    raw, err := a.client.Get(AppendQueryString(AiApiPath("/organization/certificates"), query), nil, nil)
    if err != nil {
        var zero sdktypes.OpenAiCertificateList
        return zero, err
    }
    return decodeResult[sdktypes.OpenAiCertificateList](raw)
}

// Upload organization certificate
func (a *OrganizationApi) CreateCertificate(body sdktypes.OpenAiCertificateUploadMultipartRequest) (sdktypes.OpenAiCertificate, error) {
    raw, err := a.client.Post(AiApiPath("/organization/certificates"), body, nil, nil, "multipart/form-data")
    if err != nil {
        var zero sdktypes.OpenAiCertificate
        return zero, err
    }
    return decodeResult[sdktypes.OpenAiCertificate](raw)
}

// Activate organization certificates
func (a *OrganizationApi) CreateCertificatesActivate(body sdktypes.OpenAiCertificateActivationRequest) (sdktypes.OpenAiCertificateList, error) {
    raw, err := a.client.Post(AiApiPath("/organization/certificates/activate"), body, nil, nil, "application/json")
    if err != nil {
        var zero sdktypes.OpenAiCertificateList
        return zero, err
    }
    return decodeResult[sdktypes.OpenAiCertificateList](raw)
}

// Deactivate organization certificates
func (a *OrganizationApi) CreateCertificatesDeactivate(body sdktypes.OpenAiCertificateActivationRequest) (sdktypes.OpenAiCertificateList, error) {
    raw, err := a.client.Post(AiApiPath("/organization/certificates/deactivate"), body, nil, nil, "application/json")
    if err != nil {
        var zero sdktypes.OpenAiCertificateList
        return zero, err
    }
    return decodeResult[sdktypes.OpenAiCertificateList](raw)
}

// Delete organization certificate
func (a *OrganizationApi) DeleteCertificates(certificateId string) (sdktypes.DeleteResult, error) {
    raw, err := a.client.Delete(AiApiPath(fmt.Sprintf("/organization/certificates/%s", SerializePathParameter(certificateId, PathParameterSpec{Name: "certificate_id", Style: "simple", Explode: false}))), nil, nil)
    if err != nil {
        var zero sdktypes.DeleteResult
        return zero, err
    }
    return decodeResult[sdktypes.DeleteResult](raw)
}

// Get organization costs
func (a *OrganizationApi) ListCosts(startTime *int, endTime *int, bucketWidth *string, projectIds []string, userIds []string, apiKeyIds []string, models []string, groupBy []string, limit *int, page *string) (sdktypes.OpenAiOrganizationCostList, error) {
    query := BuildQueryString([]QueryParameterSpec{
        {Name: "start_time", Value: func() interface{} { if startTime == nil { return nil }; return *startTime }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "end_time", Value: func() interface{} { if endTime == nil { return nil }; return *endTime }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "bucket_width", Value: func() interface{} { if bucketWidth == nil { return nil }; return *bucketWidth }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "project_ids", Value: func() interface{} { if projectIds == nil { return nil }; return *projectIds }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "user_ids", Value: func() interface{} { if userIds == nil { return nil }; return *userIds }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "api_key_ids", Value: func() interface{} { if apiKeyIds == nil { return nil }; return *apiKeyIds }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "models", Value: func() interface{} { if models == nil { return nil }; return *models }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "group_by", Value: func() interface{} { if groupBy == nil { return nil }; return *groupBy }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "limit", Value: func() interface{} { if limit == nil { return nil }; return *limit }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "page", Value: func() interface{} { if page == nil { return nil }; return *page }(), Style: "form", Explode: true, AllowReserved: false},
    })
    raw, err := a.client.Get(AppendQueryString(AiApiPath("/organization/costs"), query), nil, nil)
    if err != nil {
        var zero sdktypes.OpenAiOrganizationCostList
        return zero, err
    }
    return decodeResult[sdktypes.OpenAiOrganizationCostList](raw)
}

// List organization groups
func (a *OrganizationApi) ListGroups(limit *int, order *string, after *string, before *string) (sdktypes.OpenAiOrganizationGroupList, error) {
    query := BuildQueryString([]QueryParameterSpec{
        {Name: "page_size", Value: func() interface{} { if limit == nil { return nil }; return *limit }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "order", Value: func() interface{} { if order == nil { return nil }; return *order }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "after", Value: func() interface{} { if after == nil { return nil }; return *after }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "before", Value: func() interface{} { if before == nil { return nil }; return *before }(), Style: "form", Explode: true, AllowReserved: false},
    })
    raw, err := a.client.Get(AppendQueryString(AiApiPath("/organization/groups"), query), nil, nil)
    if err != nil {
        var zero sdktypes.OpenAiOrganizationGroupList
        return zero, err
    }
    return decodeResult[sdktypes.OpenAiOrganizationGroupList](raw)
}

// Create organization group
func (a *OrganizationApi) CreateGroup(body sdktypes.OpenAiOrganizationGroupCreateRequest) (sdktypes.OpenAiOrganizationGroup, error) {
    raw, err := a.client.Post(AiApiPath("/organization/groups"), body, nil, nil, "application/json")
    if err != nil {
        var zero sdktypes.OpenAiOrganizationGroup
        return zero, err
    }
    return decodeResult[sdktypes.OpenAiOrganizationGroup](raw)
}

// Delete organization group
func (a *OrganizationApi) DeleteGroups(groupId string) (sdktypes.DeleteResult, error) {
    raw, err := a.client.Delete(AiApiPath(fmt.Sprintf("/organization/groups/%s", SerializePathParameter(groupId, PathParameterSpec{Name: "group_id", Style: "simple", Explode: false}))), nil, nil)
    if err != nil {
        var zero sdktypes.DeleteResult
        return zero, err
    }
    return decodeResult[sdktypes.DeleteResult](raw)
}

// List organization group roles
func (a *OrganizationApi) ListGroupsRoles(groupId string, limit *int, order *string, after *string, before *string) (sdktypes.OpenAiRoleAssignmentList, error) {
    query := BuildQueryString([]QueryParameterSpec{
        {Name: "page_size", Value: func() interface{} { if limit == nil { return nil }; return *limit }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "order", Value: func() interface{} { if order == nil { return nil }; return *order }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "after", Value: func() interface{} { if after == nil { return nil }; return *after }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "before", Value: func() interface{} { if before == nil { return nil }; return *before }(), Style: "form", Explode: true, AllowReserved: false},
    })
    raw, err := a.client.Get(AppendQueryString(AiApiPath(fmt.Sprintf("/organization/groups/%s/roles", SerializePathParameter(groupId, PathParameterSpec{Name: "group_id", Style: "simple", Explode: false}))), query), nil, nil)
    if err != nil {
        var zero sdktypes.OpenAiRoleAssignmentList
        return zero, err
    }
    return decodeResult[sdktypes.OpenAiRoleAssignmentList](raw)
}

// Create organization group role
func (a *OrganizationApi) CreateGroupsRole(groupId string, body sdktypes.OpenAiRoleAssignmentCreateRequest) (sdktypes.OpenAiRoleAssignment, error) {
    raw, err := a.client.Post(AiApiPath(fmt.Sprintf("/organization/groups/%s/roles", SerializePathParameter(groupId, PathParameterSpec{Name: "group_id", Style: "simple", Explode: false}))), body, nil, nil, "application/json")
    if err != nil {
        var zero sdktypes.OpenAiRoleAssignment
        return zero, err
    }
    return decodeResult[sdktypes.OpenAiRoleAssignment](raw)
}

// Delete organization group role
func (a *OrganizationApi) DeleteGroupsRoles(groupId string, roleId string) (sdktypes.DeleteResult, error) {
    raw, err := a.client.Delete(AiApiPath(fmt.Sprintf("/organization/groups/%s/roles/%s", SerializePathParameter(groupId, PathParameterSpec{Name: "group_id", Style: "simple", Explode: false}), SerializePathParameter(roleId, PathParameterSpec{Name: "role_id", Style: "simple", Explode: false}))), nil, nil)
    if err != nil {
        var zero sdktypes.DeleteResult
        return zero, err
    }
    return decodeResult[sdktypes.DeleteResult](raw)
}

// List organization group users
func (a *OrganizationApi) ListGroupsUsers(groupId string, limit *int, order *string, after *string, before *string) (sdktypes.OpenAiOrganizationUserList, error) {
    query := BuildQueryString([]QueryParameterSpec{
        {Name: "page_size", Value: func() interface{} { if limit == nil { return nil }; return *limit }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "order", Value: func() interface{} { if order == nil { return nil }; return *order }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "after", Value: func() interface{} { if after == nil { return nil }; return *after }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "before", Value: func() interface{} { if before == nil { return nil }; return *before }(), Style: "form", Explode: true, AllowReserved: false},
    })
    raw, err := a.client.Get(AppendQueryString(AiApiPath(fmt.Sprintf("/organization/groups/%s/users", SerializePathParameter(groupId, PathParameterSpec{Name: "group_id", Style: "simple", Explode: false}))), query), nil, nil)
    if err != nil {
        var zero sdktypes.OpenAiOrganizationUserList
        return zero, err
    }
    return decodeResult[sdktypes.OpenAiOrganizationUserList](raw)
}

// Add organization group user
func (a *OrganizationApi) CreateGroupsUser(groupId string, body sdktypes.OpenAiOrganizationGroupUserCreateRequest) (sdktypes.OpenAiOrganizationUser, error) {
    raw, err := a.client.Post(AiApiPath(fmt.Sprintf("/organization/groups/%s/users", SerializePathParameter(groupId, PathParameterSpec{Name: "group_id", Style: "simple", Explode: false}))), body, nil, nil, "application/json")
    if err != nil {
        var zero sdktypes.OpenAiOrganizationUser
        return zero, err
    }
    return decodeResult[sdktypes.OpenAiOrganizationUser](raw)
}

// Delete organization group user
func (a *OrganizationApi) DeleteGroupsUsers(groupId string, userId string) (sdktypes.DeleteResult, error) {
    raw, err := a.client.Delete(AiApiPath(fmt.Sprintf("/organization/groups/%s/users/%s", SerializePathParameter(groupId, PathParameterSpec{Name: "group_id", Style: "simple", Explode: false}), SerializePathParameter(userId, PathParameterSpec{Name: "user_id", Style: "simple", Explode: false}))), nil, nil)
    if err != nil {
        var zero sdktypes.DeleteResult
        return zero, err
    }
    return decodeResult[sdktypes.DeleteResult](raw)
}

// List organization invites
func (a *OrganizationApi) ListInvites(limit *int, order *string, after *string, before *string) (sdktypes.OpenAiOrganizationInviteList, error) {
    query := BuildQueryString([]QueryParameterSpec{
        {Name: "page_size", Value: func() interface{} { if limit == nil { return nil }; return *limit }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "order", Value: func() interface{} { if order == nil { return nil }; return *order }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "after", Value: func() interface{} { if after == nil { return nil }; return *after }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "before", Value: func() interface{} { if before == nil { return nil }; return *before }(), Style: "form", Explode: true, AllowReserved: false},
    })
    raw, err := a.client.Get(AppendQueryString(AiApiPath("/organization/invites"), query), nil, nil)
    if err != nil {
        var zero sdktypes.OpenAiOrganizationInviteList
        return zero, err
    }
    return decodeResult[sdktypes.OpenAiOrganizationInviteList](raw)
}

// Create organization invite
func (a *OrganizationApi) CreateInvite(body sdktypes.OpenAiOrganizationInviteCreateRequest) (sdktypes.OpenAiOrganizationInvite, error) {
    raw, err := a.client.Post(AiApiPath("/organization/invites"), body, nil, nil, "application/json")
    if err != nil {
        var zero sdktypes.OpenAiOrganizationInvite
        return zero, err
    }
    return decodeResult[sdktypes.OpenAiOrganizationInvite](raw)
}

// Delete organization invite
func (a *OrganizationApi) DeleteInvites(inviteId string) (sdktypes.DeleteResult, error) {
    raw, err := a.client.Delete(AiApiPath(fmt.Sprintf("/organization/invites/%s", SerializePathParameter(inviteId, PathParameterSpec{Name: "invite_id", Style: "simple", Explode: false}))), nil, nil)
    if err != nil {
        var zero sdktypes.DeleteResult
        return zero, err
    }
    return decodeResult[sdktypes.DeleteResult](raw)
}

// List organization projects
func (a *OrganizationApi) ListProjects(limit *int, order *string, after *string, before *string) (sdktypes.OpenAiProjectList, error) {
    query := BuildQueryString([]QueryParameterSpec{
        {Name: "page_size", Value: func() interface{} { if limit == nil { return nil }; return *limit }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "order", Value: func() interface{} { if order == nil { return nil }; return *order }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "after", Value: func() interface{} { if after == nil { return nil }; return *after }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "before", Value: func() interface{} { if before == nil { return nil }; return *before }(), Style: "form", Explode: true, AllowReserved: false},
    })
    raw, err := a.client.Get(AppendQueryString(AiApiPath("/organization/projects"), query), nil, nil)
    if err != nil {
        var zero sdktypes.OpenAiProjectList
        return zero, err
    }
    return decodeResult[sdktypes.OpenAiProjectList](raw)
}

// Create organization project
func (a *OrganizationApi) CreateProject(body sdktypes.OpenAiProjectCreateRequest) (sdktypes.OpenAiProject, error) {
    raw, err := a.client.Post(AiApiPath("/organization/projects"), body, nil, nil, "application/json")
    if err != nil {
        var zero sdktypes.OpenAiProject
        return zero, err
    }
    return decodeResult[sdktypes.OpenAiProject](raw)
}

// List project API keys
func (a *OrganizationApi) ListProjectsApiKeys(projectId string, limit *int, order *string, after *string, before *string) (sdktypes.OpenAiProjectApiKeyList, error) {
    query := BuildQueryString([]QueryParameterSpec{
        {Name: "page_size", Value: func() interface{} { if limit == nil { return nil }; return *limit }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "order", Value: func() interface{} { if order == nil { return nil }; return *order }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "after", Value: func() interface{} { if after == nil { return nil }; return *after }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "before", Value: func() interface{} { if before == nil { return nil }; return *before }(), Style: "form", Explode: true, AllowReserved: false},
    })
    raw, err := a.client.Get(AppendQueryString(AiApiPath(fmt.Sprintf("/organization/projects/%s/api_keys", SerializePathParameter(projectId, PathParameterSpec{Name: "project_id", Style: "simple", Explode: false}))), query), nil, nil)
    if err != nil {
        var zero sdktypes.OpenAiProjectApiKeyList
        return zero, err
    }
    return decodeResult[sdktypes.OpenAiProjectApiKeyList](raw)
}

// Delete project API key
func (a *OrganizationApi) DeleteProjectsApiKeys(projectId string, keyId string) (sdktypes.DeleteResult, error) {
    raw, err := a.client.Delete(AiApiPath(fmt.Sprintf("/organization/projects/%s/api_keys/%s", SerializePathParameter(projectId, PathParameterSpec{Name: "project_id", Style: "simple", Explode: false}), SerializePathParameter(keyId, PathParameterSpec{Name: "key_id", Style: "simple", Explode: false}))), nil, nil)
    if err != nil {
        var zero sdktypes.DeleteResult
        return zero, err
    }
    return decodeResult[sdktypes.DeleteResult](raw)
}

// Archive organization project
func (a *OrganizationApi) CreateProjectsArchive(projectId string) (sdktypes.OpenAiProject, error) {
    raw, err := a.client.Post(AiApiPath(fmt.Sprintf("/organization/projects/%s/archive", SerializePathParameter(projectId, PathParameterSpec{Name: "project_id", Style: "simple", Explode: false}))), nil, nil, nil, "")
    if err != nil {
        var zero sdktypes.OpenAiProject
        return zero, err
    }
    return decodeResult[sdktypes.OpenAiProject](raw)
}

// List project certificates
func (a *OrganizationApi) ListProjectsCertificates(projectId string, limit *int, order *string, after *string, before *string) (sdktypes.OpenAiCertificateList, error) {
    query := BuildQueryString([]QueryParameterSpec{
        {Name: "page_size", Value: func() interface{} { if limit == nil { return nil }; return *limit }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "order", Value: func() interface{} { if order == nil { return nil }; return *order }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "after", Value: func() interface{} { if after == nil { return nil }; return *after }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "before", Value: func() interface{} { if before == nil { return nil }; return *before }(), Style: "form", Explode: true, AllowReserved: false},
    })
    raw, err := a.client.Get(AppendQueryString(AiApiPath(fmt.Sprintf("/organization/projects/%s/certificates", SerializePathParameter(projectId, PathParameterSpec{Name: "project_id", Style: "simple", Explode: false}))), query), nil, nil)
    if err != nil {
        var zero sdktypes.OpenAiCertificateList
        return zero, err
    }
    return decodeResult[sdktypes.OpenAiCertificateList](raw)
}

// Activate project certificates
func (a *OrganizationApi) CreateProjectsCertificatesActivate(projectId string, body sdktypes.OpenAiCertificateActivationRequest) (sdktypes.OpenAiCertificateList, error) {
    raw, err := a.client.Post(AiApiPath(fmt.Sprintf("/organization/projects/%s/certificates/activate", SerializePathParameter(projectId, PathParameterSpec{Name: "project_id", Style: "simple", Explode: false}))), body, nil, nil, "application/json")
    if err != nil {
        var zero sdktypes.OpenAiCertificateList
        return zero, err
    }
    return decodeResult[sdktypes.OpenAiCertificateList](raw)
}

// Deactivate project certificates
func (a *OrganizationApi) CreateProjectsCertificatesDeactivate(projectId string, body sdktypes.OpenAiCertificateActivationRequest) (sdktypes.OpenAiCertificateList, error) {
    raw, err := a.client.Post(AiApiPath(fmt.Sprintf("/organization/projects/%s/certificates/deactivate", SerializePathParameter(projectId, PathParameterSpec{Name: "project_id", Style: "simple", Explode: false}))), body, nil, nil, "application/json")
    if err != nil {
        var zero sdktypes.OpenAiCertificateList
        return zero, err
    }
    return decodeResult[sdktypes.OpenAiCertificateList](raw)
}

// List project groups
func (a *OrganizationApi) ListProjectsGroups(projectId string, limit *int, order *string, after *string, before *string) (sdktypes.OpenAiOrganizationGroupList, error) {
    query := BuildQueryString([]QueryParameterSpec{
        {Name: "page_size", Value: func() interface{} { if limit == nil { return nil }; return *limit }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "order", Value: func() interface{} { if order == nil { return nil }; return *order }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "after", Value: func() interface{} { if after == nil { return nil }; return *after }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "before", Value: func() interface{} { if before == nil { return nil }; return *before }(), Style: "form", Explode: true, AllowReserved: false},
    })
    raw, err := a.client.Get(AppendQueryString(AiApiPath(fmt.Sprintf("/organization/projects/%s/groups", SerializePathParameter(projectId, PathParameterSpec{Name: "project_id", Style: "simple", Explode: false}))), query), nil, nil)
    if err != nil {
        var zero sdktypes.OpenAiOrganizationGroupList
        return zero, err
    }
    return decodeResult[sdktypes.OpenAiOrganizationGroupList](raw)
}

// Create project group
func (a *OrganizationApi) CreateProjectsGroup(projectId string, body sdktypes.OpenAiProjectGroupCreateRequest) (sdktypes.OpenAiOrganizationGroup, error) {
    raw, err := a.client.Post(AiApiPath(fmt.Sprintf("/organization/projects/%s/groups", SerializePathParameter(projectId, PathParameterSpec{Name: "project_id", Style: "simple", Explode: false}))), body, nil, nil, "application/json")
    if err != nil {
        var zero sdktypes.OpenAiOrganizationGroup
        return zero, err
    }
    return decodeResult[sdktypes.OpenAiOrganizationGroup](raw)
}

// Delete project group
func (a *OrganizationApi) DeleteProjectsGroups(projectId string, groupId string) (sdktypes.DeleteResult, error) {
    raw, err := a.client.Delete(AiApiPath(fmt.Sprintf("/organization/projects/%s/groups/%s", SerializePathParameter(projectId, PathParameterSpec{Name: "project_id", Style: "simple", Explode: false}), SerializePathParameter(groupId, PathParameterSpec{Name: "group_id", Style: "simple", Explode: false}))), nil, nil)
    if err != nil {
        var zero sdktypes.DeleteResult
        return zero, err
    }
    return decodeResult[sdktypes.DeleteResult](raw)
}

// List project rate limits
func (a *OrganizationApi) ListProjectsRateLimits(projectId string, limit *int, order *string, after *string, before *string) (sdktypes.OpenAiProjectRateLimitList, error) {
    query := BuildQueryString([]QueryParameterSpec{
        {Name: "page_size", Value: func() interface{} { if limit == nil { return nil }; return *limit }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "order", Value: func() interface{} { if order == nil { return nil }; return *order }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "after", Value: func() interface{} { if after == nil { return nil }; return *after }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "before", Value: func() interface{} { if before == nil { return nil }; return *before }(), Style: "form", Explode: true, AllowReserved: false},
    })
    raw, err := a.client.Get(AppendQueryString(AiApiPath(fmt.Sprintf("/organization/projects/%s/rate_limits", SerializePathParameter(projectId, PathParameterSpec{Name: "project_id", Style: "simple", Explode: false}))), query), nil, nil)
    if err != nil {
        var zero sdktypes.OpenAiProjectRateLimitList
        return zero, err
    }
    return decodeResult[sdktypes.OpenAiProjectRateLimitList](raw)
}

// Modify project rate limit
func (a *OrganizationApi) CreateProjectsRateLimit(projectId string, rateLimitId string, body sdktypes.OpenAiProjectRateLimitUpdateRequest) (sdktypes.OpenAiProjectRateLimit, error) {
    raw, err := a.client.Post(AiApiPath(fmt.Sprintf("/organization/projects/%s/rate_limits/%s", SerializePathParameter(projectId, PathParameterSpec{Name: "project_id", Style: "simple", Explode: false}), SerializePathParameter(rateLimitId, PathParameterSpec{Name: "rate_limit_id", Style: "simple", Explode: false}))), body, nil, nil, "application/json")
    if err != nil {
        var zero sdktypes.OpenAiProjectRateLimit
        return zero, err
    }
    return decodeResult[sdktypes.OpenAiProjectRateLimit](raw)
}

// List project service accounts
func (a *OrganizationApi) ListProjectsServiceAccounts(projectId string, limit *int, order *string, after *string, before *string) (sdktypes.OpenAiProjectServiceAccountList, error) {
    query := BuildQueryString([]QueryParameterSpec{
        {Name: "page_size", Value: func() interface{} { if limit == nil { return nil }; return *limit }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "order", Value: func() interface{} { if order == nil { return nil }; return *order }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "after", Value: func() interface{} { if after == nil { return nil }; return *after }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "before", Value: func() interface{} { if before == nil { return nil }; return *before }(), Style: "form", Explode: true, AllowReserved: false},
    })
    raw, err := a.client.Get(AppendQueryString(AiApiPath(fmt.Sprintf("/organization/projects/%s/service_accounts", SerializePathParameter(projectId, PathParameterSpec{Name: "project_id", Style: "simple", Explode: false}))), query), nil, nil)
    if err != nil {
        var zero sdktypes.OpenAiProjectServiceAccountList
        return zero, err
    }
    return decodeResult[sdktypes.OpenAiProjectServiceAccountList](raw)
}

// Create project service account
func (a *OrganizationApi) CreateProjectsServiceAccount(projectId string, body sdktypes.OpenAiProjectServiceAccountCreateRequest) (sdktypes.OpenAiProjectServiceAccount, error) {
    raw, err := a.client.Post(AiApiPath(fmt.Sprintf("/organization/projects/%s/service_accounts", SerializePathParameter(projectId, PathParameterSpec{Name: "project_id", Style: "simple", Explode: false}))), body, nil, nil, "application/json")
    if err != nil {
        var zero sdktypes.OpenAiProjectServiceAccount
        return zero, err
    }
    return decodeResult[sdktypes.OpenAiProjectServiceAccount](raw)
}

// Delete project service account
func (a *OrganizationApi) DeleteProjectsServiceAccounts(projectId string, serviceAccountId string) (sdktypes.DeleteResult, error) {
    raw, err := a.client.Delete(AiApiPath(fmt.Sprintf("/organization/projects/%s/service_accounts/%s", SerializePathParameter(projectId, PathParameterSpec{Name: "project_id", Style: "simple", Explode: false}), SerializePathParameter(serviceAccountId, PathParameterSpec{Name: "service_account_id", Style: "simple", Explode: false}))), nil, nil)
    if err != nil {
        var zero sdktypes.DeleteResult
        return zero, err
    }
    return decodeResult[sdktypes.DeleteResult](raw)
}

// List project users
func (a *OrganizationApi) ListProjectsUsers(projectId string, limit *int, order *string, after *string, before *string) (sdktypes.OpenAiProjectUserList, error) {
    query := BuildQueryString([]QueryParameterSpec{
        {Name: "page_size", Value: func() interface{} { if limit == nil { return nil }; return *limit }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "order", Value: func() interface{} { if order == nil { return nil }; return *order }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "after", Value: func() interface{} { if after == nil { return nil }; return *after }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "before", Value: func() interface{} { if before == nil { return nil }; return *before }(), Style: "form", Explode: true, AllowReserved: false},
    })
    raw, err := a.client.Get(AppendQueryString(AiApiPath(fmt.Sprintf("/organization/projects/%s/users", SerializePathParameter(projectId, PathParameterSpec{Name: "project_id", Style: "simple", Explode: false}))), query), nil, nil)
    if err != nil {
        var zero sdktypes.OpenAiProjectUserList
        return zero, err
    }
    return decodeResult[sdktypes.OpenAiProjectUserList](raw)
}

// Create project user
func (a *OrganizationApi) CreateProjectsUser(projectId string, body sdktypes.OpenAiProjectUserCreateRequest) (sdktypes.OpenAiProjectUser, error) {
    raw, err := a.client.Post(AiApiPath(fmt.Sprintf("/organization/projects/%s/users", SerializePathParameter(projectId, PathParameterSpec{Name: "project_id", Style: "simple", Explode: false}))), body, nil, nil, "application/json")
    if err != nil {
        var zero sdktypes.OpenAiProjectUser
        return zero, err
    }
    return decodeResult[sdktypes.OpenAiProjectUser](raw)
}

// Delete project user
func (a *OrganizationApi) DeleteProjectsUsers(projectId string, userId string) (sdktypes.DeleteResult, error) {
    raw, err := a.client.Delete(AiApiPath(fmt.Sprintf("/organization/projects/%s/users/%s", SerializePathParameter(projectId, PathParameterSpec{Name: "project_id", Style: "simple", Explode: false}), SerializePathParameter(userId, PathParameterSpec{Name: "user_id", Style: "simple", Explode: false}))), nil, nil)
    if err != nil {
        var zero sdktypes.DeleteResult
        return zero, err
    }
    return decodeResult[sdktypes.DeleteResult](raw)
}

// List organization roles
func (a *OrganizationApi) ListRoles(limit *int, order *string, after *string, before *string) (sdktypes.OpenAiRoleList, error) {
    query := BuildQueryString([]QueryParameterSpec{
        {Name: "page_size", Value: func() interface{} { if limit == nil { return nil }; return *limit }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "order", Value: func() interface{} { if order == nil { return nil }; return *order }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "after", Value: func() interface{} { if after == nil { return nil }; return *after }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "before", Value: func() interface{} { if before == nil { return nil }; return *before }(), Style: "form", Explode: true, AllowReserved: false},
    })
    raw, err := a.client.Get(AppendQueryString(AiApiPath("/organization/roles"), query), nil, nil)
    if err != nil {
        var zero sdktypes.OpenAiRoleList
        return zero, err
    }
    return decodeResult[sdktypes.OpenAiRoleList](raw)
}

// Create organization role
func (a *OrganizationApi) CreateRole(body sdktypes.OpenAiRoleCreateRequest) (sdktypes.OpenAiRole, error) {
    raw, err := a.client.Post(AiApiPath("/organization/roles"), body, nil, nil, "application/json")
    if err != nil {
        var zero sdktypes.OpenAiRole
        return zero, err
    }
    return decodeResult[sdktypes.OpenAiRole](raw)
}

// Delete organization role
func (a *OrganizationApi) DeleteRoles(roleId string) (sdktypes.DeleteResult, error) {
    raw, err := a.client.Delete(AiApiPath(fmt.Sprintf("/organization/roles/%s", SerializePathParameter(roleId, PathParameterSpec{Name: "role_id", Style: "simple", Explode: false}))), nil, nil)
    if err != nil {
        var zero sdktypes.DeleteResult
        return zero, err
    }
    return decodeResult[sdktypes.DeleteResult](raw)
}

// Get audio speech usage
func (a *OrganizationApi) ListUsageAudioSpeeches(startTime *int, endTime *int, bucketWidth *string, projectIds []string, userIds []string, apiKeyIds []string, models []string, groupBy []string, limit *int, page *string) (sdktypes.OpenAiOrganizationUsageList, error) {
    query := BuildQueryString([]QueryParameterSpec{
        {Name: "start_time", Value: func() interface{} { if startTime == nil { return nil }; return *startTime }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "end_time", Value: func() interface{} { if endTime == nil { return nil }; return *endTime }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "bucket_width", Value: func() interface{} { if bucketWidth == nil { return nil }; return *bucketWidth }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "project_ids", Value: func() interface{} { if projectIds == nil { return nil }; return *projectIds }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "user_ids", Value: func() interface{} { if userIds == nil { return nil }; return *userIds }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "api_key_ids", Value: func() interface{} { if apiKeyIds == nil { return nil }; return *apiKeyIds }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "models", Value: func() interface{} { if models == nil { return nil }; return *models }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "group_by", Value: func() interface{} { if groupBy == nil { return nil }; return *groupBy }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "limit", Value: func() interface{} { if limit == nil { return nil }; return *limit }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "page", Value: func() interface{} { if page == nil { return nil }; return *page }(), Style: "form", Explode: true, AllowReserved: false},
    })
    raw, err := a.client.Get(AppendQueryString(AiApiPath("/organization/usage/audio_speeches"), query), nil, nil)
    if err != nil {
        var zero sdktypes.OpenAiOrganizationUsageList
        return zero, err
    }
    return decodeResult[sdktypes.OpenAiOrganizationUsageList](raw)
}

// Get audio transcription usage
func (a *OrganizationApi) ListUsageAudioTranscriptions(startTime *int, endTime *int, bucketWidth *string, projectIds []string, userIds []string, apiKeyIds []string, models []string, groupBy []string, limit *int, page *string) (sdktypes.OpenAiOrganizationUsageList, error) {
    query := BuildQueryString([]QueryParameterSpec{
        {Name: "start_time", Value: func() interface{} { if startTime == nil { return nil }; return *startTime }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "end_time", Value: func() interface{} { if endTime == nil { return nil }; return *endTime }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "bucket_width", Value: func() interface{} { if bucketWidth == nil { return nil }; return *bucketWidth }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "project_ids", Value: func() interface{} { if projectIds == nil { return nil }; return *projectIds }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "user_ids", Value: func() interface{} { if userIds == nil { return nil }; return *userIds }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "api_key_ids", Value: func() interface{} { if apiKeyIds == nil { return nil }; return *apiKeyIds }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "models", Value: func() interface{} { if models == nil { return nil }; return *models }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "group_by", Value: func() interface{} { if groupBy == nil { return nil }; return *groupBy }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "limit", Value: func() interface{} { if limit == nil { return nil }; return *limit }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "page", Value: func() interface{} { if page == nil { return nil }; return *page }(), Style: "form", Explode: true, AllowReserved: false},
    })
    raw, err := a.client.Get(AppendQueryString(AiApiPath("/organization/usage/audio_transcriptions"), query), nil, nil)
    if err != nil {
        var zero sdktypes.OpenAiOrganizationUsageList
        return zero, err
    }
    return decodeResult[sdktypes.OpenAiOrganizationUsageList](raw)
}

// Get code interpreter session usage
func (a *OrganizationApi) ListUsageCodeInterpreterSessions(startTime *int, endTime *int, bucketWidth *string, projectIds []string, userIds []string, apiKeyIds []string, models []string, groupBy []string, limit *int, page *string) (sdktypes.OpenAiOrganizationUsageList, error) {
    query := BuildQueryString([]QueryParameterSpec{
        {Name: "start_time", Value: func() interface{} { if startTime == nil { return nil }; return *startTime }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "end_time", Value: func() interface{} { if endTime == nil { return nil }; return *endTime }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "bucket_width", Value: func() interface{} { if bucketWidth == nil { return nil }; return *bucketWidth }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "project_ids", Value: func() interface{} { if projectIds == nil { return nil }; return *projectIds }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "user_ids", Value: func() interface{} { if userIds == nil { return nil }; return *userIds }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "api_key_ids", Value: func() interface{} { if apiKeyIds == nil { return nil }; return *apiKeyIds }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "models", Value: func() interface{} { if models == nil { return nil }; return *models }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "group_by", Value: func() interface{} { if groupBy == nil { return nil }; return *groupBy }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "limit", Value: func() interface{} { if limit == nil { return nil }; return *limit }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "page", Value: func() interface{} { if page == nil { return nil }; return *page }(), Style: "form", Explode: true, AllowReserved: false},
    })
    raw, err := a.client.Get(AppendQueryString(AiApiPath("/organization/usage/code_interpreter_sessions"), query), nil, nil)
    if err != nil {
        var zero sdktypes.OpenAiOrganizationUsageList
        return zero, err
    }
    return decodeResult[sdktypes.OpenAiOrganizationUsageList](raw)
}

// Get completions usage
func (a *OrganizationApi) ListUsageCompletions(startTime *int, endTime *int, bucketWidth *string, projectIds []string, userIds []string, apiKeyIds []string, models []string, groupBy []string, limit *int, page *string) (sdktypes.OpenAiOrganizationUsageList, error) {
    query := BuildQueryString([]QueryParameterSpec{
        {Name: "start_time", Value: func() interface{} { if startTime == nil { return nil }; return *startTime }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "end_time", Value: func() interface{} { if endTime == nil { return nil }; return *endTime }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "bucket_width", Value: func() interface{} { if bucketWidth == nil { return nil }; return *bucketWidth }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "project_ids", Value: func() interface{} { if projectIds == nil { return nil }; return *projectIds }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "user_ids", Value: func() interface{} { if userIds == nil { return nil }; return *userIds }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "api_key_ids", Value: func() interface{} { if apiKeyIds == nil { return nil }; return *apiKeyIds }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "models", Value: func() interface{} { if models == nil { return nil }; return *models }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "group_by", Value: func() interface{} { if groupBy == nil { return nil }; return *groupBy }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "limit", Value: func() interface{} { if limit == nil { return nil }; return *limit }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "page", Value: func() interface{} { if page == nil { return nil }; return *page }(), Style: "form", Explode: true, AllowReserved: false},
    })
    raw, err := a.client.Get(AppendQueryString(AiApiPath("/organization/usage/completions"), query), nil, nil)
    if err != nil {
        var zero sdktypes.OpenAiOrganizationUsageList
        return zero, err
    }
    return decodeResult[sdktypes.OpenAiOrganizationUsageList](raw)
}

// Get embeddings usage
func (a *OrganizationApi) ListUsageEmbeddings(startTime *int, endTime *int, bucketWidth *string, projectIds []string, userIds []string, apiKeyIds []string, models []string, groupBy []string, limit *int, page *string) (sdktypes.OpenAiOrganizationUsageList, error) {
    query := BuildQueryString([]QueryParameterSpec{
        {Name: "start_time", Value: func() interface{} { if startTime == nil { return nil }; return *startTime }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "end_time", Value: func() interface{} { if endTime == nil { return nil }; return *endTime }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "bucket_width", Value: func() interface{} { if bucketWidth == nil { return nil }; return *bucketWidth }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "project_ids", Value: func() interface{} { if projectIds == nil { return nil }; return *projectIds }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "user_ids", Value: func() interface{} { if userIds == nil { return nil }; return *userIds }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "api_key_ids", Value: func() interface{} { if apiKeyIds == nil { return nil }; return *apiKeyIds }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "models", Value: func() interface{} { if models == nil { return nil }; return *models }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "group_by", Value: func() interface{} { if groupBy == nil { return nil }; return *groupBy }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "limit", Value: func() interface{} { if limit == nil { return nil }; return *limit }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "page", Value: func() interface{} { if page == nil { return nil }; return *page }(), Style: "form", Explode: true, AllowReserved: false},
    })
    raw, err := a.client.Get(AppendQueryString(AiApiPath("/organization/usage/embeddings"), query), nil, nil)
    if err != nil {
        var zero sdktypes.OpenAiOrganizationUsageList
        return zero, err
    }
    return decodeResult[sdktypes.OpenAiOrganizationUsageList](raw)
}

// Get image usage
func (a *OrganizationApi) ListUsageImages(startTime *int, endTime *int, bucketWidth *string, projectIds []string, userIds []string, apiKeyIds []string, models []string, groupBy []string, limit *int, page *string) (sdktypes.OpenAiOrganizationUsageList, error) {
    query := BuildQueryString([]QueryParameterSpec{
        {Name: "start_time", Value: func() interface{} { if startTime == nil { return nil }; return *startTime }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "end_time", Value: func() interface{} { if endTime == nil { return nil }; return *endTime }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "bucket_width", Value: func() interface{} { if bucketWidth == nil { return nil }; return *bucketWidth }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "project_ids", Value: func() interface{} { if projectIds == nil { return nil }; return *projectIds }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "user_ids", Value: func() interface{} { if userIds == nil { return nil }; return *userIds }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "api_key_ids", Value: func() interface{} { if apiKeyIds == nil { return nil }; return *apiKeyIds }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "models", Value: func() interface{} { if models == nil { return nil }; return *models }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "group_by", Value: func() interface{} { if groupBy == nil { return nil }; return *groupBy }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "limit", Value: func() interface{} { if limit == nil { return nil }; return *limit }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "page", Value: func() interface{} { if page == nil { return nil }; return *page }(), Style: "form", Explode: true, AllowReserved: false},
    })
    raw, err := a.client.Get(AppendQueryString(AiApiPath("/organization/usage/images"), query), nil, nil)
    if err != nil {
        var zero sdktypes.OpenAiOrganizationUsageList
        return zero, err
    }
    return decodeResult[sdktypes.OpenAiOrganizationUsageList](raw)
}

// Get moderation usage
func (a *OrganizationApi) ListUsageModerations(startTime *int, endTime *int, bucketWidth *string, projectIds []string, userIds []string, apiKeyIds []string, models []string, groupBy []string, limit *int, page *string) (sdktypes.OpenAiOrganizationUsageList, error) {
    query := BuildQueryString([]QueryParameterSpec{
        {Name: "start_time", Value: func() interface{} { if startTime == nil { return nil }; return *startTime }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "end_time", Value: func() interface{} { if endTime == nil { return nil }; return *endTime }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "bucket_width", Value: func() interface{} { if bucketWidth == nil { return nil }; return *bucketWidth }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "project_ids", Value: func() interface{} { if projectIds == nil { return nil }; return *projectIds }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "user_ids", Value: func() interface{} { if userIds == nil { return nil }; return *userIds }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "api_key_ids", Value: func() interface{} { if apiKeyIds == nil { return nil }; return *apiKeyIds }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "models", Value: func() interface{} { if models == nil { return nil }; return *models }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "group_by", Value: func() interface{} { if groupBy == nil { return nil }; return *groupBy }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "limit", Value: func() interface{} { if limit == nil { return nil }; return *limit }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "page", Value: func() interface{} { if page == nil { return nil }; return *page }(), Style: "form", Explode: true, AllowReserved: false},
    })
    raw, err := a.client.Get(AppendQueryString(AiApiPath("/organization/usage/moderations"), query), nil, nil)
    if err != nil {
        var zero sdktypes.OpenAiOrganizationUsageList
        return zero, err
    }
    return decodeResult[sdktypes.OpenAiOrganizationUsageList](raw)
}

// Get vector store usage
func (a *OrganizationApi) ListUsageVectorStores(startTime *int, endTime *int, bucketWidth *string, projectIds []string, userIds []string, apiKeyIds []string, models []string, groupBy []string, limit *int, page *string) (sdktypes.OpenAiOrganizationUsageList, error) {
    query := BuildQueryString([]QueryParameterSpec{
        {Name: "start_time", Value: func() interface{} { if startTime == nil { return nil }; return *startTime }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "end_time", Value: func() interface{} { if endTime == nil { return nil }; return *endTime }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "bucket_width", Value: func() interface{} { if bucketWidth == nil { return nil }; return *bucketWidth }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "project_ids", Value: func() interface{} { if projectIds == nil { return nil }; return *projectIds }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "user_ids", Value: func() interface{} { if userIds == nil { return nil }; return *userIds }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "api_key_ids", Value: func() interface{} { if apiKeyIds == nil { return nil }; return *apiKeyIds }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "models", Value: func() interface{} { if models == nil { return nil }; return *models }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "group_by", Value: func() interface{} { if groupBy == nil { return nil }; return *groupBy }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "limit", Value: func() interface{} { if limit == nil { return nil }; return *limit }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "page", Value: func() interface{} { if page == nil { return nil }; return *page }(), Style: "form", Explode: true, AllowReserved: false},
    })
    raw, err := a.client.Get(AppendQueryString(AiApiPath("/organization/usage/vector_stores"), query), nil, nil)
    if err != nil {
        var zero sdktypes.OpenAiOrganizationUsageList
        return zero, err
    }
    return decodeResult[sdktypes.OpenAiOrganizationUsageList](raw)
}

// List organization users
func (a *OrganizationApi) ListUsers(limit *int, order *string, after *string, before *string) (sdktypes.OpenAiOrganizationUserList, error) {
    query := BuildQueryString([]QueryParameterSpec{
        {Name: "page_size", Value: func() interface{} { if limit == nil { return nil }; return *limit }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "order", Value: func() interface{} { if order == nil { return nil }; return *order }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "after", Value: func() interface{} { if after == nil { return nil }; return *after }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "before", Value: func() interface{} { if before == nil { return nil }; return *before }(), Style: "form", Explode: true, AllowReserved: false},
    })
    raw, err := a.client.Get(AppendQueryString(AiApiPath("/organization/users"), query), nil, nil)
    if err != nil {
        var zero sdktypes.OpenAiOrganizationUserList
        return zero, err
    }
    return decodeResult[sdktypes.OpenAiOrganizationUserList](raw)
}

// Delete organization user
func (a *OrganizationApi) DeleteUsers(userId string) (sdktypes.DeleteResult, error) {
    raw, err := a.client.Delete(AiApiPath(fmt.Sprintf("/organization/users/%s", SerializePathParameter(userId, PathParameterSpec{Name: "user_id", Style: "simple", Explode: false}))), nil, nil)
    if err != nil {
        var zero sdktypes.DeleteResult
        return zero, err
    }
    return decodeResult[sdktypes.DeleteResult](raw)
}

// Modify organization user
func (a *OrganizationApi) CreateUser(userId string, body sdktypes.OpenAiOrganizationUserUpdateRequest) (sdktypes.OpenAiOrganizationUser, error) {
    raw, err := a.client.Post(AiApiPath(fmt.Sprintf("/organization/users/%s", SerializePathParameter(userId, PathParameterSpec{Name: "user_id", Style: "simple", Explode: false}))), body, nil, nil, "application/json")
    if err != nil {
        var zero sdktypes.OpenAiOrganizationUser
        return zero, err
    }
    return decodeResult[sdktypes.OpenAiOrganizationUser](raw)
}

// List organization user roles
func (a *OrganizationApi) ListUsersRoles(userId string, limit *int, order *string, after *string, before *string) (sdktypes.OpenAiRoleAssignmentList, error) {
    query := BuildQueryString([]QueryParameterSpec{
        {Name: "page_size", Value: func() interface{} { if limit == nil { return nil }; return *limit }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "order", Value: func() interface{} { if order == nil { return nil }; return *order }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "after", Value: func() interface{} { if after == nil { return nil }; return *after }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "before", Value: func() interface{} { if before == nil { return nil }; return *before }(), Style: "form", Explode: true, AllowReserved: false},
    })
    raw, err := a.client.Get(AppendQueryString(AiApiPath(fmt.Sprintf("/organization/users/%s/roles", SerializePathParameter(userId, PathParameterSpec{Name: "user_id", Style: "simple", Explode: false}))), query), nil, nil)
    if err != nil {
        var zero sdktypes.OpenAiRoleAssignmentList
        return zero, err
    }
    return decodeResult[sdktypes.OpenAiRoleAssignmentList](raw)
}

// Create organization user role
func (a *OrganizationApi) CreateUsersRole(userId string, body sdktypes.OpenAiRoleAssignmentCreateRequest) (sdktypes.OpenAiRoleAssignment, error) {
    raw, err := a.client.Post(AiApiPath(fmt.Sprintf("/organization/users/%s/roles", SerializePathParameter(userId, PathParameterSpec{Name: "user_id", Style: "simple", Explode: false}))), body, nil, nil, "application/json")
    if err != nil {
        var zero sdktypes.OpenAiRoleAssignment
        return zero, err
    }
    return decodeResult[sdktypes.OpenAiRoleAssignment](raw)
}

// Delete organization user role
func (a *OrganizationApi) DeleteUsersRoles(userId string, roleId string) (sdktypes.DeleteResult, error) {
    raw, err := a.client.Delete(AiApiPath(fmt.Sprintf("/organization/users/%s/roles/%s", SerializePathParameter(userId, PathParameterSpec{Name: "user_id", Style: "simple", Explode: false}), SerializePathParameter(roleId, PathParameterSpec{Name: "role_id", Style: "simple", Explode: false}))), nil, nil)
    if err != nil {
        var zero sdktypes.DeleteResult
        return zero, err
    }
    return decodeResult[sdktypes.DeleteResult](raw)
}

type PathParameterSpec struct {
    Name    string
    Style   string
    Explode bool
}

func SerializePathParameter(value interface{}, spec PathParameterSpec) string {
    if value == nil {
        return ""
    }
    style := spec.Style
    if style == "" {
        style = "simple"
    }

    switch typed := value.(type) {
    case []string:
        return SerializePathArray(spec.Name, stringSliceToInterface(typed), style, spec.Explode)
    case []int:
        return SerializePathArray(spec.Name, intSliceToInterface(typed), style, spec.Explode)
    case []interface{}:
        return SerializePathArray(spec.Name, typed, style, spec.Explode)
    case map[string]string:
        return SerializePathObject(spec.Name, stringMapToInterface(typed), style, spec.Explode)
    case map[string]int:
        return SerializePathObject(spec.Name, intMapToInterface(typed), style, spec.Explode)
    case map[string]interface{}:
        return SerializePathObject(spec.Name, typed, style, spec.Explode)
    default:
        return PathPrefix(spec.Name, style) + url.PathEscape(fmt.Sprint(value))
    }
}

func SerializePathArray(name string, values []interface{}, style string, explode bool) string {
    serialized := make([]string, 0, len(values))
    for _, item := range values {
        if item != nil {
            serialized = append(serialized, url.PathEscape(fmt.Sprint(item)))
        }
    }
    if len(serialized) == 0 {
        return PathPrefix(name, style)
    }
    if style == "matrix" {
        if explode {
            parts := make([]string, 0, len(serialized))
            for _, item := range serialized {
                parts = append(parts, ";"+name+"="+item)
            }
            return strings.Join(parts, "")
        }
        return ";" + name + "=" + strings.Join(serialized, ",")
    }
    separator := ","
    if explode {
        separator = "."
    }
    return PathPrefix(name, style) + strings.Join(serialized, separator)
}

func SerializePathObject(name string, values map[string]interface{}, style string, explode bool) string {
    entries := make([]string, 0, len(values)*2)
    exploded := make([]string, 0, len(values))
    for key, value := range values {
        if value == nil {
            continue
        }
        escapedKey := url.PathEscape(key)
        escapedValue := url.PathEscape(fmt.Sprint(value))
        if explode {
            if style == "matrix" {
                exploded = append(exploded, ";"+escapedKey+"="+escapedValue)
            } else {
                exploded = append(exploded, escapedKey+"="+escapedValue)
            }
        } else {
            entries = append(entries, escapedKey, escapedValue)
        }
    }
    if style == "matrix" {
        if explode {
            return strings.Join(exploded, "")
        }
        return ";" + name + "=" + strings.Join(entries, ",")
    }
    if explode {
        separator := ","
        if style == "label" {
            separator = "."
        }
        return PathPrefix(name, style) + strings.Join(exploded, separator)
    }
    return PathPrefix(name, style) + strings.Join(entries, ",")
}

func PathPrefix(name string, style string) string {
    if style == "label" {
        return "."
    }
    if style == "matrix" {
        return ";" + name
    }
    return ""
}
type QueryParameterSpec struct {
    Name          string
    Value         interface{}
    Style         string
    Explode       bool
    AllowReserved bool
    ContentType   string
}

func BuildQueryString(parameters []QueryParameterSpec) string {
    pairs := make([]string, 0)
    for _, parameter := range parameters {
        AppendSerializedParameter(&pairs, parameter)
    }
    return strings.Join(pairs, "&")
}

func AppendSerializedParameter(pairs *[]string, parameter QueryParameterSpec) {
    if parameter.Value == nil {
        return
    }

    if parameter.ContentType != "" {
        encoded, _ := json.Marshal(parameter.Value)
        *pairs = append(*pairs, url.QueryEscape(parameter.Name)+"="+EncodeQueryValue(string(encoded), parameter.AllowReserved))
        return
    }

    style := parameter.Style
    if style == "" {
        style = "form"
    }

    switch value := parameter.Value.(type) {
    case []string:
        AppendArrayParameter(pairs, parameter.Name, stringSliceToInterface(value), style, parameter.Explode, parameter.AllowReserved)
    case []int:
        AppendArrayParameter(pairs, parameter.Name, intSliceToInterface(value), style, parameter.Explode, parameter.AllowReserved)
    case []interface{}:
        AppendArrayParameter(pairs, parameter.Name, value, style, parameter.Explode, parameter.AllowReserved)
    case map[string]int:
        AppendObjectParameter(pairs, parameter.Name, intMapToInterface(value), style, parameter.Explode, parameter.AllowReserved)
    case map[string]string:
        AppendObjectParameter(pairs, parameter.Name, stringMapToInterface(value), style, parameter.Explode, parameter.AllowReserved)
    case map[string]interface{}:
        if style == "deepObject" {
            AppendDeepObjectParameter(pairs, parameter.Name, value, parameter.AllowReserved)
        } else {
            AppendObjectParameter(pairs, parameter.Name, value, style, parameter.Explode, parameter.AllowReserved)
        }
    default:
        *pairs = append(*pairs, url.QueryEscape(parameter.Name)+"="+EncodeQueryValue(fmt.Sprint(value), parameter.AllowReserved))
    }
}

func AppendArrayParameter(pairs *[]string, name string, value []interface{}, style string, explode bool, allowReserved bool) {
    values := make([]string, 0, len(value))
    for _, item := range value {
        if item != nil {
            values = append(values, fmt.Sprint(item))
        }
    }
    if len(values) == 0 {
        return
    }
    if style == "form" && explode {
        for _, item := range values {
            *pairs = append(*pairs, url.QueryEscape(name)+"="+EncodeQueryValue(item, allowReserved))
        }
        return
    }
    *pairs = append(*pairs, url.QueryEscape(name)+"="+EncodeQueryValue(strings.Join(values, ","), allowReserved))
}

func AppendObjectParameter(pairs *[]string, name string, value map[string]interface{}, style string, explode bool, allowReserved bool) {
    entries := make([]string, 0, len(value)*2)
    for key, item := range value {
        if item == nil {
            continue
        }
        if style == "form" && explode {
            *pairs = append(*pairs, url.QueryEscape(key)+"="+EncodeQueryValue(fmt.Sprint(item), allowReserved))
            continue
        }
        entries = append(entries, key, fmt.Sprint(item))
    }
    if len(entries) == 0 {
        return
    }
    if !(style == "form" && explode) {
        *pairs = append(*pairs, url.QueryEscape(name)+"="+EncodeQueryValue(strings.Join(entries, ","), allowReserved))
    }
}

func AppendDeepObjectParameter(pairs *[]string, name string, value map[string]interface{}, allowReserved bool) {
    for key, item := range value {
        if item == nil {
            continue
        }
        *pairs = append(*pairs, url.QueryEscape(fmt.Sprintf("%s[%s]", name, key))+"="+EncodeQueryValue(fmt.Sprint(item), allowReserved))
    }
}

func EncodeQueryValue(value string, allowReserved bool) string {
    encoded := url.QueryEscape(value)
    if !allowReserved {
        return encoded
    }
    replacements := map[string]string{
        "%3A": ":", "%2F": "/", "%3F": "?", "%23": "#",
        "%5B": "[", "%5D": "]", "%40": "@", "%21": "!",
        "%24": "$", "%26": "&", "%27": "'", "%28": "(",
        "%29": ")", "%2A": "*", "%2B": "+", "%2C": ",",
        "%3B": ";", "%3D": "=",
    }
    for escaped, reserved := range replacements {
        encoded = strings.ReplaceAll(encoded, escaped, reserved)
    }
    return encoded
}



func stringSliceToInterface(values []string) []interface{} {
    result := make([]interface{}, 0, len(values))
    for _, value := range values {
        result = append(result, value)
    }
    return result
}

func intSliceToInterface(values []int) []interface{} {
    result := make([]interface{}, 0, len(values))
    for _, value := range values {
        result = append(result, value)
    }
    return result
}

func stringMapToInterface(values map[string]string) map[string]interface{} {
    result := make(map[string]interface{}, len(values))
    for key, value := range values {
        result[key] = value
    }
    return result
}

func intMapToInterface(values map[string]int) map[string]interface{} {
    result := make(map[string]interface{}, len(values))
    for key, value := range values {
        result[key] = value
    }
    return result
}
