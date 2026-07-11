package com.sdkwork.clawrouter.open.api

import com.fasterxml.jackson.core.type.TypeReference
import com.fasterxml.jackson.databind.ObjectMapper
import com.fasterxml.jackson.module.kotlin.registerKotlinModule
import com.sdkwork.clawrouter.open.*
import com.sdkwork.clawrouter.open.http.HttpClient

class OrganizationApi(private val client: HttpClient) {

    /** List organization admin API keys */
    suspend fun listAdminApiKeys(limit: Int? = null, order: String? = null, after: String? = null, before: String? = null): OpenAiOrganizationAdminApiKeyList? {
        val query = buildQueryString(listOf(
            QueryParameterSpec("page_size", limit, "form", true, false, null),
            QueryParameterSpec("order", order, "form", true, false, null),
            QueryParameterSpec("after", after, "form", true, false, null),
            QueryParameterSpec("before", before, "form", true, false, null)
        ))
        val raw = client.get(ApiPaths.appendQueryString(ApiPaths.aiPath("/organization/admin_api_keys"), query))
        return client.convertValue(raw, object : TypeReference<OpenAiOrganizationAdminApiKeyList>() {})
    }

    /** Create organization admin API key */
    suspend fun createAdminApiKey(body: OpenAiOrganizationAdminApiKeyCreateRequest): OpenAiOrganizationAdminApiKey? {
        val raw = client.post(ApiPaths.aiPath("/organization/admin_api_keys"), body, null, null, "application/json")
        return client.convertValue(raw, object : TypeReference<OpenAiOrganizationAdminApiKey>() {})
    }

    /** Delete organization admin API key */
    suspend fun deleteAdminApiKeys(keyId: String): DeleteResult? {
        val raw = client.delete(ApiPaths.aiPath("/organization/admin_api_keys/${serializePathParameter(keyId, PathParameterSpec("key_id", "simple", false))}"))
        return client.convertValue(raw, object : TypeReference<DeleteResult>() {})
    }

    /** List organization audit logs */
    suspend fun listAuditLogs(effectiveAtGte: Int? = null, effectiveAtLte: Int? = null, projectIds: List<String>? = null, eventTypes: List<String>? = null, actorIds: List<String>? = null, actorEmails: List<String>? = null, resourceIds: List<String>? = null, limit: Int? = null, after: String? = null, before: String? = null): OpenAiOrganizationAuditLogList? {
        val query = buildQueryString(listOf(
            QueryParameterSpec("effective_at[gte]", effectiveAtGte, "form", true, false, null),
            QueryParameterSpec("effective_at[lte]", effectiveAtLte, "form", true, false, null),
            QueryParameterSpec("project_ids[]", projectIds, "form", true, false, null),
            QueryParameterSpec("event_types[]", eventTypes, "form", true, false, null),
            QueryParameterSpec("actor_ids[]", actorIds, "form", true, false, null),
            QueryParameterSpec("actor_emails[]", actorEmails, "form", true, false, null),
            QueryParameterSpec("resource_ids[]", resourceIds, "form", true, false, null),
            QueryParameterSpec("page_size", limit, "form", true, false, null),
            QueryParameterSpec("after", after, "form", true, false, null),
            QueryParameterSpec("before", before, "form", true, false, null)
        ))
        val raw = client.get(ApiPaths.appendQueryString(ApiPaths.aiPath("/organization/audit_logs"), query))
        return client.convertValue(raw, object : TypeReference<OpenAiOrganizationAuditLogList>() {})
    }

    /** List organization certificates */
    suspend fun listCertificates(limit: Int? = null, order: String? = null, after: String? = null, before: String? = null): OpenAiCertificateList? {
        val query = buildQueryString(listOf(
            QueryParameterSpec("page_size", limit, "form", true, false, null),
            QueryParameterSpec("order", order, "form", true, false, null),
            QueryParameterSpec("after", after, "form", true, false, null),
            QueryParameterSpec("before", before, "form", true, false, null)
        ))
        val raw = client.get(ApiPaths.appendQueryString(ApiPaths.aiPath("/organization/certificates"), query))
        return client.convertValue(raw, object : TypeReference<OpenAiCertificateList>() {})
    }

    /** Upload organization certificate */
    suspend fun createCertificate(body: OpenAiCertificateUploadMultipartRequest): OpenAiCertificate? {
        val raw = client.post(ApiPaths.aiPath("/organization/certificates"), body, null, null, "multipart/form-data")
        return client.convertValue(raw, object : TypeReference<OpenAiCertificate>() {})
    }

    /** Activate organization certificates */
    suspend fun createCertificatesActivate(body: OpenAiCertificateActivationRequest): OpenAiCertificateList? {
        val raw = client.post(ApiPaths.aiPath("/organization/certificates/activate"), body, null, null, "application/json")
        return client.convertValue(raw, object : TypeReference<OpenAiCertificateList>() {})
    }

    /** Deactivate organization certificates */
    suspend fun createCertificatesDeactivate(body: OpenAiCertificateActivationRequest): OpenAiCertificateList? {
        val raw = client.post(ApiPaths.aiPath("/organization/certificates/deactivate"), body, null, null, "application/json")
        return client.convertValue(raw, object : TypeReference<OpenAiCertificateList>() {})
    }

    /** Delete organization certificate */
    suspend fun deleteCertificates(certificateId: String): DeleteResult? {
        val raw = client.delete(ApiPaths.aiPath("/organization/certificates/${serializePathParameter(certificateId, PathParameterSpec("certificate_id", "simple", false))}"))
        return client.convertValue(raw, object : TypeReference<DeleteResult>() {})
    }

    /** Get organization costs */
    suspend fun listCosts(startTime: Int? = null, endTime: Int? = null, bucketWidth: String? = null, projectIds: List<String>? = null, userIds: List<String>? = null, apiKeyIds: List<String>? = null, models: List<String>? = null, groupBy: List<String>? = null, limit: Int? = null, page: String? = null): OpenAiOrganizationCostList? {
        val query = buildQueryString(listOf(
            QueryParameterSpec("start_time", startTime, "form", true, false, null),
            QueryParameterSpec("end_time", endTime, "form", true, false, null),
            QueryParameterSpec("bucket_width", bucketWidth, "form", true, false, null),
            QueryParameterSpec("project_ids", projectIds, "form", true, false, null),
            QueryParameterSpec("user_ids", userIds, "form", true, false, null),
            QueryParameterSpec("api_key_ids", apiKeyIds, "form", true, false, null),
            QueryParameterSpec("models", models, "form", true, false, null),
            QueryParameterSpec("group_by", groupBy, "form", true, false, null),
            QueryParameterSpec("page_size", limit, "form", true, false, null),
            QueryParameterSpec("page", page, "form", true, false, null)
        ))
        val raw = client.get(ApiPaths.appendQueryString(ApiPaths.aiPath("/organization/costs"), query))
        return client.convertValue(raw, object : TypeReference<OpenAiOrganizationCostList>() {})
    }

    /** List organization groups */
    suspend fun listGroups(limit: Int? = null, order: String? = null, after: String? = null, before: String? = null): OpenAiOrganizationGroupList? {
        val query = buildQueryString(listOf(
            QueryParameterSpec("page_size", limit, "form", true, false, null),
            QueryParameterSpec("order", order, "form", true, false, null),
            QueryParameterSpec("after", after, "form", true, false, null),
            QueryParameterSpec("before", before, "form", true, false, null)
        ))
        val raw = client.get(ApiPaths.appendQueryString(ApiPaths.aiPath("/organization/groups"), query))
        return client.convertValue(raw, object : TypeReference<OpenAiOrganizationGroupList>() {})
    }

    /** Create organization group */
    suspend fun createGroup(body: OpenAiOrganizationGroupCreateRequest): OpenAiOrganizationGroup? {
        val raw = client.post(ApiPaths.aiPath("/organization/groups"), body, null, null, "application/json")
        return client.convertValue(raw, object : TypeReference<OpenAiOrganizationGroup>() {})
    }

    /** Delete organization group */
    suspend fun deleteGroups(groupId: String): DeleteResult? {
        val raw = client.delete(ApiPaths.aiPath("/organization/groups/${serializePathParameter(groupId, PathParameterSpec("group_id", "simple", false))}"))
        return client.convertValue(raw, object : TypeReference<DeleteResult>() {})
    }

    /** List organization group roles */
    suspend fun listGroupsRoles(groupId: String, limit: Int? = null, order: String? = null, after: String? = null, before: String? = null): OpenAiRoleAssignmentList? {
        val query = buildQueryString(listOf(
            QueryParameterSpec("page_size", limit, "form", true, false, null),
            QueryParameterSpec("order", order, "form", true, false, null),
            QueryParameterSpec("after", after, "form", true, false, null),
            QueryParameterSpec("before", before, "form", true, false, null)
        ))
        val raw = client.get(ApiPaths.appendQueryString(ApiPaths.aiPath("/organization/groups/${serializePathParameter(groupId, PathParameterSpec("group_id", "simple", false))}/roles"), query))
        return client.convertValue(raw, object : TypeReference<OpenAiRoleAssignmentList>() {})
    }

    /** Create organization group role */
    suspend fun createGroupsRole(groupId: String, body: OpenAiRoleAssignmentCreateRequest): OpenAiRoleAssignment? {
        val raw = client.post(ApiPaths.aiPath("/organization/groups/${serializePathParameter(groupId, PathParameterSpec("group_id", "simple", false))}/roles"), body, null, null, "application/json")
        return client.convertValue(raw, object : TypeReference<OpenAiRoleAssignment>() {})
    }

    /** Delete organization group role */
    suspend fun deleteGroupsRoles(groupId: String, roleId: String): DeleteResult? {
        val raw = client.delete(ApiPaths.aiPath("/organization/groups/${serializePathParameter(groupId, PathParameterSpec("group_id", "simple", false))}/roles/${serializePathParameter(roleId, PathParameterSpec("role_id", "simple", false))}"))
        return client.convertValue(raw, object : TypeReference<DeleteResult>() {})
    }

    /** List organization group users */
    suspend fun listGroupsUsers(groupId: String, limit: Int? = null, order: String? = null, after: String? = null, before: String? = null): OpenAiOrganizationUserList? {
        val query = buildQueryString(listOf(
            QueryParameterSpec("page_size", limit, "form", true, false, null),
            QueryParameterSpec("order", order, "form", true, false, null),
            QueryParameterSpec("after", after, "form", true, false, null),
            QueryParameterSpec("before", before, "form", true, false, null)
        ))
        val raw = client.get(ApiPaths.appendQueryString(ApiPaths.aiPath("/organization/groups/${serializePathParameter(groupId, PathParameterSpec("group_id", "simple", false))}/users"), query))
        return client.convertValue(raw, object : TypeReference<OpenAiOrganizationUserList>() {})
    }

    /** Add organization group user */
    suspend fun createGroupsUser(groupId: String, body: OpenAiOrganizationGroupUserCreateRequest): OpenAiOrganizationUser? {
        val raw = client.post(ApiPaths.aiPath("/organization/groups/${serializePathParameter(groupId, PathParameterSpec("group_id", "simple", false))}/users"), body, null, null, "application/json")
        return client.convertValue(raw, object : TypeReference<OpenAiOrganizationUser>() {})
    }

    /** Delete organization group user */
    suspend fun deleteGroupsUsers(groupId: String, userId: String): DeleteResult? {
        val raw = client.delete(ApiPaths.aiPath("/organization/groups/${serializePathParameter(groupId, PathParameterSpec("group_id", "simple", false))}/users/${serializePathParameter(userId, PathParameterSpec("user_id", "simple", false))}"))
        return client.convertValue(raw, object : TypeReference<DeleteResult>() {})
    }

    /** List organization invites */
    suspend fun listInvites(limit: Int? = null, order: String? = null, after: String? = null, before: String? = null): OpenAiOrganizationInviteList? {
        val query = buildQueryString(listOf(
            QueryParameterSpec("page_size", limit, "form", true, false, null),
            QueryParameterSpec("order", order, "form", true, false, null),
            QueryParameterSpec("after", after, "form", true, false, null),
            QueryParameterSpec("before", before, "form", true, false, null)
        ))
        val raw = client.get(ApiPaths.appendQueryString(ApiPaths.aiPath("/organization/invites"), query))
        return client.convertValue(raw, object : TypeReference<OpenAiOrganizationInviteList>() {})
    }

    /** Create organization invite */
    suspend fun createInvite(body: OpenAiOrganizationInviteCreateRequest): OpenAiOrganizationInvite? {
        val raw = client.post(ApiPaths.aiPath("/organization/invites"), body, null, null, "application/json")
        return client.convertValue(raw, object : TypeReference<OpenAiOrganizationInvite>() {})
    }

    /** Delete organization invite */
    suspend fun deleteInvites(inviteId: String): DeleteResult? {
        val raw = client.delete(ApiPaths.aiPath("/organization/invites/${serializePathParameter(inviteId, PathParameterSpec("invite_id", "simple", false))}"))
        return client.convertValue(raw, object : TypeReference<DeleteResult>() {})
    }

    /** List organization projects */
    suspend fun listProjects(limit: Int? = null, order: String? = null, after: String? = null, before: String? = null): OpenAiProjectList? {
        val query = buildQueryString(listOf(
            QueryParameterSpec("page_size", limit, "form", true, false, null),
            QueryParameterSpec("order", order, "form", true, false, null),
            QueryParameterSpec("after", after, "form", true, false, null),
            QueryParameterSpec("before", before, "form", true, false, null)
        ))
        val raw = client.get(ApiPaths.appendQueryString(ApiPaths.aiPath("/organization/projects"), query))
        return client.convertValue(raw, object : TypeReference<OpenAiProjectList>() {})
    }

    /** Create organization project */
    suspend fun createProject(body: OpenAiProjectCreateRequest): OpenAiProject? {
        val raw = client.post(ApiPaths.aiPath("/organization/projects"), body, null, null, "application/json")
        return client.convertValue(raw, object : TypeReference<OpenAiProject>() {})
    }

    /** List project API keys */
    suspend fun listProjectsApiKeys(projectId: String, limit: Int? = null, order: String? = null, after: String? = null, before: String? = null): OpenAiProjectApiKeyList? {
        val query = buildQueryString(listOf(
            QueryParameterSpec("page_size", limit, "form", true, false, null),
            QueryParameterSpec("order", order, "form", true, false, null),
            QueryParameterSpec("after", after, "form", true, false, null),
            QueryParameterSpec("before", before, "form", true, false, null)
        ))
        val raw = client.get(ApiPaths.appendQueryString(ApiPaths.aiPath("/organization/projects/${serializePathParameter(projectId, PathParameterSpec("project_id", "simple", false))}/api_keys"), query))
        return client.convertValue(raw, object : TypeReference<OpenAiProjectApiKeyList>() {})
    }

    /** Delete project API key */
    suspend fun deleteProjectsApiKeys(projectId: String, keyId: String): DeleteResult? {
        val raw = client.delete(ApiPaths.aiPath("/organization/projects/${serializePathParameter(projectId, PathParameterSpec("project_id", "simple", false))}/api_keys/${serializePathParameter(keyId, PathParameterSpec("key_id", "simple", false))}"))
        return client.convertValue(raw, object : TypeReference<DeleteResult>() {})
    }

    /** Archive organization project */
    suspend fun createProjectsArchive(projectId: String): OpenAiProject? {
        val raw = client.post(ApiPaths.aiPath("/organization/projects/${serializePathParameter(projectId, PathParameterSpec("project_id", "simple", false))}/archive"), null)
        return client.convertValue(raw, object : TypeReference<OpenAiProject>() {})
    }

    /** List project certificates */
    suspend fun listProjectsCertificates(projectId: String, limit: Int? = null, order: String? = null, after: String? = null, before: String? = null): OpenAiCertificateList? {
        val query = buildQueryString(listOf(
            QueryParameterSpec("page_size", limit, "form", true, false, null),
            QueryParameterSpec("order", order, "form", true, false, null),
            QueryParameterSpec("after", after, "form", true, false, null),
            QueryParameterSpec("before", before, "form", true, false, null)
        ))
        val raw = client.get(ApiPaths.appendQueryString(ApiPaths.aiPath("/organization/projects/${serializePathParameter(projectId, PathParameterSpec("project_id", "simple", false))}/certificates"), query))
        return client.convertValue(raw, object : TypeReference<OpenAiCertificateList>() {})
    }

    /** Activate project certificates */
    suspend fun createProjectsCertificatesActivate(projectId: String, body: OpenAiCertificateActivationRequest): OpenAiCertificateList? {
        val raw = client.post(ApiPaths.aiPath("/organization/projects/${serializePathParameter(projectId, PathParameterSpec("project_id", "simple", false))}/certificates/activate"), body, null, null, "application/json")
        return client.convertValue(raw, object : TypeReference<OpenAiCertificateList>() {})
    }

    /** Deactivate project certificates */
    suspend fun createProjectsCertificatesDeactivate(projectId: String, body: OpenAiCertificateActivationRequest): OpenAiCertificateList? {
        val raw = client.post(ApiPaths.aiPath("/organization/projects/${serializePathParameter(projectId, PathParameterSpec("project_id", "simple", false))}/certificates/deactivate"), body, null, null, "application/json")
        return client.convertValue(raw, object : TypeReference<OpenAiCertificateList>() {})
    }

    /** List project groups */
    suspend fun listProjectsGroups(projectId: String, limit: Int? = null, order: String? = null, after: String? = null, before: String? = null): OpenAiOrganizationGroupList? {
        val query = buildQueryString(listOf(
            QueryParameterSpec("page_size", limit, "form", true, false, null),
            QueryParameterSpec("order", order, "form", true, false, null),
            QueryParameterSpec("after", after, "form", true, false, null),
            QueryParameterSpec("before", before, "form", true, false, null)
        ))
        val raw = client.get(ApiPaths.appendQueryString(ApiPaths.aiPath("/organization/projects/${serializePathParameter(projectId, PathParameterSpec("project_id", "simple", false))}/groups"), query))
        return client.convertValue(raw, object : TypeReference<OpenAiOrganizationGroupList>() {})
    }

    /** Create project group */
    suspend fun createProjectsGroup(projectId: String, body: OpenAiProjectGroupCreateRequest): OpenAiOrganizationGroup? {
        val raw = client.post(ApiPaths.aiPath("/organization/projects/${serializePathParameter(projectId, PathParameterSpec("project_id", "simple", false))}/groups"), body, null, null, "application/json")
        return client.convertValue(raw, object : TypeReference<OpenAiOrganizationGroup>() {})
    }

    /** Delete project group */
    suspend fun deleteProjectsGroups(projectId: String, groupId: String): DeleteResult? {
        val raw = client.delete(ApiPaths.aiPath("/organization/projects/${serializePathParameter(projectId, PathParameterSpec("project_id", "simple", false))}/groups/${serializePathParameter(groupId, PathParameterSpec("group_id", "simple", false))}"))
        return client.convertValue(raw, object : TypeReference<DeleteResult>() {})
    }

    /** List project rate limits */
    suspend fun listProjectsRateLimits(projectId: String, limit: Int? = null, order: String? = null, after: String? = null, before: String? = null): OpenAiProjectRateLimitList? {
        val query = buildQueryString(listOf(
            QueryParameterSpec("page_size", limit, "form", true, false, null),
            QueryParameterSpec("order", order, "form", true, false, null),
            QueryParameterSpec("after", after, "form", true, false, null),
            QueryParameterSpec("before", before, "form", true, false, null)
        ))
        val raw = client.get(ApiPaths.appendQueryString(ApiPaths.aiPath("/organization/projects/${serializePathParameter(projectId, PathParameterSpec("project_id", "simple", false))}/rate_limits"), query))
        return client.convertValue(raw, object : TypeReference<OpenAiProjectRateLimitList>() {})
    }

    /** Modify project rate limit */
    suspend fun createProjectsRateLimit(projectId: String, rateLimitId: String, body: OpenAiProjectRateLimitUpdateRequest): OpenAiProjectRateLimit? {
        val raw = client.post(ApiPaths.aiPath("/organization/projects/${serializePathParameter(projectId, PathParameterSpec("project_id", "simple", false))}/rate_limits/${serializePathParameter(rateLimitId, PathParameterSpec("rate_limit_id", "simple", false))}"), body, null, null, "application/json")
        return client.convertValue(raw, object : TypeReference<OpenAiProjectRateLimit>() {})
    }

    /** List project service accounts */
    suspend fun listProjectsServiceAccounts(projectId: String, limit: Int? = null, order: String? = null, after: String? = null, before: String? = null): OpenAiProjectServiceAccountList? {
        val query = buildQueryString(listOf(
            QueryParameterSpec("page_size", limit, "form", true, false, null),
            QueryParameterSpec("order", order, "form", true, false, null),
            QueryParameterSpec("after", after, "form", true, false, null),
            QueryParameterSpec("before", before, "form", true, false, null)
        ))
        val raw = client.get(ApiPaths.appendQueryString(ApiPaths.aiPath("/organization/projects/${serializePathParameter(projectId, PathParameterSpec("project_id", "simple", false))}/service_accounts"), query))
        return client.convertValue(raw, object : TypeReference<OpenAiProjectServiceAccountList>() {})
    }

    /** Create project service account */
    suspend fun createProjectsServiceAccount(projectId: String, body: OpenAiProjectServiceAccountCreateRequest): OpenAiProjectServiceAccount? {
        val raw = client.post(ApiPaths.aiPath("/organization/projects/${serializePathParameter(projectId, PathParameterSpec("project_id", "simple", false))}/service_accounts"), body, null, null, "application/json")
        return client.convertValue(raw, object : TypeReference<OpenAiProjectServiceAccount>() {})
    }

    /** Delete project service account */
    suspend fun deleteProjectsServiceAccounts(projectId: String, serviceAccountId: String): DeleteResult? {
        val raw = client.delete(ApiPaths.aiPath("/organization/projects/${serializePathParameter(projectId, PathParameterSpec("project_id", "simple", false))}/service_accounts/${serializePathParameter(serviceAccountId, PathParameterSpec("service_account_id", "simple", false))}"))
        return client.convertValue(raw, object : TypeReference<DeleteResult>() {})
    }

    /** List project users */
    suspend fun listProjectsUsers(projectId: String, limit: Int? = null, order: String? = null, after: String? = null, before: String? = null): OpenAiProjectUserList? {
        val query = buildQueryString(listOf(
            QueryParameterSpec("page_size", limit, "form", true, false, null),
            QueryParameterSpec("order", order, "form", true, false, null),
            QueryParameterSpec("after", after, "form", true, false, null),
            QueryParameterSpec("before", before, "form", true, false, null)
        ))
        val raw = client.get(ApiPaths.appendQueryString(ApiPaths.aiPath("/organization/projects/${serializePathParameter(projectId, PathParameterSpec("project_id", "simple", false))}/users"), query))
        return client.convertValue(raw, object : TypeReference<OpenAiProjectUserList>() {})
    }

    /** Create project user */
    suspend fun createProjectsUser(projectId: String, body: OpenAiProjectUserCreateRequest): OpenAiProjectUser? {
        val raw = client.post(ApiPaths.aiPath("/organization/projects/${serializePathParameter(projectId, PathParameterSpec("project_id", "simple", false))}/users"), body, null, null, "application/json")
        return client.convertValue(raw, object : TypeReference<OpenAiProjectUser>() {})
    }

    /** Delete project user */
    suspend fun deleteProjectsUsers(projectId: String, userId: String): DeleteResult? {
        val raw = client.delete(ApiPaths.aiPath("/organization/projects/${serializePathParameter(projectId, PathParameterSpec("project_id", "simple", false))}/users/${serializePathParameter(userId, PathParameterSpec("user_id", "simple", false))}"))
        return client.convertValue(raw, object : TypeReference<DeleteResult>() {})
    }

    /** List organization roles */
    suspend fun listRoles(limit: Int? = null, order: String? = null, after: String? = null, before: String? = null): OpenAiRoleList? {
        val query = buildQueryString(listOf(
            QueryParameterSpec("page_size", limit, "form", true, false, null),
            QueryParameterSpec("order", order, "form", true, false, null),
            QueryParameterSpec("after", after, "form", true, false, null),
            QueryParameterSpec("before", before, "form", true, false, null)
        ))
        val raw = client.get(ApiPaths.appendQueryString(ApiPaths.aiPath("/organization/roles"), query))
        return client.convertValue(raw, object : TypeReference<OpenAiRoleList>() {})
    }

    /** Create organization role */
    suspend fun createRole(body: OpenAiRoleCreateRequest): OpenAiRole? {
        val raw = client.post(ApiPaths.aiPath("/organization/roles"), body, null, null, "application/json")
        return client.convertValue(raw, object : TypeReference<OpenAiRole>() {})
    }

    /** Delete organization role */
    suspend fun deleteRoles(roleId: String): DeleteResult? {
        val raw = client.delete(ApiPaths.aiPath("/organization/roles/${serializePathParameter(roleId, PathParameterSpec("role_id", "simple", false))}"))
        return client.convertValue(raw, object : TypeReference<DeleteResult>() {})
    }

    /** Get audio speech usage */
    suspend fun listUsageAudioSpeeches(startTime: Int? = null, endTime: Int? = null, bucketWidth: String? = null, projectIds: List<String>? = null, userIds: List<String>? = null, apiKeyIds: List<String>? = null, models: List<String>? = null, groupBy: List<String>? = null, limit: Int? = null, page: String? = null): OpenAiOrganizationUsageList? {
        val query = buildQueryString(listOf(
            QueryParameterSpec("start_time", startTime, "form", true, false, null),
            QueryParameterSpec("end_time", endTime, "form", true, false, null),
            QueryParameterSpec("bucket_width", bucketWidth, "form", true, false, null),
            QueryParameterSpec("project_ids", projectIds, "form", true, false, null),
            QueryParameterSpec("user_ids", userIds, "form", true, false, null),
            QueryParameterSpec("api_key_ids", apiKeyIds, "form", true, false, null),
            QueryParameterSpec("models", models, "form", true, false, null),
            QueryParameterSpec("group_by", groupBy, "form", true, false, null),
            QueryParameterSpec("page_size", limit, "form", true, false, null),
            QueryParameterSpec("page", page, "form", true, false, null)
        ))
        val raw = client.get(ApiPaths.appendQueryString(ApiPaths.aiPath("/organization/usage/audio_speeches"), query))
        return client.convertValue(raw, object : TypeReference<OpenAiOrganizationUsageList>() {})
    }

    /** Get audio transcription usage */
    suspend fun listUsageAudioTranscriptions(startTime: Int? = null, endTime: Int? = null, bucketWidth: String? = null, projectIds: List<String>? = null, userIds: List<String>? = null, apiKeyIds: List<String>? = null, models: List<String>? = null, groupBy: List<String>? = null, limit: Int? = null, page: String? = null): OpenAiOrganizationUsageList? {
        val query = buildQueryString(listOf(
            QueryParameterSpec("start_time", startTime, "form", true, false, null),
            QueryParameterSpec("end_time", endTime, "form", true, false, null),
            QueryParameterSpec("bucket_width", bucketWidth, "form", true, false, null),
            QueryParameterSpec("project_ids", projectIds, "form", true, false, null),
            QueryParameterSpec("user_ids", userIds, "form", true, false, null),
            QueryParameterSpec("api_key_ids", apiKeyIds, "form", true, false, null),
            QueryParameterSpec("models", models, "form", true, false, null),
            QueryParameterSpec("group_by", groupBy, "form", true, false, null),
            QueryParameterSpec("page_size", limit, "form", true, false, null),
            QueryParameterSpec("page", page, "form", true, false, null)
        ))
        val raw = client.get(ApiPaths.appendQueryString(ApiPaths.aiPath("/organization/usage/audio_transcriptions"), query))
        return client.convertValue(raw, object : TypeReference<OpenAiOrganizationUsageList>() {})
    }

    /** Get code interpreter session usage */
    suspend fun listUsageCodeInterpreterSessions(startTime: Int? = null, endTime: Int? = null, bucketWidth: String? = null, projectIds: List<String>? = null, userIds: List<String>? = null, apiKeyIds: List<String>? = null, models: List<String>? = null, groupBy: List<String>? = null, limit: Int? = null, page: String? = null): OpenAiOrganizationUsageList? {
        val query = buildQueryString(listOf(
            QueryParameterSpec("start_time", startTime, "form", true, false, null),
            QueryParameterSpec("end_time", endTime, "form", true, false, null),
            QueryParameterSpec("bucket_width", bucketWidth, "form", true, false, null),
            QueryParameterSpec("project_ids", projectIds, "form", true, false, null),
            QueryParameterSpec("user_ids", userIds, "form", true, false, null),
            QueryParameterSpec("api_key_ids", apiKeyIds, "form", true, false, null),
            QueryParameterSpec("models", models, "form", true, false, null),
            QueryParameterSpec("group_by", groupBy, "form", true, false, null),
            QueryParameterSpec("page_size", limit, "form", true, false, null),
            QueryParameterSpec("page", page, "form", true, false, null)
        ))
        val raw = client.get(ApiPaths.appendQueryString(ApiPaths.aiPath("/organization/usage/code_interpreter_sessions"), query))
        return client.convertValue(raw, object : TypeReference<OpenAiOrganizationUsageList>() {})
    }

    /** Get completions usage */
    suspend fun listUsageCompletions(startTime: Int? = null, endTime: Int? = null, bucketWidth: String? = null, projectIds: List<String>? = null, userIds: List<String>? = null, apiKeyIds: List<String>? = null, models: List<String>? = null, groupBy: List<String>? = null, limit: Int? = null, page: String? = null): OpenAiOrganizationUsageList? {
        val query = buildQueryString(listOf(
            QueryParameterSpec("start_time", startTime, "form", true, false, null),
            QueryParameterSpec("end_time", endTime, "form", true, false, null),
            QueryParameterSpec("bucket_width", bucketWidth, "form", true, false, null),
            QueryParameterSpec("project_ids", projectIds, "form", true, false, null),
            QueryParameterSpec("user_ids", userIds, "form", true, false, null),
            QueryParameterSpec("api_key_ids", apiKeyIds, "form", true, false, null),
            QueryParameterSpec("models", models, "form", true, false, null),
            QueryParameterSpec("group_by", groupBy, "form", true, false, null),
            QueryParameterSpec("page_size", limit, "form", true, false, null),
            QueryParameterSpec("page", page, "form", true, false, null)
        ))
        val raw = client.get(ApiPaths.appendQueryString(ApiPaths.aiPath("/organization/usage/completions"), query))
        return client.convertValue(raw, object : TypeReference<OpenAiOrganizationUsageList>() {})
    }

    /** Get embeddings usage */
    suspend fun listUsageEmbeddings(startTime: Int? = null, endTime: Int? = null, bucketWidth: String? = null, projectIds: List<String>? = null, userIds: List<String>? = null, apiKeyIds: List<String>? = null, models: List<String>? = null, groupBy: List<String>? = null, limit: Int? = null, page: String? = null): OpenAiOrganizationUsageList? {
        val query = buildQueryString(listOf(
            QueryParameterSpec("start_time", startTime, "form", true, false, null),
            QueryParameterSpec("end_time", endTime, "form", true, false, null),
            QueryParameterSpec("bucket_width", bucketWidth, "form", true, false, null),
            QueryParameterSpec("project_ids", projectIds, "form", true, false, null),
            QueryParameterSpec("user_ids", userIds, "form", true, false, null),
            QueryParameterSpec("api_key_ids", apiKeyIds, "form", true, false, null),
            QueryParameterSpec("models", models, "form", true, false, null),
            QueryParameterSpec("group_by", groupBy, "form", true, false, null),
            QueryParameterSpec("page_size", limit, "form", true, false, null),
            QueryParameterSpec("page", page, "form", true, false, null)
        ))
        val raw = client.get(ApiPaths.appendQueryString(ApiPaths.aiPath("/organization/usage/embeddings"), query))
        return client.convertValue(raw, object : TypeReference<OpenAiOrganizationUsageList>() {})
    }

    /** Get image usage */
    suspend fun listUsageImages(startTime: Int? = null, endTime: Int? = null, bucketWidth: String? = null, projectIds: List<String>? = null, userIds: List<String>? = null, apiKeyIds: List<String>? = null, models: List<String>? = null, groupBy: List<String>? = null, limit: Int? = null, page: String? = null): OpenAiOrganizationUsageList? {
        val query = buildQueryString(listOf(
            QueryParameterSpec("start_time", startTime, "form", true, false, null),
            QueryParameterSpec("end_time", endTime, "form", true, false, null),
            QueryParameterSpec("bucket_width", bucketWidth, "form", true, false, null),
            QueryParameterSpec("project_ids", projectIds, "form", true, false, null),
            QueryParameterSpec("user_ids", userIds, "form", true, false, null),
            QueryParameterSpec("api_key_ids", apiKeyIds, "form", true, false, null),
            QueryParameterSpec("models", models, "form", true, false, null),
            QueryParameterSpec("group_by", groupBy, "form", true, false, null),
            QueryParameterSpec("page_size", limit, "form", true, false, null),
            QueryParameterSpec("page", page, "form", true, false, null)
        ))
        val raw = client.get(ApiPaths.appendQueryString(ApiPaths.aiPath("/organization/usage/images"), query))
        return client.convertValue(raw, object : TypeReference<OpenAiOrganizationUsageList>() {})
    }

    /** Get moderation usage */
    suspend fun listUsageModerations(startTime: Int? = null, endTime: Int? = null, bucketWidth: String? = null, projectIds: List<String>? = null, userIds: List<String>? = null, apiKeyIds: List<String>? = null, models: List<String>? = null, groupBy: List<String>? = null, limit: Int? = null, page: String? = null): OpenAiOrganizationUsageList? {
        val query = buildQueryString(listOf(
            QueryParameterSpec("start_time", startTime, "form", true, false, null),
            QueryParameterSpec("end_time", endTime, "form", true, false, null),
            QueryParameterSpec("bucket_width", bucketWidth, "form", true, false, null),
            QueryParameterSpec("project_ids", projectIds, "form", true, false, null),
            QueryParameterSpec("user_ids", userIds, "form", true, false, null),
            QueryParameterSpec("api_key_ids", apiKeyIds, "form", true, false, null),
            QueryParameterSpec("models", models, "form", true, false, null),
            QueryParameterSpec("group_by", groupBy, "form", true, false, null),
            QueryParameterSpec("page_size", limit, "form", true, false, null),
            QueryParameterSpec("page", page, "form", true, false, null)
        ))
        val raw = client.get(ApiPaths.appendQueryString(ApiPaths.aiPath("/organization/usage/moderations"), query))
        return client.convertValue(raw, object : TypeReference<OpenAiOrganizationUsageList>() {})
    }

    /** Get vector store usage */
    suspend fun listUsageVectorStores(startTime: Int? = null, endTime: Int? = null, bucketWidth: String? = null, projectIds: List<String>? = null, userIds: List<String>? = null, apiKeyIds: List<String>? = null, models: List<String>? = null, groupBy: List<String>? = null, limit: Int? = null, page: String? = null): OpenAiOrganizationUsageList? {
        val query = buildQueryString(listOf(
            QueryParameterSpec("start_time", startTime, "form", true, false, null),
            QueryParameterSpec("end_time", endTime, "form", true, false, null),
            QueryParameterSpec("bucket_width", bucketWidth, "form", true, false, null),
            QueryParameterSpec("project_ids", projectIds, "form", true, false, null),
            QueryParameterSpec("user_ids", userIds, "form", true, false, null),
            QueryParameterSpec("api_key_ids", apiKeyIds, "form", true, false, null),
            QueryParameterSpec("models", models, "form", true, false, null),
            QueryParameterSpec("group_by", groupBy, "form", true, false, null),
            QueryParameterSpec("page_size", limit, "form", true, false, null),
            QueryParameterSpec("page", page, "form", true, false, null)
        ))
        val raw = client.get(ApiPaths.appendQueryString(ApiPaths.aiPath("/organization/usage/vector_stores"), query))
        return client.convertValue(raw, object : TypeReference<OpenAiOrganizationUsageList>() {})
    }

    /** List organization users */
    suspend fun listUsers(limit: Int? = null, order: String? = null, after: String? = null, before: String? = null): OpenAiOrganizationUserList? {
        val query = buildQueryString(listOf(
            QueryParameterSpec("page_size", limit, "form", true, false, null),
            QueryParameterSpec("order", order, "form", true, false, null),
            QueryParameterSpec("after", after, "form", true, false, null),
            QueryParameterSpec("before", before, "form", true, false, null)
        ))
        val raw = client.get(ApiPaths.appendQueryString(ApiPaths.aiPath("/organization/users"), query))
        return client.convertValue(raw, object : TypeReference<OpenAiOrganizationUserList>() {})
    }

    /** Delete organization user */
    suspend fun deleteUsers(userId: String): DeleteResult? {
        val raw = client.delete(ApiPaths.aiPath("/organization/users/${serializePathParameter(userId, PathParameterSpec("user_id", "simple", false))}"))
        return client.convertValue(raw, object : TypeReference<DeleteResult>() {})
    }

    /** Modify organization user */
    suspend fun createUser(userId: String, body: OpenAiOrganizationUserUpdateRequest): OpenAiOrganizationUser? {
        val raw = client.post(ApiPaths.aiPath("/organization/users/${serializePathParameter(userId, PathParameterSpec("user_id", "simple", false))}"), body, null, null, "application/json")
        return client.convertValue(raw, object : TypeReference<OpenAiOrganizationUser>() {})
    }

    /** List organization user roles */
    suspend fun listUsersRoles(userId: String, limit: Int? = null, order: String? = null, after: String? = null, before: String? = null): OpenAiRoleAssignmentList? {
        val query = buildQueryString(listOf(
            QueryParameterSpec("page_size", limit, "form", true, false, null),
            QueryParameterSpec("order", order, "form", true, false, null),
            QueryParameterSpec("after", after, "form", true, false, null),
            QueryParameterSpec("before", before, "form", true, false, null)
        ))
        val raw = client.get(ApiPaths.appendQueryString(ApiPaths.aiPath("/organization/users/${serializePathParameter(userId, PathParameterSpec("user_id", "simple", false))}/roles"), query))
        return client.convertValue(raw, object : TypeReference<OpenAiRoleAssignmentList>() {})
    }

    /** Create organization user role */
    suspend fun createUsersRole(userId: String, body: OpenAiRoleAssignmentCreateRequest): OpenAiRoleAssignment? {
        val raw = client.post(ApiPaths.aiPath("/organization/users/${serializePathParameter(userId, PathParameterSpec("user_id", "simple", false))}/roles"), body, null, null, "application/json")
        return client.convertValue(raw, object : TypeReference<OpenAiRoleAssignment>() {})
    }

    /** Delete organization user role */
    suspend fun deleteUsersRoles(userId: String, roleId: String): DeleteResult? {
        val raw = client.delete(ApiPaths.aiPath("/organization/users/${serializePathParameter(userId, PathParameterSpec("user_id", "simple", false))}/roles/${serializePathParameter(roleId, PathParameterSpec("role_id", "simple", false))}"))
        return client.convertValue(raw, object : TypeReference<DeleteResult>() {})
    }

    private data class PathParameterSpec(val name: String, val style: String, val explode: Boolean)

    private fun serializePathParameter(value: Any?, spec: PathParameterSpec): String {
        if (value == null) return ""
        val style = spec.style.ifBlank { "simple" }
        return when (value) {
            is Iterable<*> -> serializePathArray(spec.name, value, style, spec.explode)
            is Map<*, *> -> serializePathObject(spec.name, value, style, spec.explode)
            else -> pathPrimitivePrefix(spec.name, style) + pathEncode(value.toString())
        }
    }

    private fun serializePathArray(name: String, values: Iterable<*>, style: String, explode: Boolean): String {
        val serialized = values.mapNotNull { it?.toString()?.let(::pathEncode) }
        if (serialized.isEmpty()) return pathPrefix(name, style)
        if (style == "matrix") {
            if (explode) {
                return serialized.joinToString("") { ";$name=$it" }
            }
            return ";$name=" + serialized.joinToString(",")
        }
        val separator = if (explode) "." else ","
        return pathPrefix(name, style) + serialized.joinToString(separator)
    }

    private fun serializePathObject(name: String, values: Map<*, *>, style: String, explode: Boolean): String {
        val entries = mutableListOf<String>()
        val exploded = mutableListOf<String>()
        values.forEach { (key, value) ->
            if (value == null) return@forEach
            val escapedKey = pathEncode(key.toString())
            val escapedValue = pathEncode(value.toString())
            if (explode) {
                if (style == "matrix") {
                    exploded += ";$escapedKey=$escapedValue"
                } else {
                    exploded += "$escapedKey=$escapedValue"
                }
            } else {
                entries += escapedKey
                entries += escapedValue
            }
        }
        if (style == "matrix") {
            if (explode) return exploded.joinToString("")
            return ";$name=" + entries.joinToString(",")
        }
        if (explode) {
            val separator = if (style == "label") "." else ","
            return pathPrefix(name, style) + exploded.joinToString(separator)
        }
        return pathPrefix(name, style) + entries.joinToString(",")
    }

    private fun pathPrefix(name: String, style: String): String {
        return when (style) {
            "label" -> "."
            "matrix" -> ";$name"
            else -> ""
        }
    }

    private fun pathPrimitivePrefix(name: String, style: String): String {
        return if (style == "matrix") ";$name=" else pathPrefix(name, style)
    }

    private fun pathEncode(value: String): String {
        return java.net.URLEncoder.encode(value, java.nio.charset.StandardCharsets.UTF_8).replace("+", "%20")
    }

    private data class QueryParameterSpec(
        val name: String,
        val value: Any?,
        val style: String,
        val explode: Boolean,
        val allowReserved: Boolean,
        val contentType: String?,
    )

    private val queryObjectMapper = ObjectMapper().registerKotlinModule()

    private fun buildQueryString(parameters: List<QueryParameterSpec>): String {
        val pairs = mutableListOf<String>()
        parameters.forEach { appendSerializedParameter(pairs, it) }
        return pairs.joinToString("&")
    }

    private fun appendSerializedParameter(pairs: MutableList<String>, parameter: QueryParameterSpec) {
        val value = parameter.value ?: return
        if (!parameter.contentType.isNullOrBlank()) {
            val json = queryObjectMapper.writeValueAsString(value)
            pairs += urlEncode(parameter.name) + "=" + encodeQueryValue(json, parameter.allowReserved)
            return
        }

        val style = parameter.style.ifBlank { "form" }
        when (value) {
            is Iterable<*> -> appendArrayParameter(pairs, parameter.name, value, style, parameter.explode, parameter.allowReserved)
            is Map<*, *> -> if (style == "deepObject") {
                appendDeepObjectParameter(pairs, parameter.name, value, parameter.allowReserved)
            } else {
                appendObjectParameter(pairs, parameter.name, value, style, parameter.explode, parameter.allowReserved)
            }
            else -> pairs += urlEncode(parameter.name) + "=" + encodeQueryValue(value.toString(), parameter.allowReserved)
        }
    }

    private fun appendArrayParameter(
        pairs: MutableList<String>,
        name: String,
        values: Iterable<*>,
        style: String,
        explode: Boolean,
        allowReserved: Boolean,
    ) {
        val serialized = values.mapNotNull { it?.toString() }
        if (serialized.isEmpty()) return
        if (style == "form" && explode) {
            serialized.forEach { pairs += urlEncode(name) + "=" + encodeQueryValue(it, allowReserved) }
            return
        }
        pairs += urlEncode(name) + "=" + encodeQueryValue(serialized.joinToString(","), allowReserved)
    }

    private fun appendObjectParameter(
        pairs: MutableList<String>,
        name: String,
        values: Map<*, *>,
        style: String,
        explode: Boolean,
        allowReserved: Boolean,
    ) {
        val serialized = mutableListOf<String>()
        values.forEach { (key, value) ->
            if (value == null) return@forEach
            if (style == "form" && explode) {
                pairs += urlEncode(key.toString()) + "=" + encodeQueryValue(value.toString(), allowReserved)
            } else {
                serialized += key.toString()
                serialized += value.toString()
            }
        }
        if (serialized.isNotEmpty()) {
            pairs += urlEncode(name) + "=" + encodeQueryValue(serialized.joinToString(","), allowReserved)
        }
    }

    private fun appendDeepObjectParameter(pairs: MutableList<String>, name: String, values: Map<*, *>, allowReserved: Boolean) {
        values.forEach { (key, value) ->
            if (value != null) {
                pairs += urlEncode("$name[$key]") + "=" + encodeQueryValue(value.toString(), allowReserved)
            }
        }
    }

    private fun encodeQueryValue(value: String, allowReserved: Boolean): String {
        var encoded = urlEncode(value)
        if (!allowReserved) return encoded
        mapOf(
            "%3A" to ":", "%2F" to "/", "%3F" to "?", "%23" to "#",
            "%5B" to "[", "%5D" to "]", "%40" to "@", "%21" to "!",
            "%24" to "$", "%26" to "&", "%27" to "'", "%28" to "(",
            "%29" to ")", "%2A" to "*", "%2B" to "+", "%2C" to ",",
            "%3B" to ";", "%3D" to "=",
        ).forEach { (escaped, reserved) -> encoded = encoded.replace(escaped, reserved) }
        return encoded
    }

    private fun urlEncode(value: String): String {
        return java.net.URLEncoder.encode(value, java.nio.charset.StandardCharsets.UTF_8)
    }

}
