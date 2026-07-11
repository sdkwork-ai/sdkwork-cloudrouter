package com.sdkwork.clawrouter.open.api;

import com.fasterxml.jackson.core.type.TypeReference;
import com.sdkwork.clawrouter.open.http.HttpClient;
import com.sdkwork.clawrouter.open.model.*;
import java.util.List;
import java.util.Map;

public class OrganizationApi {
    private final HttpClient client;

    public OrganizationApi(HttpClient client) {
        this.client = client;
    }

    /** List organization admin API keys */
    public OpenAiOrganizationAdminApiKeyList listAdminApiKeys(Integer limit, String order, String after, String before) throws Exception {
        String query = buildQueryString(List.of(
            new QueryParameterSpec("page_size", limit, "form", true, false, null),
            new QueryParameterSpec("order", order, "form", true, false, null),
            new QueryParameterSpec("after", after, "form", true, false, null),
            new QueryParameterSpec("before", before, "form", true, false, null)
        ));
        Object raw = client.get(ApiPaths.appendQueryString(ApiPaths.aiPath("/organization/admin_api_keys"), query));
        return client.convertValue(raw, new TypeReference<OpenAiOrganizationAdminApiKeyList>() {});
    }

    /** Create organization admin API key */
    public OpenAiOrganizationAdminApiKey createAdminApiKey(OpenAiOrganizationAdminApiKeyCreateRequest body) throws Exception {
        Object raw = client.post(ApiPaths.aiPath("/organization/admin_api_keys"), body, null, null, "application/json");
        return client.convertValue(raw, new TypeReference<OpenAiOrganizationAdminApiKey>() {});
    }

    /** Delete organization admin API key */
    public DeleteResult deleteAdminApiKeys(String keyId) throws Exception {
        Object raw = client.delete(ApiPaths.aiPath("/organization/admin_api_keys/" + serializePathParameter(keyId, new PathParameterSpec("key_id", "simple", false)) + ""));
        return client.convertValue(raw, new TypeReference<DeleteResult>() {});
    }

    /** List organization audit logs */
    public OpenAiOrganizationAuditLogList listAuditLogs(Integer effectiveAtGte, Integer effectiveAtLte, List<String> projectIds, List<String> eventTypes, List<String> actorIds, List<String> actorEmails, List<String> resourceIds, Integer limit, String after, String before) throws Exception {
        String query = buildQueryString(List.of(
            new QueryParameterSpec("effective_at[gte]", effectiveAtGte, "form", true, false, null),
            new QueryParameterSpec("effective_at[lte]", effectiveAtLte, "form", true, false, null),
            new QueryParameterSpec("project_ids[]", projectIds, "form", true, false, null),
            new QueryParameterSpec("event_types[]", eventTypes, "form", true, false, null),
            new QueryParameterSpec("actor_ids[]", actorIds, "form", true, false, null),
            new QueryParameterSpec("actor_emails[]", actorEmails, "form", true, false, null),
            new QueryParameterSpec("resource_ids[]", resourceIds, "form", true, false, null),
            new QueryParameterSpec("page_size", limit, "form", true, false, null),
            new QueryParameterSpec("after", after, "form", true, false, null),
            new QueryParameterSpec("before", before, "form", true, false, null)
        ));
        Object raw = client.get(ApiPaths.appendQueryString(ApiPaths.aiPath("/organization/audit_logs"), query));
        return client.convertValue(raw, new TypeReference<OpenAiOrganizationAuditLogList>() {});
    }

    /** List organization certificates */
    public OpenAiCertificateList listCertificates(Integer limit, String order, String after, String before) throws Exception {
        String query = buildQueryString(List.of(
            new QueryParameterSpec("page_size", limit, "form", true, false, null),
            new QueryParameterSpec("order", order, "form", true, false, null),
            new QueryParameterSpec("after", after, "form", true, false, null),
            new QueryParameterSpec("before", before, "form", true, false, null)
        ));
        Object raw = client.get(ApiPaths.appendQueryString(ApiPaths.aiPath("/organization/certificates"), query));
        return client.convertValue(raw, new TypeReference<OpenAiCertificateList>() {});
    }

    /** Upload organization certificate */
    public OpenAiCertificate createCertificate(OpenAiCertificateUploadMultipartRequest body) throws Exception {
        Object raw = client.post(ApiPaths.aiPath("/organization/certificates"), body, null, null, "multipart/form-data");
        return client.convertValue(raw, new TypeReference<OpenAiCertificate>() {});
    }

    /** Activate organization certificates */
    public OpenAiCertificateList createCertificatesActivate(OpenAiCertificateActivationRequest body) throws Exception {
        Object raw = client.post(ApiPaths.aiPath("/organization/certificates/activate"), body, null, null, "application/json");
        return client.convertValue(raw, new TypeReference<OpenAiCertificateList>() {});
    }

    /** Deactivate organization certificates */
    public OpenAiCertificateList createCertificatesDeactivate(OpenAiCertificateActivationRequest body) throws Exception {
        Object raw = client.post(ApiPaths.aiPath("/organization/certificates/deactivate"), body, null, null, "application/json");
        return client.convertValue(raw, new TypeReference<OpenAiCertificateList>() {});
    }

    /** Delete organization certificate */
    public DeleteResult deleteCertificates(String certificateId) throws Exception {
        Object raw = client.delete(ApiPaths.aiPath("/organization/certificates/" + serializePathParameter(certificateId, new PathParameterSpec("certificate_id", "simple", false)) + ""));
        return client.convertValue(raw, new TypeReference<DeleteResult>() {});
    }

    /** Get organization costs */
    public OpenAiOrganizationCostList listCosts(Integer startTime, Integer endTime, String bucketWidth, List<String> projectIds, List<String> userIds, List<String> apiKeyIds, List<String> models, List<String> groupBy, Integer limit, String page) throws Exception {
        String query = buildQueryString(List.of(
            new QueryParameterSpec("start_time", startTime, "form", true, false, null),
            new QueryParameterSpec("end_time", endTime, "form", true, false, null),
            new QueryParameterSpec("bucket_width", bucketWidth, "form", true, false, null),
            new QueryParameterSpec("project_ids", projectIds, "form", true, false, null),
            new QueryParameterSpec("user_ids", userIds, "form", true, false, null),
            new QueryParameterSpec("api_key_ids", apiKeyIds, "form", true, false, null),
            new QueryParameterSpec("models", models, "form", true, false, null),
            new QueryParameterSpec("group_by", groupBy, "form", true, false, null),
            new QueryParameterSpec("page_size", limit, "form", true, false, null),
            new QueryParameterSpec("page", page, "form", true, false, null)
        ));
        Object raw = client.get(ApiPaths.appendQueryString(ApiPaths.aiPath("/organization/costs"), query));
        return client.convertValue(raw, new TypeReference<OpenAiOrganizationCostList>() {});
    }

    /** List organization groups */
    public OpenAiOrganizationGroupList listGroups(Integer limit, String order, String after, String before) throws Exception {
        String query = buildQueryString(List.of(
            new QueryParameterSpec("page_size", limit, "form", true, false, null),
            new QueryParameterSpec("order", order, "form", true, false, null),
            new QueryParameterSpec("after", after, "form", true, false, null),
            new QueryParameterSpec("before", before, "form", true, false, null)
        ));
        Object raw = client.get(ApiPaths.appendQueryString(ApiPaths.aiPath("/organization/groups"), query));
        return client.convertValue(raw, new TypeReference<OpenAiOrganizationGroupList>() {});
    }

    /** Create organization group */
    public OpenAiOrganizationGroup createGroup(OpenAiOrganizationGroupCreateRequest body) throws Exception {
        Object raw = client.post(ApiPaths.aiPath("/organization/groups"), body, null, null, "application/json");
        return client.convertValue(raw, new TypeReference<OpenAiOrganizationGroup>() {});
    }

    /** Delete organization group */
    public DeleteResult deleteGroups(String groupId) throws Exception {
        Object raw = client.delete(ApiPaths.aiPath("/organization/groups/" + serializePathParameter(groupId, new PathParameterSpec("group_id", "simple", false)) + ""));
        return client.convertValue(raw, new TypeReference<DeleteResult>() {});
    }

    /** List organization group roles */
    public OpenAiRoleAssignmentList listGroupsRoles(String groupId, Integer limit, String order, String after, String before) throws Exception {
        String query = buildQueryString(List.of(
            new QueryParameterSpec("page_size", limit, "form", true, false, null),
            new QueryParameterSpec("order", order, "form", true, false, null),
            new QueryParameterSpec("after", after, "form", true, false, null),
            new QueryParameterSpec("before", before, "form", true, false, null)
        ));
        Object raw = client.get(ApiPaths.appendQueryString(ApiPaths.aiPath("/organization/groups/" + serializePathParameter(groupId, new PathParameterSpec("group_id", "simple", false)) + "/roles"), query));
        return client.convertValue(raw, new TypeReference<OpenAiRoleAssignmentList>() {});
    }

    /** Create organization group role */
    public OpenAiRoleAssignment createGroupsRole(String groupId, OpenAiRoleAssignmentCreateRequest body) throws Exception {
        Object raw = client.post(ApiPaths.aiPath("/organization/groups/" + serializePathParameter(groupId, new PathParameterSpec("group_id", "simple", false)) + "/roles"), body, null, null, "application/json");
        return client.convertValue(raw, new TypeReference<OpenAiRoleAssignment>() {});
    }

    /** Delete organization group role */
    public DeleteResult deleteGroupsRoles(String groupId, String roleId) throws Exception {
        Object raw = client.delete(ApiPaths.aiPath("/organization/groups/" + serializePathParameter(groupId, new PathParameterSpec("group_id", "simple", false)) + "/roles/" + serializePathParameter(roleId, new PathParameterSpec("role_id", "simple", false)) + ""));
        return client.convertValue(raw, new TypeReference<DeleteResult>() {});
    }

    /** List organization group users */
    public OpenAiOrganizationUserList listGroupsUsers(String groupId, Integer limit, String order, String after, String before) throws Exception {
        String query = buildQueryString(List.of(
            new QueryParameterSpec("page_size", limit, "form", true, false, null),
            new QueryParameterSpec("order", order, "form", true, false, null),
            new QueryParameterSpec("after", after, "form", true, false, null),
            new QueryParameterSpec("before", before, "form", true, false, null)
        ));
        Object raw = client.get(ApiPaths.appendQueryString(ApiPaths.aiPath("/organization/groups/" + serializePathParameter(groupId, new PathParameterSpec("group_id", "simple", false)) + "/users"), query));
        return client.convertValue(raw, new TypeReference<OpenAiOrganizationUserList>() {});
    }

    /** Add organization group user */
    public OpenAiOrganizationUser createGroupsUser(String groupId, OpenAiOrganizationGroupUserCreateRequest body) throws Exception {
        Object raw = client.post(ApiPaths.aiPath("/organization/groups/" + serializePathParameter(groupId, new PathParameterSpec("group_id", "simple", false)) + "/users"), body, null, null, "application/json");
        return client.convertValue(raw, new TypeReference<OpenAiOrganizationUser>() {});
    }

    /** Delete organization group user */
    public DeleteResult deleteGroupsUsers(String groupId, String userId) throws Exception {
        Object raw = client.delete(ApiPaths.aiPath("/organization/groups/" + serializePathParameter(groupId, new PathParameterSpec("group_id", "simple", false)) + "/users/" + serializePathParameter(userId, new PathParameterSpec("user_id", "simple", false)) + ""));
        return client.convertValue(raw, new TypeReference<DeleteResult>() {});
    }

    /** List organization invites */
    public OpenAiOrganizationInviteList listInvites(Integer limit, String order, String after, String before) throws Exception {
        String query = buildQueryString(List.of(
            new QueryParameterSpec("page_size", limit, "form", true, false, null),
            new QueryParameterSpec("order", order, "form", true, false, null),
            new QueryParameterSpec("after", after, "form", true, false, null),
            new QueryParameterSpec("before", before, "form", true, false, null)
        ));
        Object raw = client.get(ApiPaths.appendQueryString(ApiPaths.aiPath("/organization/invites"), query));
        return client.convertValue(raw, new TypeReference<OpenAiOrganizationInviteList>() {});
    }

    /** Create organization invite */
    public OpenAiOrganizationInvite createInvite(OpenAiOrganizationInviteCreateRequest body) throws Exception {
        Object raw = client.post(ApiPaths.aiPath("/organization/invites"), body, null, null, "application/json");
        return client.convertValue(raw, new TypeReference<OpenAiOrganizationInvite>() {});
    }

    /** Delete organization invite */
    public DeleteResult deleteInvites(String inviteId) throws Exception {
        Object raw = client.delete(ApiPaths.aiPath("/organization/invites/" + serializePathParameter(inviteId, new PathParameterSpec("invite_id", "simple", false)) + ""));
        return client.convertValue(raw, new TypeReference<DeleteResult>() {});
    }

    /** List organization projects */
    public OpenAiProjectList listProjects(Integer limit, String order, String after, String before) throws Exception {
        String query = buildQueryString(List.of(
            new QueryParameterSpec("page_size", limit, "form", true, false, null),
            new QueryParameterSpec("order", order, "form", true, false, null),
            new QueryParameterSpec("after", after, "form", true, false, null),
            new QueryParameterSpec("before", before, "form", true, false, null)
        ));
        Object raw = client.get(ApiPaths.appendQueryString(ApiPaths.aiPath("/organization/projects"), query));
        return client.convertValue(raw, new TypeReference<OpenAiProjectList>() {});
    }

    /** Create organization project */
    public OpenAiProject createProject(OpenAiProjectCreateRequest body) throws Exception {
        Object raw = client.post(ApiPaths.aiPath("/organization/projects"), body, null, null, "application/json");
        return client.convertValue(raw, new TypeReference<OpenAiProject>() {});
    }

    /** List project API keys */
    public OpenAiProjectApiKeyList listProjectsApiKeys(String projectId, Integer limit, String order, String after, String before) throws Exception {
        String query = buildQueryString(List.of(
            new QueryParameterSpec("page_size", limit, "form", true, false, null),
            new QueryParameterSpec("order", order, "form", true, false, null),
            new QueryParameterSpec("after", after, "form", true, false, null),
            new QueryParameterSpec("before", before, "form", true, false, null)
        ));
        Object raw = client.get(ApiPaths.appendQueryString(ApiPaths.aiPath("/organization/projects/" + serializePathParameter(projectId, new PathParameterSpec("project_id", "simple", false)) + "/api_keys"), query));
        return client.convertValue(raw, new TypeReference<OpenAiProjectApiKeyList>() {});
    }

    /** Delete project API key */
    public DeleteResult deleteProjectsApiKeys(String projectId, String keyId) throws Exception {
        Object raw = client.delete(ApiPaths.aiPath("/organization/projects/" + serializePathParameter(projectId, new PathParameterSpec("project_id", "simple", false)) + "/api_keys/" + serializePathParameter(keyId, new PathParameterSpec("key_id", "simple", false)) + ""));
        return client.convertValue(raw, new TypeReference<DeleteResult>() {});
    }

    /** Archive organization project */
    public OpenAiProject createProjectsArchive(String projectId) throws Exception {
        Object raw = client.post(ApiPaths.aiPath("/organization/projects/" + serializePathParameter(projectId, new PathParameterSpec("project_id", "simple", false)) + "/archive"), null);
        return client.convertValue(raw, new TypeReference<OpenAiProject>() {});
    }

    /** List project certificates */
    public OpenAiCertificateList listProjectsCertificates(String projectId, Integer limit, String order, String after, String before) throws Exception {
        String query = buildQueryString(List.of(
            new QueryParameterSpec("page_size", limit, "form", true, false, null),
            new QueryParameterSpec("order", order, "form", true, false, null),
            new QueryParameterSpec("after", after, "form", true, false, null),
            new QueryParameterSpec("before", before, "form", true, false, null)
        ));
        Object raw = client.get(ApiPaths.appendQueryString(ApiPaths.aiPath("/organization/projects/" + serializePathParameter(projectId, new PathParameterSpec("project_id", "simple", false)) + "/certificates"), query));
        return client.convertValue(raw, new TypeReference<OpenAiCertificateList>() {});
    }

    /** Activate project certificates */
    public OpenAiCertificateList createProjectsCertificatesActivate(String projectId, OpenAiCertificateActivationRequest body) throws Exception {
        Object raw = client.post(ApiPaths.aiPath("/organization/projects/" + serializePathParameter(projectId, new PathParameterSpec("project_id", "simple", false)) + "/certificates/activate"), body, null, null, "application/json");
        return client.convertValue(raw, new TypeReference<OpenAiCertificateList>() {});
    }

    /** Deactivate project certificates */
    public OpenAiCertificateList createProjectsCertificatesDeactivate(String projectId, OpenAiCertificateActivationRequest body) throws Exception {
        Object raw = client.post(ApiPaths.aiPath("/organization/projects/" + serializePathParameter(projectId, new PathParameterSpec("project_id", "simple", false)) + "/certificates/deactivate"), body, null, null, "application/json");
        return client.convertValue(raw, new TypeReference<OpenAiCertificateList>() {});
    }

    /** List project groups */
    public OpenAiOrganizationGroupList listProjectsGroups(String projectId, Integer limit, String order, String after, String before) throws Exception {
        String query = buildQueryString(List.of(
            new QueryParameterSpec("page_size", limit, "form", true, false, null),
            new QueryParameterSpec("order", order, "form", true, false, null),
            new QueryParameterSpec("after", after, "form", true, false, null),
            new QueryParameterSpec("before", before, "form", true, false, null)
        ));
        Object raw = client.get(ApiPaths.appendQueryString(ApiPaths.aiPath("/organization/projects/" + serializePathParameter(projectId, new PathParameterSpec("project_id", "simple", false)) + "/groups"), query));
        return client.convertValue(raw, new TypeReference<OpenAiOrganizationGroupList>() {});
    }

    /** Create project group */
    public OpenAiOrganizationGroup createProjectsGroup(String projectId, OpenAiProjectGroupCreateRequest body) throws Exception {
        Object raw = client.post(ApiPaths.aiPath("/organization/projects/" + serializePathParameter(projectId, new PathParameterSpec("project_id", "simple", false)) + "/groups"), body, null, null, "application/json");
        return client.convertValue(raw, new TypeReference<OpenAiOrganizationGroup>() {});
    }

    /** Delete project group */
    public DeleteResult deleteProjectsGroups(String projectId, String groupId) throws Exception {
        Object raw = client.delete(ApiPaths.aiPath("/organization/projects/" + serializePathParameter(projectId, new PathParameterSpec("project_id", "simple", false)) + "/groups/" + serializePathParameter(groupId, new PathParameterSpec("group_id", "simple", false)) + ""));
        return client.convertValue(raw, new TypeReference<DeleteResult>() {});
    }

    /** List project rate limits */
    public OpenAiProjectRateLimitList listProjectsRateLimits(String projectId, Integer limit, String order, String after, String before) throws Exception {
        String query = buildQueryString(List.of(
            new QueryParameterSpec("page_size", limit, "form", true, false, null),
            new QueryParameterSpec("order", order, "form", true, false, null),
            new QueryParameterSpec("after", after, "form", true, false, null),
            new QueryParameterSpec("before", before, "form", true, false, null)
        ));
        Object raw = client.get(ApiPaths.appendQueryString(ApiPaths.aiPath("/organization/projects/" + serializePathParameter(projectId, new PathParameterSpec("project_id", "simple", false)) + "/rate_limits"), query));
        return client.convertValue(raw, new TypeReference<OpenAiProjectRateLimitList>() {});
    }

    /** Modify project rate limit */
    public OpenAiProjectRateLimit createProjectsRateLimit(String projectId, String rateLimitId, OpenAiProjectRateLimitUpdateRequest body) throws Exception {
        Object raw = client.post(ApiPaths.aiPath("/organization/projects/" + serializePathParameter(projectId, new PathParameterSpec("project_id", "simple", false)) + "/rate_limits/" + serializePathParameter(rateLimitId, new PathParameterSpec("rate_limit_id", "simple", false)) + ""), body, null, null, "application/json");
        return client.convertValue(raw, new TypeReference<OpenAiProjectRateLimit>() {});
    }

    /** List project service accounts */
    public OpenAiProjectServiceAccountList listProjectsServiceAccounts(String projectId, Integer limit, String order, String after, String before) throws Exception {
        String query = buildQueryString(List.of(
            new QueryParameterSpec("page_size", limit, "form", true, false, null),
            new QueryParameterSpec("order", order, "form", true, false, null),
            new QueryParameterSpec("after", after, "form", true, false, null),
            new QueryParameterSpec("before", before, "form", true, false, null)
        ));
        Object raw = client.get(ApiPaths.appendQueryString(ApiPaths.aiPath("/organization/projects/" + serializePathParameter(projectId, new PathParameterSpec("project_id", "simple", false)) + "/service_accounts"), query));
        return client.convertValue(raw, new TypeReference<OpenAiProjectServiceAccountList>() {});
    }

    /** Create project service account */
    public OpenAiProjectServiceAccount createProjectsServiceAccount(String projectId, OpenAiProjectServiceAccountCreateRequest body) throws Exception {
        Object raw = client.post(ApiPaths.aiPath("/organization/projects/" + serializePathParameter(projectId, new PathParameterSpec("project_id", "simple", false)) + "/service_accounts"), body, null, null, "application/json");
        return client.convertValue(raw, new TypeReference<OpenAiProjectServiceAccount>() {});
    }

    /** Delete project service account */
    public DeleteResult deleteProjectsServiceAccounts(String projectId, String serviceAccountId) throws Exception {
        Object raw = client.delete(ApiPaths.aiPath("/organization/projects/" + serializePathParameter(projectId, new PathParameterSpec("project_id", "simple", false)) + "/service_accounts/" + serializePathParameter(serviceAccountId, new PathParameterSpec("service_account_id", "simple", false)) + ""));
        return client.convertValue(raw, new TypeReference<DeleteResult>() {});
    }

    /** List project users */
    public OpenAiProjectUserList listProjectsUsers(String projectId, Integer limit, String order, String after, String before) throws Exception {
        String query = buildQueryString(List.of(
            new QueryParameterSpec("page_size", limit, "form", true, false, null),
            new QueryParameterSpec("order", order, "form", true, false, null),
            new QueryParameterSpec("after", after, "form", true, false, null),
            new QueryParameterSpec("before", before, "form", true, false, null)
        ));
        Object raw = client.get(ApiPaths.appendQueryString(ApiPaths.aiPath("/organization/projects/" + serializePathParameter(projectId, new PathParameterSpec("project_id", "simple", false)) + "/users"), query));
        return client.convertValue(raw, new TypeReference<OpenAiProjectUserList>() {});
    }

    /** Create project user */
    public OpenAiProjectUser createProjectsUser(String projectId, OpenAiProjectUserCreateRequest body) throws Exception {
        Object raw = client.post(ApiPaths.aiPath("/organization/projects/" + serializePathParameter(projectId, new PathParameterSpec("project_id", "simple", false)) + "/users"), body, null, null, "application/json");
        return client.convertValue(raw, new TypeReference<OpenAiProjectUser>() {});
    }

    /** Delete project user */
    public DeleteResult deleteProjectsUsers(String projectId, String userId) throws Exception {
        Object raw = client.delete(ApiPaths.aiPath("/organization/projects/" + serializePathParameter(projectId, new PathParameterSpec("project_id", "simple", false)) + "/users/" + serializePathParameter(userId, new PathParameterSpec("user_id", "simple", false)) + ""));
        return client.convertValue(raw, new TypeReference<DeleteResult>() {});
    }

    /** List organization roles */
    public OpenAiRoleList listRoles(Integer limit, String order, String after, String before) throws Exception {
        String query = buildQueryString(List.of(
            new QueryParameterSpec("page_size", limit, "form", true, false, null),
            new QueryParameterSpec("order", order, "form", true, false, null),
            new QueryParameterSpec("after", after, "form", true, false, null),
            new QueryParameterSpec("before", before, "form", true, false, null)
        ));
        Object raw = client.get(ApiPaths.appendQueryString(ApiPaths.aiPath("/organization/roles"), query));
        return client.convertValue(raw, new TypeReference<OpenAiRoleList>() {});
    }

    /** Create organization role */
    public OpenAiRole createRole(OpenAiRoleCreateRequest body) throws Exception {
        Object raw = client.post(ApiPaths.aiPath("/organization/roles"), body, null, null, "application/json");
        return client.convertValue(raw, new TypeReference<OpenAiRole>() {});
    }

    /** Delete organization role */
    public DeleteResult deleteRoles(String roleId) throws Exception {
        Object raw = client.delete(ApiPaths.aiPath("/organization/roles/" + serializePathParameter(roleId, new PathParameterSpec("role_id", "simple", false)) + ""));
        return client.convertValue(raw, new TypeReference<DeleteResult>() {});
    }

    /** Get audio speech usage */
    public OpenAiOrganizationUsageList listUsageAudioSpeeches(Integer startTime, Integer endTime, String bucketWidth, List<String> projectIds, List<String> userIds, List<String> apiKeyIds, List<String> models, List<String> groupBy, Integer limit, String page) throws Exception {
        String query = buildQueryString(List.of(
            new QueryParameterSpec("start_time", startTime, "form", true, false, null),
            new QueryParameterSpec("end_time", endTime, "form", true, false, null),
            new QueryParameterSpec("bucket_width", bucketWidth, "form", true, false, null),
            new QueryParameterSpec("project_ids", projectIds, "form", true, false, null),
            new QueryParameterSpec("user_ids", userIds, "form", true, false, null),
            new QueryParameterSpec("api_key_ids", apiKeyIds, "form", true, false, null),
            new QueryParameterSpec("models", models, "form", true, false, null),
            new QueryParameterSpec("group_by", groupBy, "form", true, false, null),
            new QueryParameterSpec("page_size", limit, "form", true, false, null),
            new QueryParameterSpec("page", page, "form", true, false, null)
        ));
        Object raw = client.get(ApiPaths.appendQueryString(ApiPaths.aiPath("/organization/usage/audio_speeches"), query));
        return client.convertValue(raw, new TypeReference<OpenAiOrganizationUsageList>() {});
    }

    /** Get audio transcription usage */
    public OpenAiOrganizationUsageList listUsageAudioTranscriptions(Integer startTime, Integer endTime, String bucketWidth, List<String> projectIds, List<String> userIds, List<String> apiKeyIds, List<String> models, List<String> groupBy, Integer limit, String page) throws Exception {
        String query = buildQueryString(List.of(
            new QueryParameterSpec("start_time", startTime, "form", true, false, null),
            new QueryParameterSpec("end_time", endTime, "form", true, false, null),
            new QueryParameterSpec("bucket_width", bucketWidth, "form", true, false, null),
            new QueryParameterSpec("project_ids", projectIds, "form", true, false, null),
            new QueryParameterSpec("user_ids", userIds, "form", true, false, null),
            new QueryParameterSpec("api_key_ids", apiKeyIds, "form", true, false, null),
            new QueryParameterSpec("models", models, "form", true, false, null),
            new QueryParameterSpec("group_by", groupBy, "form", true, false, null),
            new QueryParameterSpec("page_size", limit, "form", true, false, null),
            new QueryParameterSpec("page", page, "form", true, false, null)
        ));
        Object raw = client.get(ApiPaths.appendQueryString(ApiPaths.aiPath("/organization/usage/audio_transcriptions"), query));
        return client.convertValue(raw, new TypeReference<OpenAiOrganizationUsageList>() {});
    }

    /** Get code interpreter session usage */
    public OpenAiOrganizationUsageList listUsageCodeInterpreterSessions(Integer startTime, Integer endTime, String bucketWidth, List<String> projectIds, List<String> userIds, List<String> apiKeyIds, List<String> models, List<String> groupBy, Integer limit, String page) throws Exception {
        String query = buildQueryString(List.of(
            new QueryParameterSpec("start_time", startTime, "form", true, false, null),
            new QueryParameterSpec("end_time", endTime, "form", true, false, null),
            new QueryParameterSpec("bucket_width", bucketWidth, "form", true, false, null),
            new QueryParameterSpec("project_ids", projectIds, "form", true, false, null),
            new QueryParameterSpec("user_ids", userIds, "form", true, false, null),
            new QueryParameterSpec("api_key_ids", apiKeyIds, "form", true, false, null),
            new QueryParameterSpec("models", models, "form", true, false, null),
            new QueryParameterSpec("group_by", groupBy, "form", true, false, null),
            new QueryParameterSpec("page_size", limit, "form", true, false, null),
            new QueryParameterSpec("page", page, "form", true, false, null)
        ));
        Object raw = client.get(ApiPaths.appendQueryString(ApiPaths.aiPath("/organization/usage/code_interpreter_sessions"), query));
        return client.convertValue(raw, new TypeReference<OpenAiOrganizationUsageList>() {});
    }

    /** Get completions usage */
    public OpenAiOrganizationUsageList listUsageCompletions(Integer startTime, Integer endTime, String bucketWidth, List<String> projectIds, List<String> userIds, List<String> apiKeyIds, List<String> models, List<String> groupBy, Integer limit, String page) throws Exception {
        String query = buildQueryString(List.of(
            new QueryParameterSpec("start_time", startTime, "form", true, false, null),
            new QueryParameterSpec("end_time", endTime, "form", true, false, null),
            new QueryParameterSpec("bucket_width", bucketWidth, "form", true, false, null),
            new QueryParameterSpec("project_ids", projectIds, "form", true, false, null),
            new QueryParameterSpec("user_ids", userIds, "form", true, false, null),
            new QueryParameterSpec("api_key_ids", apiKeyIds, "form", true, false, null),
            new QueryParameterSpec("models", models, "form", true, false, null),
            new QueryParameterSpec("group_by", groupBy, "form", true, false, null),
            new QueryParameterSpec("page_size", limit, "form", true, false, null),
            new QueryParameterSpec("page", page, "form", true, false, null)
        ));
        Object raw = client.get(ApiPaths.appendQueryString(ApiPaths.aiPath("/organization/usage/completions"), query));
        return client.convertValue(raw, new TypeReference<OpenAiOrganizationUsageList>() {});
    }

    /** Get embeddings usage */
    public OpenAiOrganizationUsageList listUsageEmbeddings(Integer startTime, Integer endTime, String bucketWidth, List<String> projectIds, List<String> userIds, List<String> apiKeyIds, List<String> models, List<String> groupBy, Integer limit, String page) throws Exception {
        String query = buildQueryString(List.of(
            new QueryParameterSpec("start_time", startTime, "form", true, false, null),
            new QueryParameterSpec("end_time", endTime, "form", true, false, null),
            new QueryParameterSpec("bucket_width", bucketWidth, "form", true, false, null),
            new QueryParameterSpec("project_ids", projectIds, "form", true, false, null),
            new QueryParameterSpec("user_ids", userIds, "form", true, false, null),
            new QueryParameterSpec("api_key_ids", apiKeyIds, "form", true, false, null),
            new QueryParameterSpec("models", models, "form", true, false, null),
            new QueryParameterSpec("group_by", groupBy, "form", true, false, null),
            new QueryParameterSpec("page_size", limit, "form", true, false, null),
            new QueryParameterSpec("page", page, "form", true, false, null)
        ));
        Object raw = client.get(ApiPaths.appendQueryString(ApiPaths.aiPath("/organization/usage/embeddings"), query));
        return client.convertValue(raw, new TypeReference<OpenAiOrganizationUsageList>() {});
    }

    /** Get image usage */
    public OpenAiOrganizationUsageList listUsageImages(Integer startTime, Integer endTime, String bucketWidth, List<String> projectIds, List<String> userIds, List<String> apiKeyIds, List<String> models, List<String> groupBy, Integer limit, String page) throws Exception {
        String query = buildQueryString(List.of(
            new QueryParameterSpec("start_time", startTime, "form", true, false, null),
            new QueryParameterSpec("end_time", endTime, "form", true, false, null),
            new QueryParameterSpec("bucket_width", bucketWidth, "form", true, false, null),
            new QueryParameterSpec("project_ids", projectIds, "form", true, false, null),
            new QueryParameterSpec("user_ids", userIds, "form", true, false, null),
            new QueryParameterSpec("api_key_ids", apiKeyIds, "form", true, false, null),
            new QueryParameterSpec("models", models, "form", true, false, null),
            new QueryParameterSpec("group_by", groupBy, "form", true, false, null),
            new QueryParameterSpec("page_size", limit, "form", true, false, null),
            new QueryParameterSpec("page", page, "form", true, false, null)
        ));
        Object raw = client.get(ApiPaths.appendQueryString(ApiPaths.aiPath("/organization/usage/images"), query));
        return client.convertValue(raw, new TypeReference<OpenAiOrganizationUsageList>() {});
    }

    /** Get moderation usage */
    public OpenAiOrganizationUsageList listUsageModerations(Integer startTime, Integer endTime, String bucketWidth, List<String> projectIds, List<String> userIds, List<String> apiKeyIds, List<String> models, List<String> groupBy, Integer limit, String page) throws Exception {
        String query = buildQueryString(List.of(
            new QueryParameterSpec("start_time", startTime, "form", true, false, null),
            new QueryParameterSpec("end_time", endTime, "form", true, false, null),
            new QueryParameterSpec("bucket_width", bucketWidth, "form", true, false, null),
            new QueryParameterSpec("project_ids", projectIds, "form", true, false, null),
            new QueryParameterSpec("user_ids", userIds, "form", true, false, null),
            new QueryParameterSpec("api_key_ids", apiKeyIds, "form", true, false, null),
            new QueryParameterSpec("models", models, "form", true, false, null),
            new QueryParameterSpec("group_by", groupBy, "form", true, false, null),
            new QueryParameterSpec("page_size", limit, "form", true, false, null),
            new QueryParameterSpec("page", page, "form", true, false, null)
        ));
        Object raw = client.get(ApiPaths.appendQueryString(ApiPaths.aiPath("/organization/usage/moderations"), query));
        return client.convertValue(raw, new TypeReference<OpenAiOrganizationUsageList>() {});
    }

    /** Get vector store usage */
    public OpenAiOrganizationUsageList listUsageVectorStores(Integer startTime, Integer endTime, String bucketWidth, List<String> projectIds, List<String> userIds, List<String> apiKeyIds, List<String> models, List<String> groupBy, Integer limit, String page) throws Exception {
        String query = buildQueryString(List.of(
            new QueryParameterSpec("start_time", startTime, "form", true, false, null),
            new QueryParameterSpec("end_time", endTime, "form", true, false, null),
            new QueryParameterSpec("bucket_width", bucketWidth, "form", true, false, null),
            new QueryParameterSpec("project_ids", projectIds, "form", true, false, null),
            new QueryParameterSpec("user_ids", userIds, "form", true, false, null),
            new QueryParameterSpec("api_key_ids", apiKeyIds, "form", true, false, null),
            new QueryParameterSpec("models", models, "form", true, false, null),
            new QueryParameterSpec("group_by", groupBy, "form", true, false, null),
            new QueryParameterSpec("page_size", limit, "form", true, false, null),
            new QueryParameterSpec("page", page, "form", true, false, null)
        ));
        Object raw = client.get(ApiPaths.appendQueryString(ApiPaths.aiPath("/organization/usage/vector_stores"), query));
        return client.convertValue(raw, new TypeReference<OpenAiOrganizationUsageList>() {});
    }

    /** List organization users */
    public OpenAiOrganizationUserList listUsers(Integer limit, String order, String after, String before) throws Exception {
        String query = buildQueryString(List.of(
            new QueryParameterSpec("page_size", limit, "form", true, false, null),
            new QueryParameterSpec("order", order, "form", true, false, null),
            new QueryParameterSpec("after", after, "form", true, false, null),
            new QueryParameterSpec("before", before, "form", true, false, null)
        ));
        Object raw = client.get(ApiPaths.appendQueryString(ApiPaths.aiPath("/organization/users"), query));
        return client.convertValue(raw, new TypeReference<OpenAiOrganizationUserList>() {});
    }

    /** Delete organization user */
    public DeleteResult deleteUsers(String userId) throws Exception {
        Object raw = client.delete(ApiPaths.aiPath("/organization/users/" + serializePathParameter(userId, new PathParameterSpec("user_id", "simple", false)) + ""));
        return client.convertValue(raw, new TypeReference<DeleteResult>() {});
    }

    /** Modify organization user */
    public OpenAiOrganizationUser createUser(String userId, OpenAiOrganizationUserUpdateRequest body) throws Exception {
        Object raw = client.post(ApiPaths.aiPath("/organization/users/" + serializePathParameter(userId, new PathParameterSpec("user_id", "simple", false)) + ""), body, null, null, "application/json");
        return client.convertValue(raw, new TypeReference<OpenAiOrganizationUser>() {});
    }

    /** List organization user roles */
    public OpenAiRoleAssignmentList listUsersRoles(String userId, Integer limit, String order, String after, String before) throws Exception {
        String query = buildQueryString(List.of(
            new QueryParameterSpec("page_size", limit, "form", true, false, null),
            new QueryParameterSpec("order", order, "form", true, false, null),
            new QueryParameterSpec("after", after, "form", true, false, null),
            new QueryParameterSpec("before", before, "form", true, false, null)
        ));
        Object raw = client.get(ApiPaths.appendQueryString(ApiPaths.aiPath("/organization/users/" + serializePathParameter(userId, new PathParameterSpec("user_id", "simple", false)) + "/roles"), query));
        return client.convertValue(raw, new TypeReference<OpenAiRoleAssignmentList>() {});
    }

    /** Create organization user role */
    public OpenAiRoleAssignment createUsersRole(String userId, OpenAiRoleAssignmentCreateRequest body) throws Exception {
        Object raw = client.post(ApiPaths.aiPath("/organization/users/" + serializePathParameter(userId, new PathParameterSpec("user_id", "simple", false)) + "/roles"), body, null, null, "application/json");
        return client.convertValue(raw, new TypeReference<OpenAiRoleAssignment>() {});
    }

    /** Delete organization user role */
    public DeleteResult deleteUsersRoles(String userId, String roleId) throws Exception {
        Object raw = client.delete(ApiPaths.aiPath("/organization/users/" + serializePathParameter(userId, new PathParameterSpec("user_id", "simple", false)) + "/roles/" + serializePathParameter(roleId, new PathParameterSpec("role_id", "simple", false)) + ""));
        return client.convertValue(raw, new TypeReference<DeleteResult>() {});
    }

    private record PathParameterSpec(String name, String style, boolean explode) {}

    private static String serializePathParameter(Object value, PathParameterSpec spec) {
        if (value == null) {
            return "";
        }
        String style = spec.style() == null || spec.style().isBlank() ? "simple" : spec.style();
        if (value instanceof Iterable<?> iterable) {
            return serializePathArray(spec.name(), iterable, style, spec.explode());
        }
        if (value instanceof Map<?, ?> map) {
            return serializePathObject(spec.name(), map, style, spec.explode());
        }
        return pathPrimitivePrefix(spec.name(), style) + pathEncode(String.valueOf(value));
    }

    private static String serializePathArray(String name, Iterable<?> values, String style, boolean explode) {
        List<String> serialized = new java.util.ArrayList<>();
        for (Object item : values) {
            if (item != null) {
                serialized.add(pathEncode(String.valueOf(item)));
            }
        }
        if (serialized.isEmpty()) {
            return pathPrefix(name, style);
        }
        if ("matrix".equals(style)) {
            if (explode) {
                List<String> parts = new java.util.ArrayList<>();
                for (String item : serialized) {
                    parts.add(";" + name + "=" + item);
                }
                return String.join("", parts);
            }
            return ";" + name + "=" + String.join(",", serialized);
        }
        String separator = explode ? "." : ",";
        return pathPrefix(name, style) + String.join(separator, serialized);
    }

    private static String serializePathObject(String name, Map<?, ?> values, String style, boolean explode) {
        List<String> entries = new java.util.ArrayList<>();
        List<String> exploded = new java.util.ArrayList<>();
        values.forEach((key, value) -> {
            if (value == null) {
                return;
            }
            String escapedKey = pathEncode(String.valueOf(key));
            String escapedValue = pathEncode(String.valueOf(value));
            if (explode) {
                if ("matrix".equals(style)) {
                    exploded.add(";" + escapedKey + "=" + escapedValue);
                } else {
                    exploded.add(escapedKey + "=" + escapedValue);
                }
            } else {
                entries.add(escapedKey);
                entries.add(escapedValue);
            }
        });
        if ("matrix".equals(style)) {
            if (explode) {
                return String.join("", exploded);
            }
            return ";" + name + "=" + String.join(",", entries);
        }
        if (explode) {
            String separator = "label".equals(style) ? "." : ",";
            return pathPrefix(name, style) + String.join(separator, exploded);
        }
        return pathPrefix(name, style) + String.join(",", entries);
    }

    private static String pathPrefix(String name, String style) {
        if ("label".equals(style)) {
            return ".";
        }
        if ("matrix".equals(style)) {
            return ";" + name;
        }
        return "";
    }

    private static String pathPrimitivePrefix(String name, String style) {
        if ("matrix".equals(style)) {
            return ";" + name + "=";
        }
        return pathPrefix(name, style);
    }

    private static String pathEncode(String value) {
        return java.net.URLEncoder.encode(value, java.nio.charset.StandardCharsets.UTF_8).replace("+", "%20");
    }

    private record QueryParameterSpec(String name, Object value, String style, boolean explode, boolean allowReserved, String contentType) {}

    private static String buildQueryString(List<QueryParameterSpec> parameters) throws Exception {
        List<String> pairs = new java.util.ArrayList<>();
        for (QueryParameterSpec parameter : parameters) {
            appendSerializedParameter(pairs, parameter);
        }
        return String.join("&", pairs);
    }

    private static void appendSerializedParameter(List<String> pairs, QueryParameterSpec parameter) throws Exception {
        if (parameter.value() == null) {
            return;
        }
        if (parameter.contentType() != null && !parameter.contentType().isBlank()) {
            String json = clientObjectMapper().writeValueAsString(parameter.value());
            pairs.add(urlEncode(parameter.name()) + "=" + encodeQueryValue(json, parameter.allowReserved()));
            return;
        }

        String style = parameter.style() == null || parameter.style().isBlank() ? "form" : parameter.style();
        Object value = parameter.value();
        if ("deepObject".equals(style) && value instanceof Map<?, ?> map) {
            appendDeepObjectParameter(pairs, parameter.name(), map, parameter.allowReserved());
        } else if (value instanceof Iterable<?> iterable) {
            appendArrayParameter(pairs, parameter.name(), iterable, style, parameter.explode(), parameter.allowReserved());
        } else if (value instanceof Map<?, ?> map) {
            appendObjectParameter(pairs, parameter.name(), map, style, parameter.explode(), parameter.allowReserved());
        } else {
            pairs.add(urlEncode(parameter.name()) + "=" + encodeQueryValue(String.valueOf(value), parameter.allowReserved()));
        }
    }

    private static void appendArrayParameter(List<String> pairs, String name, Iterable<?> values, String style, boolean explode, boolean allowReserved) {
        List<String> serialized = new java.util.ArrayList<>();
        for (Object item : values) {
            if (item != null) {
                serialized.add(String.valueOf(item));
            }
        }
        if (serialized.isEmpty()) {
            return;
        }
        if ("form".equals(style) && explode) {
            for (String item : serialized) {
                pairs.add(urlEncode(name) + "=" + encodeQueryValue(item, allowReserved));
            }
            return;
        }
        pairs.add(urlEncode(name) + "=" + encodeQueryValue(String.join(",", serialized), allowReserved));
    }

    private static void appendObjectParameter(List<String> pairs, String name, Map<?, ?> values, String style, boolean explode, boolean allowReserved) {
        List<String> serialized = new java.util.ArrayList<>();
        values.forEach((key, value) -> {
            if (value == null) {
                return;
            }
            if ("form".equals(style) && explode) {
                pairs.add(urlEncode(String.valueOf(key)) + "=" + encodeQueryValue(String.valueOf(value), allowReserved));
            } else {
                serialized.add(String.valueOf(key));
                serialized.add(String.valueOf(value));
            }
        });
        if (!serialized.isEmpty()) {
            pairs.add(urlEncode(name) + "=" + encodeQueryValue(String.join(",", serialized), allowReserved));
        }
    }

    private static void appendDeepObjectParameter(List<String> pairs, String name, Map<?, ?> values, boolean allowReserved) {
        values.forEach((key, value) -> {
            if (value != null) {
                pairs.add(urlEncode(name + "[" + key + "]") + "=" + encodeQueryValue(String.valueOf(value), allowReserved));
            }
        });
    }

    private static String encodeQueryValue(String value, boolean allowReserved) {
        String encoded = urlEncode(value);
        if (!allowReserved) {
            return encoded;
        }
        return encoded
            .replace("%3A", ":").replace("%2F", "/").replace("%3F", "?").replace("%23", "#")
            .replace("%5B", "[").replace("%5D", "]").replace("%40", "@").replace("%21", "!")
            .replace("%24", "$").replace("%26", "&").replace("%27", "'").replace("%28", "(")
            .replace("%29", ")").replace("%2A", "*").replace("%2B", "+").replace("%2C", ",")
            .replace("%3B", ";").replace("%3D", "=");
    }

    private static com.fasterxml.jackson.databind.ObjectMapper clientObjectMapper() {
        return new com.fasterxml.jackson.databind.ObjectMapper();
    }


    private static String urlEncode(String value) {
        return java.net.URLEncoder.encode(value, java.nio.charset.StandardCharsets.UTF_8);
    }
}
