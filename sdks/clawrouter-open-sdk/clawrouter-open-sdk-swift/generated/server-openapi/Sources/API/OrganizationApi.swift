import Foundation

public class OrganizationApi {
    private let client: HttpClient

    public init(client: HttpClient) {
        self.client = client
    }

    /// List organization admin API keys
    public func listAdminApiKeys(limit: Int? = nil, order: String? = nil, after: String? = nil, before: String? = nil) async throws -> OpenAiOrganizationAdminApiKeyList? {
        let query = buildQueryString([
            QueryParameterSpec(name: "page_size", value: limit, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "order", value: order, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "after", value: after, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "before", value: before, style: "form", explode: true, allowReserved: false, contentType: nil)
        ])
        return try await client.get(ApiPaths.appendQueryString(ApiPaths.aiPath("/organization/admin_api_keys"), query), responseType: OpenAiOrganizationAdminApiKeyList.self)
    }

    /// Create organization admin API key
    public func createAdminApiKey(body: OpenAiOrganizationAdminApiKeyCreateRequest) async throws -> OpenAiOrganizationAdminApiKey? {
        return try await client.post(ApiPaths.aiPath("/organization/admin_api_keys"), body: body, params: nil, headers: nil, contentType: "application/json", responseType: OpenAiOrganizationAdminApiKey.self)
    }

    /// Delete organization admin API key
    public func deleteAdminApiKeys(keyId: String) async throws -> DeleteResult? {
        return try await client.delete(ApiPaths.aiPath("/organization/admin_api_keys/\(serializePathParameter(keyId, PathParameterSpec(name: "key_id", style: "simple", explode: false)))"), responseType: DeleteResult.self)
    }

    /// List organization audit logs
    public func listAuditLogs(effectiveAtGte: Int? = nil, effectiveAtLte: Int? = nil, projectIds: [String]? = nil, eventTypes: [String]? = nil, actorIds: [String]? = nil, actorEmails: [String]? = nil, resourceIds: [String]? = nil, limit: Int? = nil, after: String? = nil, before: String? = nil) async throws -> OpenAiOrganizationAuditLogList? {
        let query = buildQueryString([
            QueryParameterSpec(name: "effective_at[gte]", value: effectiveAtGte, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "effective_at[lte]", value: effectiveAtLte, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "project_ids[]", value: projectIds, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "event_types[]", value: eventTypes, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "actor_ids[]", value: actorIds, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "actor_emails[]", value: actorEmails, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "resource_ids[]", value: resourceIds, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "page_size", value: limit, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "after", value: after, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "before", value: before, style: "form", explode: true, allowReserved: false, contentType: nil)
        ])
        return try await client.get(ApiPaths.appendQueryString(ApiPaths.aiPath("/organization/audit_logs"), query), responseType: OpenAiOrganizationAuditLogList.self)
    }

    /// List organization certificates
    public func listCertificates(limit: Int? = nil, order: String? = nil, after: String? = nil, before: String? = nil) async throws -> OpenAiCertificateList? {
        let query = buildQueryString([
            QueryParameterSpec(name: "page_size", value: limit, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "order", value: order, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "after", value: after, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "before", value: before, style: "form", explode: true, allowReserved: false, contentType: nil)
        ])
        return try await client.get(ApiPaths.appendQueryString(ApiPaths.aiPath("/organization/certificates"), query), responseType: OpenAiCertificateList.self)
    }

    /// Upload organization certificate
    public func createCertificate(body: OpenAiCertificateUploadMultipartRequest) async throws -> OpenAiCertificate? {
        return try await client.post(ApiPaths.aiPath("/organization/certificates"), body: body, params: nil, headers: nil, contentType: "multipart/form-data", responseType: OpenAiCertificate.self)
    }

    /// Activate organization certificates
    public func createCertificatesActivate(body: OpenAiCertificateActivationRequest) async throws -> OpenAiCertificateList? {
        return try await client.post(ApiPaths.aiPath("/organization/certificates/activate"), body: body, params: nil, headers: nil, contentType: "application/json", responseType: OpenAiCertificateList.self)
    }

    /// Deactivate organization certificates
    public func createCertificatesDeactivate(body: OpenAiCertificateActivationRequest) async throws -> OpenAiCertificateList? {
        return try await client.post(ApiPaths.aiPath("/organization/certificates/deactivate"), body: body, params: nil, headers: nil, contentType: "application/json", responseType: OpenAiCertificateList.self)
    }

    /// Delete organization certificate
    public func deleteCertificates(certificateId: String) async throws -> DeleteResult? {
        return try await client.delete(ApiPaths.aiPath("/organization/certificates/\(serializePathParameter(certificateId, PathParameterSpec(name: "certificate_id", style: "simple", explode: false)))"), responseType: DeleteResult.self)
    }

    /// Get organization costs
    public func listCosts(startTime: Int? = nil, endTime: Int? = nil, bucketWidth: String? = nil, projectIds: [String]? = nil, userIds: [String]? = nil, apiKeyIds: [String]? = nil, models: [String]? = nil, groupBy: [String]? = nil, limit: Int? = nil, page: String? = nil) async throws -> OpenAiOrganizationCostList? {
        let query = buildQueryString([
            QueryParameterSpec(name: "start_time", value: startTime, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "end_time", value: endTime, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "bucket_width", value: bucketWidth, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "project_ids", value: projectIds, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "user_ids", value: userIds, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "api_key_ids", value: apiKeyIds, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "models", value: models, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "group_by", value: groupBy, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "page_size", value: limit, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "page", value: page, style: "form", explode: true, allowReserved: false, contentType: nil)
        ])
        return try await client.get(ApiPaths.appendQueryString(ApiPaths.aiPath("/organization/costs"), query), responseType: OpenAiOrganizationCostList.self)
    }

    /// List organization groups
    public func listGroups(limit: Int? = nil, order: String? = nil, after: String? = nil, before: String? = nil) async throws -> OpenAiOrganizationGroupList? {
        let query = buildQueryString([
            QueryParameterSpec(name: "page_size", value: limit, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "order", value: order, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "after", value: after, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "before", value: before, style: "form", explode: true, allowReserved: false, contentType: nil)
        ])
        return try await client.get(ApiPaths.appendQueryString(ApiPaths.aiPath("/organization/groups"), query), responseType: OpenAiOrganizationGroupList.self)
    }

    /// Create organization group
    public func createGroup(body: OpenAiOrganizationGroupCreateRequest) async throws -> OpenAiOrganizationGroup? {
        return try await client.post(ApiPaths.aiPath("/organization/groups"), body: body, params: nil, headers: nil, contentType: "application/json", responseType: OpenAiOrganizationGroup.self)
    }

    /// Delete organization group
    public func deleteGroups(groupId: String) async throws -> DeleteResult? {
        return try await client.delete(ApiPaths.aiPath("/organization/groups/\(serializePathParameter(groupId, PathParameterSpec(name: "group_id", style: "simple", explode: false)))"), responseType: DeleteResult.self)
    }

    /// List organization group roles
    public func listGroupsRoles(groupId: String, limit: Int? = nil, order: String? = nil, after: String? = nil, before: String? = nil) async throws -> OpenAiRoleAssignmentList? {
        let query = buildQueryString([
            QueryParameterSpec(name: "page_size", value: limit, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "order", value: order, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "after", value: after, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "before", value: before, style: "form", explode: true, allowReserved: false, contentType: nil)
        ])
        return try await client.get(ApiPaths.appendQueryString(ApiPaths.aiPath("/organization/groups/\(serializePathParameter(groupId, PathParameterSpec(name: "group_id", style: "simple", explode: false)))/roles"), query), responseType: OpenAiRoleAssignmentList.self)
    }

    /// Create organization group role
    public func createGroupsRole(groupId: String, body: OpenAiRoleAssignmentCreateRequest) async throws -> OpenAiRoleAssignment? {
        return try await client.post(ApiPaths.aiPath("/organization/groups/\(serializePathParameter(groupId, PathParameterSpec(name: "group_id", style: "simple", explode: false)))/roles"), body: body, params: nil, headers: nil, contentType: "application/json", responseType: OpenAiRoleAssignment.self)
    }

    /// Delete organization group role
    public func deleteGroupsRoles(groupId: String, roleId: String) async throws -> DeleteResult? {
        return try await client.delete(ApiPaths.aiPath("/organization/groups/\(serializePathParameter(groupId, PathParameterSpec(name: "group_id", style: "simple", explode: false)))/roles/\(serializePathParameter(roleId, PathParameterSpec(name: "role_id", style: "simple", explode: false)))"), responseType: DeleteResult.self)
    }

    /// List organization group users
    public func listGroupsUsers(groupId: String, limit: Int? = nil, order: String? = nil, after: String? = nil, before: String? = nil) async throws -> OpenAiOrganizationUserList? {
        let query = buildQueryString([
            QueryParameterSpec(name: "page_size", value: limit, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "order", value: order, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "after", value: after, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "before", value: before, style: "form", explode: true, allowReserved: false, contentType: nil)
        ])
        return try await client.get(ApiPaths.appendQueryString(ApiPaths.aiPath("/organization/groups/\(serializePathParameter(groupId, PathParameterSpec(name: "group_id", style: "simple", explode: false)))/users"), query), responseType: OpenAiOrganizationUserList.self)
    }

    /// Add organization group user
    public func createGroupsUser(groupId: String, body: OpenAiOrganizationGroupUserCreateRequest) async throws -> OpenAiOrganizationUser? {
        return try await client.post(ApiPaths.aiPath("/organization/groups/\(serializePathParameter(groupId, PathParameterSpec(name: "group_id", style: "simple", explode: false)))/users"), body: body, params: nil, headers: nil, contentType: "application/json", responseType: OpenAiOrganizationUser.self)
    }

    /// Delete organization group user
    public func deleteGroupsUsers(groupId: String, userId: String) async throws -> DeleteResult? {
        return try await client.delete(ApiPaths.aiPath("/organization/groups/\(serializePathParameter(groupId, PathParameterSpec(name: "group_id", style: "simple", explode: false)))/users/\(serializePathParameter(userId, PathParameterSpec(name: "user_id", style: "simple", explode: false)))"), responseType: DeleteResult.self)
    }

    /// List organization invites
    public func listInvites(limit: Int? = nil, order: String? = nil, after: String? = nil, before: String? = nil) async throws -> OpenAiOrganizationInviteList? {
        let query = buildQueryString([
            QueryParameterSpec(name: "page_size", value: limit, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "order", value: order, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "after", value: after, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "before", value: before, style: "form", explode: true, allowReserved: false, contentType: nil)
        ])
        return try await client.get(ApiPaths.appendQueryString(ApiPaths.aiPath("/organization/invites"), query), responseType: OpenAiOrganizationInviteList.self)
    }

    /// Create organization invite
    public func createInvite(body: OpenAiOrganizationInviteCreateRequest) async throws -> OpenAiOrganizationInvite? {
        return try await client.post(ApiPaths.aiPath("/organization/invites"), body: body, params: nil, headers: nil, contentType: "application/json", responseType: OpenAiOrganizationInvite.self)
    }

    /// Delete organization invite
    public func deleteInvites(inviteId: String) async throws -> DeleteResult? {
        return try await client.delete(ApiPaths.aiPath("/organization/invites/\(serializePathParameter(inviteId, PathParameterSpec(name: "invite_id", style: "simple", explode: false)))"), responseType: DeleteResult.self)
    }

    /// List organization projects
    public func listProjects(limit: Int? = nil, order: String? = nil, after: String? = nil, before: String? = nil) async throws -> OpenAiProjectList? {
        let query = buildQueryString([
            QueryParameterSpec(name: "page_size", value: limit, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "order", value: order, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "after", value: after, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "before", value: before, style: "form", explode: true, allowReserved: false, contentType: nil)
        ])
        return try await client.get(ApiPaths.appendQueryString(ApiPaths.aiPath("/organization/projects"), query), responseType: OpenAiProjectList.self)
    }

    /// Create organization project
    public func createProject(body: OpenAiProjectCreateRequest) async throws -> OpenAiProject? {
        return try await client.post(ApiPaths.aiPath("/organization/projects"), body: body, params: nil, headers: nil, contentType: "application/json", responseType: OpenAiProject.self)
    }

    /// List project API keys
    public func listProjectsApiKeys(projectId: String, limit: Int? = nil, order: String? = nil, after: String? = nil, before: String? = nil) async throws -> OpenAiProjectApiKeyList? {
        let query = buildQueryString([
            QueryParameterSpec(name: "page_size", value: limit, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "order", value: order, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "after", value: after, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "before", value: before, style: "form", explode: true, allowReserved: false, contentType: nil)
        ])
        return try await client.get(ApiPaths.appendQueryString(ApiPaths.aiPath("/organization/projects/\(serializePathParameter(projectId, PathParameterSpec(name: "project_id", style: "simple", explode: false)))/api_keys"), query), responseType: OpenAiProjectApiKeyList.self)
    }

    /// Delete project API key
    public func deleteProjectsApiKeys(projectId: String, keyId: String) async throws -> DeleteResult? {
        return try await client.delete(ApiPaths.aiPath("/organization/projects/\(serializePathParameter(projectId, PathParameterSpec(name: "project_id", style: "simple", explode: false)))/api_keys/\(serializePathParameter(keyId, PathParameterSpec(name: "key_id", style: "simple", explode: false)))"), responseType: DeleteResult.self)
    }

    /// Archive organization project
    public func createProjectsArchive(projectId: String) async throws -> OpenAiProject? {
        return try await client.post(ApiPaths.aiPath("/organization/projects/\(serializePathParameter(projectId, PathParameterSpec(name: "project_id", style: "simple", explode: false)))/archive"), body: nil, responseType: OpenAiProject.self)
    }

    /// List project certificates
    public func listProjectsCertificates(projectId: String, limit: Int? = nil, order: String? = nil, after: String? = nil, before: String? = nil) async throws -> OpenAiCertificateList? {
        let query = buildQueryString([
            QueryParameterSpec(name: "page_size", value: limit, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "order", value: order, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "after", value: after, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "before", value: before, style: "form", explode: true, allowReserved: false, contentType: nil)
        ])
        return try await client.get(ApiPaths.appendQueryString(ApiPaths.aiPath("/organization/projects/\(serializePathParameter(projectId, PathParameterSpec(name: "project_id", style: "simple", explode: false)))/certificates"), query), responseType: OpenAiCertificateList.self)
    }

    /// Activate project certificates
    public func createProjectsCertificatesActivate(projectId: String, body: OpenAiCertificateActivationRequest) async throws -> OpenAiCertificateList? {
        return try await client.post(ApiPaths.aiPath("/organization/projects/\(serializePathParameter(projectId, PathParameterSpec(name: "project_id", style: "simple", explode: false)))/certificates/activate"), body: body, params: nil, headers: nil, contentType: "application/json", responseType: OpenAiCertificateList.self)
    }

    /// Deactivate project certificates
    public func createProjectsCertificatesDeactivate(projectId: String, body: OpenAiCertificateActivationRequest) async throws -> OpenAiCertificateList? {
        return try await client.post(ApiPaths.aiPath("/organization/projects/\(serializePathParameter(projectId, PathParameterSpec(name: "project_id", style: "simple", explode: false)))/certificates/deactivate"), body: body, params: nil, headers: nil, contentType: "application/json", responseType: OpenAiCertificateList.self)
    }

    /// List project groups
    public func listProjectsGroups(projectId: String, limit: Int? = nil, order: String? = nil, after: String? = nil, before: String? = nil) async throws -> OpenAiOrganizationGroupList? {
        let query = buildQueryString([
            QueryParameterSpec(name: "page_size", value: limit, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "order", value: order, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "after", value: after, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "before", value: before, style: "form", explode: true, allowReserved: false, contentType: nil)
        ])
        return try await client.get(ApiPaths.appendQueryString(ApiPaths.aiPath("/organization/projects/\(serializePathParameter(projectId, PathParameterSpec(name: "project_id", style: "simple", explode: false)))/groups"), query), responseType: OpenAiOrganizationGroupList.self)
    }

    /// Create project group
    public func createProjectsGroup(projectId: String, body: OpenAiProjectGroupCreateRequest) async throws -> OpenAiOrganizationGroup? {
        return try await client.post(ApiPaths.aiPath("/organization/projects/\(serializePathParameter(projectId, PathParameterSpec(name: "project_id", style: "simple", explode: false)))/groups"), body: body, params: nil, headers: nil, contentType: "application/json", responseType: OpenAiOrganizationGroup.self)
    }

    /// Delete project group
    public func deleteProjectsGroups(projectId: String, groupId: String) async throws -> DeleteResult? {
        return try await client.delete(ApiPaths.aiPath("/organization/projects/\(serializePathParameter(projectId, PathParameterSpec(name: "project_id", style: "simple", explode: false)))/groups/\(serializePathParameter(groupId, PathParameterSpec(name: "group_id", style: "simple", explode: false)))"), responseType: DeleteResult.self)
    }

    /// List project rate limits
    public func listProjectsRateLimits(projectId: String, limit: Int? = nil, order: String? = nil, after: String? = nil, before: String? = nil) async throws -> OpenAiProjectRateLimitList? {
        let query = buildQueryString([
            QueryParameterSpec(name: "page_size", value: limit, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "order", value: order, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "after", value: after, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "before", value: before, style: "form", explode: true, allowReserved: false, contentType: nil)
        ])
        return try await client.get(ApiPaths.appendQueryString(ApiPaths.aiPath("/organization/projects/\(serializePathParameter(projectId, PathParameterSpec(name: "project_id", style: "simple", explode: false)))/rate_limits"), query), responseType: OpenAiProjectRateLimitList.self)
    }

    /// Modify project rate limit
    public func createProjectsRateLimit(projectId: String, rateLimitId: String, body: OpenAiProjectRateLimitUpdateRequest) async throws -> OpenAiProjectRateLimit? {
        return try await client.post(ApiPaths.aiPath("/organization/projects/\(serializePathParameter(projectId, PathParameterSpec(name: "project_id", style: "simple", explode: false)))/rate_limits/\(serializePathParameter(rateLimitId, PathParameterSpec(name: "rate_limit_id", style: "simple", explode: false)))"), body: body, params: nil, headers: nil, contentType: "application/json", responseType: OpenAiProjectRateLimit.self)
    }

    /// List project service accounts
    public func listProjectsServiceAccounts(projectId: String, limit: Int? = nil, order: String? = nil, after: String? = nil, before: String? = nil) async throws -> OpenAiProjectServiceAccountList? {
        let query = buildQueryString([
            QueryParameterSpec(name: "page_size", value: limit, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "order", value: order, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "after", value: after, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "before", value: before, style: "form", explode: true, allowReserved: false, contentType: nil)
        ])
        return try await client.get(ApiPaths.appendQueryString(ApiPaths.aiPath("/organization/projects/\(serializePathParameter(projectId, PathParameterSpec(name: "project_id", style: "simple", explode: false)))/service_accounts"), query), responseType: OpenAiProjectServiceAccountList.self)
    }

    /// Create project service account
    public func createProjectsServiceAccount(projectId: String, body: OpenAiProjectServiceAccountCreateRequest) async throws -> OpenAiProjectServiceAccount? {
        return try await client.post(ApiPaths.aiPath("/organization/projects/\(serializePathParameter(projectId, PathParameterSpec(name: "project_id", style: "simple", explode: false)))/service_accounts"), body: body, params: nil, headers: nil, contentType: "application/json", responseType: OpenAiProjectServiceAccount.self)
    }

    /// Delete project service account
    public func deleteProjectsServiceAccounts(projectId: String, serviceAccountId: String) async throws -> DeleteResult? {
        return try await client.delete(ApiPaths.aiPath("/organization/projects/\(serializePathParameter(projectId, PathParameterSpec(name: "project_id", style: "simple", explode: false)))/service_accounts/\(serializePathParameter(serviceAccountId, PathParameterSpec(name: "service_account_id", style: "simple", explode: false)))"), responseType: DeleteResult.self)
    }

    /// List project users
    public func listProjectsUsers(projectId: String, limit: Int? = nil, order: String? = nil, after: String? = nil, before: String? = nil) async throws -> OpenAiProjectUserList? {
        let query = buildQueryString([
            QueryParameterSpec(name: "page_size", value: limit, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "order", value: order, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "after", value: after, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "before", value: before, style: "form", explode: true, allowReserved: false, contentType: nil)
        ])
        return try await client.get(ApiPaths.appendQueryString(ApiPaths.aiPath("/organization/projects/\(serializePathParameter(projectId, PathParameterSpec(name: "project_id", style: "simple", explode: false)))/users"), query), responseType: OpenAiProjectUserList.self)
    }

    /// Create project user
    public func createProjectsUser(projectId: String, body: OpenAiProjectUserCreateRequest) async throws -> OpenAiProjectUser? {
        return try await client.post(ApiPaths.aiPath("/organization/projects/\(serializePathParameter(projectId, PathParameterSpec(name: "project_id", style: "simple", explode: false)))/users"), body: body, params: nil, headers: nil, contentType: "application/json", responseType: OpenAiProjectUser.self)
    }

    /// Delete project user
    public func deleteProjectsUsers(projectId: String, userId: String) async throws -> DeleteResult? {
        return try await client.delete(ApiPaths.aiPath("/organization/projects/\(serializePathParameter(projectId, PathParameterSpec(name: "project_id", style: "simple", explode: false)))/users/\(serializePathParameter(userId, PathParameterSpec(name: "user_id", style: "simple", explode: false)))"), responseType: DeleteResult.self)
    }

    /// List organization roles
    public func listRoles(limit: Int? = nil, order: String? = nil, after: String? = nil, before: String? = nil) async throws -> OpenAiRoleList? {
        let query = buildQueryString([
            QueryParameterSpec(name: "page_size", value: limit, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "order", value: order, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "after", value: after, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "before", value: before, style: "form", explode: true, allowReserved: false, contentType: nil)
        ])
        return try await client.get(ApiPaths.appendQueryString(ApiPaths.aiPath("/organization/roles"), query), responseType: OpenAiRoleList.self)
    }

    /// Create organization role
    public func createRole(body: OpenAiRoleCreateRequest) async throws -> OpenAiRole? {
        return try await client.post(ApiPaths.aiPath("/organization/roles"), body: body, params: nil, headers: nil, contentType: "application/json", responseType: OpenAiRole.self)
    }

    /// Delete organization role
    public func deleteRoles(roleId: String) async throws -> DeleteResult? {
        return try await client.delete(ApiPaths.aiPath("/organization/roles/\(serializePathParameter(roleId, PathParameterSpec(name: "role_id", style: "simple", explode: false)))"), responseType: DeleteResult.self)
    }

    /// Get audio speech usage
    public func listUsageAudioSpeeches(startTime: Int? = nil, endTime: Int? = nil, bucketWidth: String? = nil, projectIds: [String]? = nil, userIds: [String]? = nil, apiKeyIds: [String]? = nil, models: [String]? = nil, groupBy: [String]? = nil, limit: Int? = nil, page: String? = nil) async throws -> OpenAiOrganizationUsageList? {
        let query = buildQueryString([
            QueryParameterSpec(name: "start_time", value: startTime, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "end_time", value: endTime, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "bucket_width", value: bucketWidth, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "project_ids", value: projectIds, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "user_ids", value: userIds, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "api_key_ids", value: apiKeyIds, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "models", value: models, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "group_by", value: groupBy, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "page_size", value: limit, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "page", value: page, style: "form", explode: true, allowReserved: false, contentType: nil)
        ])
        return try await client.get(ApiPaths.appendQueryString(ApiPaths.aiPath("/organization/usage/audio_speeches"), query), responseType: OpenAiOrganizationUsageList.self)
    }

    /// Get audio transcription usage
    public func listUsageAudioTranscriptions(startTime: Int? = nil, endTime: Int? = nil, bucketWidth: String? = nil, projectIds: [String]? = nil, userIds: [String]? = nil, apiKeyIds: [String]? = nil, models: [String]? = nil, groupBy: [String]? = nil, limit: Int? = nil, page: String? = nil) async throws -> OpenAiOrganizationUsageList? {
        let query = buildQueryString([
            QueryParameterSpec(name: "start_time", value: startTime, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "end_time", value: endTime, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "bucket_width", value: bucketWidth, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "project_ids", value: projectIds, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "user_ids", value: userIds, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "api_key_ids", value: apiKeyIds, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "models", value: models, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "group_by", value: groupBy, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "page_size", value: limit, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "page", value: page, style: "form", explode: true, allowReserved: false, contentType: nil)
        ])
        return try await client.get(ApiPaths.appendQueryString(ApiPaths.aiPath("/organization/usage/audio_transcriptions"), query), responseType: OpenAiOrganizationUsageList.self)
    }

    /// Get code interpreter session usage
    public func listUsageCodeInterpreterSessions(startTime: Int? = nil, endTime: Int? = nil, bucketWidth: String? = nil, projectIds: [String]? = nil, userIds: [String]? = nil, apiKeyIds: [String]? = nil, models: [String]? = nil, groupBy: [String]? = nil, limit: Int? = nil, page: String? = nil) async throws -> OpenAiOrganizationUsageList? {
        let query = buildQueryString([
            QueryParameterSpec(name: "start_time", value: startTime, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "end_time", value: endTime, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "bucket_width", value: bucketWidth, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "project_ids", value: projectIds, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "user_ids", value: userIds, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "api_key_ids", value: apiKeyIds, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "models", value: models, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "group_by", value: groupBy, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "page_size", value: limit, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "page", value: page, style: "form", explode: true, allowReserved: false, contentType: nil)
        ])
        return try await client.get(ApiPaths.appendQueryString(ApiPaths.aiPath("/organization/usage/code_interpreter_sessions"), query), responseType: OpenAiOrganizationUsageList.self)
    }

    /// Get completions usage
    public func listUsageCompletions(startTime: Int? = nil, endTime: Int? = nil, bucketWidth: String? = nil, projectIds: [String]? = nil, userIds: [String]? = nil, apiKeyIds: [String]? = nil, models: [String]? = nil, groupBy: [String]? = nil, limit: Int? = nil, page: String? = nil) async throws -> OpenAiOrganizationUsageList? {
        let query = buildQueryString([
            QueryParameterSpec(name: "start_time", value: startTime, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "end_time", value: endTime, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "bucket_width", value: bucketWidth, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "project_ids", value: projectIds, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "user_ids", value: userIds, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "api_key_ids", value: apiKeyIds, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "models", value: models, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "group_by", value: groupBy, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "page_size", value: limit, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "page", value: page, style: "form", explode: true, allowReserved: false, contentType: nil)
        ])
        return try await client.get(ApiPaths.appendQueryString(ApiPaths.aiPath("/organization/usage/completions"), query), responseType: OpenAiOrganizationUsageList.self)
    }

    /// Get embeddings usage
    public func listUsageEmbeddings(startTime: Int? = nil, endTime: Int? = nil, bucketWidth: String? = nil, projectIds: [String]? = nil, userIds: [String]? = nil, apiKeyIds: [String]? = nil, models: [String]? = nil, groupBy: [String]? = nil, limit: Int? = nil, page: String? = nil) async throws -> OpenAiOrganizationUsageList? {
        let query = buildQueryString([
            QueryParameterSpec(name: "start_time", value: startTime, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "end_time", value: endTime, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "bucket_width", value: bucketWidth, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "project_ids", value: projectIds, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "user_ids", value: userIds, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "api_key_ids", value: apiKeyIds, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "models", value: models, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "group_by", value: groupBy, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "page_size", value: limit, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "page", value: page, style: "form", explode: true, allowReserved: false, contentType: nil)
        ])
        return try await client.get(ApiPaths.appendQueryString(ApiPaths.aiPath("/organization/usage/embeddings"), query), responseType: OpenAiOrganizationUsageList.self)
    }

    /// Get image usage
    public func listUsageImages(startTime: Int? = nil, endTime: Int? = nil, bucketWidth: String? = nil, projectIds: [String]? = nil, userIds: [String]? = nil, apiKeyIds: [String]? = nil, models: [String]? = nil, groupBy: [String]? = nil, limit: Int? = nil, page: String? = nil) async throws -> OpenAiOrganizationUsageList? {
        let query = buildQueryString([
            QueryParameterSpec(name: "start_time", value: startTime, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "end_time", value: endTime, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "bucket_width", value: bucketWidth, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "project_ids", value: projectIds, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "user_ids", value: userIds, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "api_key_ids", value: apiKeyIds, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "models", value: models, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "group_by", value: groupBy, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "page_size", value: limit, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "page", value: page, style: "form", explode: true, allowReserved: false, contentType: nil)
        ])
        return try await client.get(ApiPaths.appendQueryString(ApiPaths.aiPath("/organization/usage/images"), query), responseType: OpenAiOrganizationUsageList.self)
    }

    /// Get moderation usage
    public func listUsageModerations(startTime: Int? = nil, endTime: Int? = nil, bucketWidth: String? = nil, projectIds: [String]? = nil, userIds: [String]? = nil, apiKeyIds: [String]? = nil, models: [String]? = nil, groupBy: [String]? = nil, limit: Int? = nil, page: String? = nil) async throws -> OpenAiOrganizationUsageList? {
        let query = buildQueryString([
            QueryParameterSpec(name: "start_time", value: startTime, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "end_time", value: endTime, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "bucket_width", value: bucketWidth, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "project_ids", value: projectIds, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "user_ids", value: userIds, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "api_key_ids", value: apiKeyIds, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "models", value: models, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "group_by", value: groupBy, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "page_size", value: limit, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "page", value: page, style: "form", explode: true, allowReserved: false, contentType: nil)
        ])
        return try await client.get(ApiPaths.appendQueryString(ApiPaths.aiPath("/organization/usage/moderations"), query), responseType: OpenAiOrganizationUsageList.self)
    }

    /// Get vector store usage
    public func listUsageVectorStores(startTime: Int? = nil, endTime: Int? = nil, bucketWidth: String? = nil, projectIds: [String]? = nil, userIds: [String]? = nil, apiKeyIds: [String]? = nil, models: [String]? = nil, groupBy: [String]? = nil, limit: Int? = nil, page: String? = nil) async throws -> OpenAiOrganizationUsageList? {
        let query = buildQueryString([
            QueryParameterSpec(name: "start_time", value: startTime, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "end_time", value: endTime, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "bucket_width", value: bucketWidth, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "project_ids", value: projectIds, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "user_ids", value: userIds, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "api_key_ids", value: apiKeyIds, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "models", value: models, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "group_by", value: groupBy, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "page_size", value: limit, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "page", value: page, style: "form", explode: true, allowReserved: false, contentType: nil)
        ])
        return try await client.get(ApiPaths.appendQueryString(ApiPaths.aiPath("/organization/usage/vector_stores"), query), responseType: OpenAiOrganizationUsageList.self)
    }

    /// List organization users
    public func listUsers(limit: Int? = nil, order: String? = nil, after: String? = nil, before: String? = nil) async throws -> OpenAiOrganizationUserList? {
        let query = buildQueryString([
            QueryParameterSpec(name: "page_size", value: limit, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "order", value: order, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "after", value: after, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "before", value: before, style: "form", explode: true, allowReserved: false, contentType: nil)
        ])
        return try await client.get(ApiPaths.appendQueryString(ApiPaths.aiPath("/organization/users"), query), responseType: OpenAiOrganizationUserList.self)
    }

    /// Delete organization user
    public func deleteUsers(userId: String) async throws -> DeleteResult? {
        return try await client.delete(ApiPaths.aiPath("/organization/users/\(serializePathParameter(userId, PathParameterSpec(name: "user_id", style: "simple", explode: false)))"), responseType: DeleteResult.self)
    }

    /// Modify organization user
    public func createUser(userId: String, body: OpenAiOrganizationUserUpdateRequest) async throws -> OpenAiOrganizationUser? {
        return try await client.post(ApiPaths.aiPath("/organization/users/\(serializePathParameter(userId, PathParameterSpec(name: "user_id", style: "simple", explode: false)))"), body: body, params: nil, headers: nil, contentType: "application/json", responseType: OpenAiOrganizationUser.self)
    }

    /// List organization user roles
    public func listUsersRoles(userId: String, limit: Int? = nil, order: String? = nil, after: String? = nil, before: String? = nil) async throws -> OpenAiRoleAssignmentList? {
        let query = buildQueryString([
            QueryParameterSpec(name: "page_size", value: limit, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "order", value: order, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "after", value: after, style: "form", explode: true, allowReserved: false, contentType: nil),
            QueryParameterSpec(name: "before", value: before, style: "form", explode: true, allowReserved: false, contentType: nil)
        ])
        return try await client.get(ApiPaths.appendQueryString(ApiPaths.aiPath("/organization/users/\(serializePathParameter(userId, PathParameterSpec(name: "user_id", style: "simple", explode: false)))/roles"), query), responseType: OpenAiRoleAssignmentList.self)
    }

    /// Create organization user role
    public func createUsersRole(userId: String, body: OpenAiRoleAssignmentCreateRequest) async throws -> OpenAiRoleAssignment? {
        return try await client.post(ApiPaths.aiPath("/organization/users/\(serializePathParameter(userId, PathParameterSpec(name: "user_id", style: "simple", explode: false)))/roles"), body: body, params: nil, headers: nil, contentType: "application/json", responseType: OpenAiRoleAssignment.self)
    }

    /// Delete organization user role
    public func deleteUsersRoles(userId: String, roleId: String) async throws -> DeleteResult? {
        return try await client.delete(ApiPaths.aiPath("/organization/users/\(serializePathParameter(userId, PathParameterSpec(name: "user_id", style: "simple", explode: false)))/roles/\(serializePathParameter(roleId, PathParameterSpec(name: "role_id", style: "simple", explode: false)))"), responseType: DeleteResult.self)
    }

    private struct PathParameterSpec {
        let name: String
        let style: String
        let explode: Bool
    }

    private func serializePathParameter(_ value: Any?, _ spec: PathParameterSpec) -> String {
        guard let value else { return "" }
        let style = spec.style.isEmpty ? "simple" : spec.style
        if let array = value as? [Any] {
            return serializePathArray(spec.name, array, style, spec.explode)
        }
        if let object = value as? [String: Any] {
            return serializePathObject(spec.name, object, style, spec.explode)
        }
        return pathPrimitivePrefix(spec.name, style) + pathEncode(String(describing: value))
    }

    private func serializePathArray(_ name: String, _ values: [Any], _ style: String, _ explode: Bool) -> String {
        let serialized = values.map { pathEncode(String(describing: $0)) }
        if serialized.isEmpty { return pathPrefix(name, style) }
        if style == "matrix" {
            if explode {
                return serialized.map { ";\(name)=\($0)" }.joined()
            }
            return ";\(name)=" + serialized.joined(separator: ",")
        }
        let separator = explode ? "." : ","
        return pathPrefix(name, style) + serialized.joined(separator: separator)
    }

    private func serializePathObject(_ name: String, _ values: [String: Any], _ style: String, _ explode: Bool) -> String {
        var entries: [String] = []
        var exploded: [String] = []
        for (key, value) in values {
            let escapedKey = pathEncode(key)
            let escapedValue = pathEncode(String(describing: value))
            if explode {
                if style == "matrix" {
                    exploded.append(";\(escapedKey)=\(escapedValue)")
                } else {
                    exploded.append("\(escapedKey)=\(escapedValue)")
                }
            } else {
                entries.append(escapedKey)
                entries.append(escapedValue)
            }
        }
        if style == "matrix" {
            if explode {
                return exploded.joined()
            }
            return ";\(name)=" + entries.joined(separator: ",")
        }
        if explode {
            let separator = style == "label" ? "." : ","
            return pathPrefix(name, style) + exploded.joined(separator: separator)
        }
        return pathPrefix(name, style) + entries.joined(separator: ",")
    }

    private func pathPrefix(_ name: String, _ style: String) -> String {
        if style == "label" { return "." }
        if style == "matrix" { return ";\(name)" }
        return ""
    }

    private func pathPrimitivePrefix(_ name: String, _ style: String) -> String {
        style == "matrix" ? ";\(name)=" : pathPrefix(name, style)
    }

    private func pathEncode(_ value: String) -> String {
        value.addingPercentEncoding(withAllowedCharacters: .urlPathAllowed) ?? value
    }

    private struct QueryParameterSpec {
        let name: String
        let value: Any?
        let style: String
        let explode: Bool
        let allowReserved: Bool
        let contentType: String?
    }

    private func buildQueryString(_ parameters: [QueryParameterSpec]) -> String {
        var pairs: [String] = []
        for parameter in parameters {
            appendSerializedParameter(&pairs, parameter)
        }
        return pairs.joined(separator: "&")
    }

    private func appendSerializedParameter(_ pairs: inout [String], _ parameter: QueryParameterSpec) {
        guard let value = parameter.value else { return }
        if let contentType = parameter.contentType, !contentType.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
            let data = (try? JSONSerialization.data(withJSONObject: value, options: [])) ?? Data(String(describing: value).utf8)
            let json = String(data: data, encoding: .utf8) ?? String(describing: value)
            pairs.append("\(urlEncode(parameter.name))=\(encodeQueryValue(json, allowReserved: parameter.allowReserved))")
            return
        }

        let style = parameter.style.isEmpty ? "form" : parameter.style
        if style == "deepObject", let object = value as? [String: Any] {
            appendDeepObjectParameter(&pairs, name: parameter.name, values: object, allowReserved: parameter.allowReserved)
        } else if let array = value as? [Any] {
            appendArrayParameter(&pairs, name: parameter.name, values: array, style: style, explode: parameter.explode, allowReserved: parameter.allowReserved)
        } else if let object = value as? [String: Any] {
            appendObjectParameter(&pairs, name: parameter.name, values: object, style: style, explode: parameter.explode, allowReserved: parameter.allowReserved)
        } else {
            pairs.append("\(urlEncode(parameter.name))=\(encodeQueryValue(String(describing: value), allowReserved: parameter.allowReserved))")
        }
    }

    private func appendArrayParameter(
        _ pairs: inout [String],
        name: String,
        values: [Any],
        style: String,
        explode: Bool,
        allowReserved: Bool
    ) {
        let serialized = values.map { String(describing: $0) }
        guard !serialized.isEmpty else { return }
        if style == "form" && explode {
            for item in serialized {
                pairs.append("\(urlEncode(name))=\(encodeQueryValue(item, allowReserved: allowReserved))")
            }
            return
        }
        pairs.append("\(urlEncode(name))=\(encodeQueryValue(serialized.joined(separator: ","), allowReserved: allowReserved))")
    }

    private func appendObjectParameter(
        _ pairs: inout [String],
        name: String,
        values: [String: Any],
        style: String,
        explode: Bool,
        allowReserved: Bool
    ) {
        var serialized: [String] = []
        for (key, value) in values {
            if style == "form" && explode {
                pairs.append("\(urlEncode(key))=\(encodeQueryValue(String(describing: value), allowReserved: allowReserved))")
            } else {
                serialized.append(key)
                serialized.append(String(describing: value))
            }
        }
        if !serialized.isEmpty {
            pairs.append("\(urlEncode(name))=\(encodeQueryValue(serialized.joined(separator: ","), allowReserved: allowReserved))")
        }
    }

    private func appendDeepObjectParameter(_ pairs: inout [String], name: String, values: [String: Any], allowReserved: Bool) {
        for (key, value) in values {
            pairs.append("\(urlEncode("\(name)[\(key)]"))=\(encodeQueryValue(String(describing: value), allowReserved: allowReserved))")
        }
    }

    private func encodeQueryValue(_ value: String, allowReserved: Bool) -> String {
        var encoded = urlEncode(value)
        if !allowReserved { return encoded }
        [
            "%3A": ":", "%2F": "/", "%3F": "?", "%23": "#",
            "%5B": "[", "%5D": "]", "%40": "@", "%21": "!",
            "%24": "$", "%26": "&", "%27": "'", "%28": "(",
            "%29": ")", "%2A": "*", "%2B": "+", "%2C": ",",
            "%3B": ";", "%3D": "=",
        ].forEach { encoded = encoded.replacingOccurrences(of: $0.key, with: $0.value) }
        return encoded
    }

    private func urlEncode(_ value: String) -> String {
        value.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? value
    }

}
