using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Sdkwork.ClawRouter.Open.Models;
using SdkHttpClient = Sdkwork.ClawRouter.Open.Http.HttpClient;

namespace Sdkwork.ClawRouter.Open.Api
{
    public class OrganizationApi
    {
        private readonly SdkHttpClient _client;

        public OrganizationApi(SdkHttpClient client)
        {
            _client = client;
        }

        /// <summary>
        /// List organization admin API keys
        /// </summary>
        public async Task<Sdkwork.ClawRouter.Open.Models.OpenAiOrganizationAdminApiKeyList?> ListAdminApiKeysAsync(int? limit = null, string? order = null, string? after = null, string? before = null)
        {
            var queryString = BuildQueryString(new[]
            {
                new QueryParameterSpec("limit", limit, "form", true, false, null),
                new QueryParameterSpec("order", order, "form", true, false, null),
                new QueryParameterSpec("after", after, "form", true, false, null),
                new QueryParameterSpec("before", before, "form", true, false, null),
            });
            return await _client.GetAsync<Sdkwork.ClawRouter.Open.Models.OpenAiOrganizationAdminApiKeyList>(ApiPaths.AppendQueryString(ApiPaths.AiPath("/organization/admin_api_keys"), queryString));
        }

        /// <summary>
        /// Create organization admin API key
        /// </summary>
        public async Task<Sdkwork.ClawRouter.Open.Models.OpenAiOrganizationAdminApiKey?> CreateAdminApiKeyAsync(Sdkwork.ClawRouter.Open.Models.OpenAiOrganizationAdminApiKeyCreateRequest body)
        {
            return await _client.PostAsync<Sdkwork.ClawRouter.Open.Models.OpenAiOrganizationAdminApiKey>(ApiPaths.AiPath("/organization/admin_api_keys"), body, null, null, "application/json");
        }

        /// <summary>
        /// Delete organization admin API key
        /// </summary>
        public async Task<Sdkwork.ClawRouter.Open.Models.DeleteResult?> DeleteAdminApiKeysAsync(string keyId)
        {
            return await _client.DeleteAsync<Sdkwork.ClawRouter.Open.Models.DeleteResult>(ApiPaths.AiPath($"/organization/admin_api_keys/{SerializePathParameter(keyId, new PathParameterSpec("key_id", "simple", false))}"));
        }

        /// <summary>
        /// List organization audit logs
        /// </summary>
        public async Task<Sdkwork.ClawRouter.Open.Models.OpenAiOrganizationAuditLogList?> ListAuditLogsAsync(int? effectiveAtGte = null, int? effectiveAtLte = null, List<string>? projectIds = null, List<string>? eventTypes = null, List<string>? actorIds = null, List<string>? actorEmails = null, List<string>? resourceIds = null, int? limit = null, string? after = null, string? before = null)
        {
            var queryString = BuildQueryString(new[]
            {
                new QueryParameterSpec("effective_at[gte]", effectiveAtGte, "form", true, false, null),
                new QueryParameterSpec("effective_at[lte]", effectiveAtLte, "form", true, false, null),
                new QueryParameterSpec("project_ids[]", projectIds, "form", true, false, null),
                new QueryParameterSpec("event_types[]", eventTypes, "form", true, false, null),
                new QueryParameterSpec("actor_ids[]", actorIds, "form", true, false, null),
                new QueryParameterSpec("actor_emails[]", actorEmails, "form", true, false, null),
                new QueryParameterSpec("resource_ids[]", resourceIds, "form", true, false, null),
                new QueryParameterSpec("limit", limit, "form", true, false, null),
                new QueryParameterSpec("after", after, "form", true, false, null),
                new QueryParameterSpec("before", before, "form", true, false, null),
            });
            return await _client.GetAsync<Sdkwork.ClawRouter.Open.Models.OpenAiOrganizationAuditLogList>(ApiPaths.AppendQueryString(ApiPaths.AiPath("/organization/audit_logs"), queryString));
        }

        /// <summary>
        /// List organization certificates
        /// </summary>
        public async Task<Sdkwork.ClawRouter.Open.Models.OpenAiCertificateList?> ListCertificatesAsync(int? limit = null, string? order = null, string? after = null, string? before = null)
        {
            var queryString = BuildQueryString(new[]
            {
                new QueryParameterSpec("limit", limit, "form", true, false, null),
                new QueryParameterSpec("order", order, "form", true, false, null),
                new QueryParameterSpec("after", after, "form", true, false, null),
                new QueryParameterSpec("before", before, "form", true, false, null),
            });
            return await _client.GetAsync<Sdkwork.ClawRouter.Open.Models.OpenAiCertificateList>(ApiPaths.AppendQueryString(ApiPaths.AiPath("/organization/certificates"), queryString));
        }

        /// <summary>
        /// Upload organization certificate
        /// </summary>
        public async Task<Sdkwork.ClawRouter.Open.Models.OpenAiCertificate?> CreateCertificateAsync(Sdkwork.ClawRouter.Open.Models.OpenAiCertificateUploadMultipartRequest body)
        {
            return await _client.PostAsync<Sdkwork.ClawRouter.Open.Models.OpenAiCertificate>(ApiPaths.AiPath("/organization/certificates"), body, null, null, "multipart/form-data");
        }

        /// <summary>
        /// Activate organization certificates
        /// </summary>
        public async Task<Sdkwork.ClawRouter.Open.Models.OpenAiCertificateList?> CreateCertificatesActivateAsync(Sdkwork.ClawRouter.Open.Models.OpenAiCertificateActivationRequest body)
        {
            return await _client.PostAsync<Sdkwork.ClawRouter.Open.Models.OpenAiCertificateList>(ApiPaths.AiPath("/organization/certificates/activate"), body, null, null, "application/json");
        }

        /// <summary>
        /// Deactivate organization certificates
        /// </summary>
        public async Task<Sdkwork.ClawRouter.Open.Models.OpenAiCertificateList?> CreateCertificatesDeactivateAsync(Sdkwork.ClawRouter.Open.Models.OpenAiCertificateActivationRequest body)
        {
            return await _client.PostAsync<Sdkwork.ClawRouter.Open.Models.OpenAiCertificateList>(ApiPaths.AiPath("/organization/certificates/deactivate"), body, null, null, "application/json");
        }

        /// <summary>
        /// Delete organization certificate
        /// </summary>
        public async Task<Sdkwork.ClawRouter.Open.Models.DeleteResult?> DeleteCertificatesAsync(string certificateId)
        {
            return await _client.DeleteAsync<Sdkwork.ClawRouter.Open.Models.DeleteResult>(ApiPaths.AiPath($"/organization/certificates/{SerializePathParameter(certificateId, new PathParameterSpec("certificate_id", "simple", false))}"));
        }

        /// <summary>
        /// Get organization costs
        /// </summary>
        public async Task<Sdkwork.ClawRouter.Open.Models.OpenAiOrganizationCostList?> ListCostsAsync(int? startTime = null, int? endTime = null, string? bucketWidth = null, List<string>? projectIds = null, List<string>? userIds = null, List<string>? apiKeyIds = null, List<string>? models = null, List<string>? groupBy = null, int? limit = null, string? page = null)
        {
            var queryString = BuildQueryString(new[]
            {
                new QueryParameterSpec("start_time", startTime, "form", true, false, null),
                new QueryParameterSpec("end_time", endTime, "form", true, false, null),
                new QueryParameterSpec("bucket_width", bucketWidth, "form", true, false, null),
                new QueryParameterSpec("project_ids", projectIds, "form", true, false, null),
                new QueryParameterSpec("user_ids", userIds, "form", true, false, null),
                new QueryParameterSpec("api_key_ids", apiKeyIds, "form", true, false, null),
                new QueryParameterSpec("models", models, "form", true, false, null),
                new QueryParameterSpec("group_by", groupBy, "form", true, false, null),
                new QueryParameterSpec("limit", limit, "form", true, false, null),
                new QueryParameterSpec("page", page, "form", true, false, null),
            });
            return await _client.GetAsync<Sdkwork.ClawRouter.Open.Models.OpenAiOrganizationCostList>(ApiPaths.AppendQueryString(ApiPaths.AiPath("/organization/costs"), queryString));
        }

        /// <summary>
        /// List organization groups
        /// </summary>
        public async Task<Sdkwork.ClawRouter.Open.Models.OpenAiOrganizationGroupList?> ListGroupsAsync(int? limit = null, string? order = null, string? after = null, string? before = null)
        {
            var queryString = BuildQueryString(new[]
            {
                new QueryParameterSpec("limit", limit, "form", true, false, null),
                new QueryParameterSpec("order", order, "form", true, false, null),
                new QueryParameterSpec("after", after, "form", true, false, null),
                new QueryParameterSpec("before", before, "form", true, false, null),
            });
            return await _client.GetAsync<Sdkwork.ClawRouter.Open.Models.OpenAiOrganizationGroupList>(ApiPaths.AppendQueryString(ApiPaths.AiPath("/organization/groups"), queryString));
        }

        /// <summary>
        /// Create organization group
        /// </summary>
        public async Task<Sdkwork.ClawRouter.Open.Models.OpenAiOrganizationGroup?> CreateGroupAsync(Sdkwork.ClawRouter.Open.Models.OpenAiOrganizationGroupCreateRequest body)
        {
            return await _client.PostAsync<Sdkwork.ClawRouter.Open.Models.OpenAiOrganizationGroup>(ApiPaths.AiPath("/organization/groups"), body, null, null, "application/json");
        }

        /// <summary>
        /// Delete organization group
        /// </summary>
        public async Task<Sdkwork.ClawRouter.Open.Models.DeleteResult?> DeleteGroupsAsync(string groupId)
        {
            return await _client.DeleteAsync<Sdkwork.ClawRouter.Open.Models.DeleteResult>(ApiPaths.AiPath($"/organization/groups/{SerializePathParameter(groupId, new PathParameterSpec("group_id", "simple", false))}"));
        }

        /// <summary>
        /// List organization group roles
        /// </summary>
        public async Task<Sdkwork.ClawRouter.Open.Models.OpenAiRoleAssignmentList?> ListGroupsRolesAsync(string groupId, int? limit = null, string? order = null, string? after = null, string? before = null)
        {
            var queryString = BuildQueryString(new[]
            {
                new QueryParameterSpec("limit", limit, "form", true, false, null),
                new QueryParameterSpec("order", order, "form", true, false, null),
                new QueryParameterSpec("after", after, "form", true, false, null),
                new QueryParameterSpec("before", before, "form", true, false, null),
            });
            return await _client.GetAsync<Sdkwork.ClawRouter.Open.Models.OpenAiRoleAssignmentList>(ApiPaths.AppendQueryString(ApiPaths.AiPath($"/organization/groups/{SerializePathParameter(groupId, new PathParameterSpec("group_id", "simple", false))}/roles"), queryString));
        }

        /// <summary>
        /// Create organization group role
        /// </summary>
        public async Task<Sdkwork.ClawRouter.Open.Models.OpenAiRoleAssignment?> CreateGroupsRoleAsync(string groupId, Sdkwork.ClawRouter.Open.Models.OpenAiRoleAssignmentCreateRequest body)
        {
            return await _client.PostAsync<Sdkwork.ClawRouter.Open.Models.OpenAiRoleAssignment>(ApiPaths.AiPath($"/organization/groups/{SerializePathParameter(groupId, new PathParameterSpec("group_id", "simple", false))}/roles"), body, null, null, "application/json");
        }

        /// <summary>
        /// Delete organization group role
        /// </summary>
        public async Task<Sdkwork.ClawRouter.Open.Models.DeleteResult?> DeleteGroupsRolesAsync(string groupId, string roleId)
        {
            return await _client.DeleteAsync<Sdkwork.ClawRouter.Open.Models.DeleteResult>(ApiPaths.AiPath($"/organization/groups/{SerializePathParameter(groupId, new PathParameterSpec("group_id", "simple", false))}/roles/{SerializePathParameter(roleId, new PathParameterSpec("role_id", "simple", false))}"));
        }

        /// <summary>
        /// List organization group users
        /// </summary>
        public async Task<Sdkwork.ClawRouter.Open.Models.OpenAiOrganizationUserList?> ListGroupsUsersAsync(string groupId, int? limit = null, string? order = null, string? after = null, string? before = null)
        {
            var queryString = BuildQueryString(new[]
            {
                new QueryParameterSpec("limit", limit, "form", true, false, null),
                new QueryParameterSpec("order", order, "form", true, false, null),
                new QueryParameterSpec("after", after, "form", true, false, null),
                new QueryParameterSpec("before", before, "form", true, false, null),
            });
            return await _client.GetAsync<Sdkwork.ClawRouter.Open.Models.OpenAiOrganizationUserList>(ApiPaths.AppendQueryString(ApiPaths.AiPath($"/organization/groups/{SerializePathParameter(groupId, new PathParameterSpec("group_id", "simple", false))}/users"), queryString));
        }

        /// <summary>
        /// Add organization group user
        /// </summary>
        public async Task<Sdkwork.ClawRouter.Open.Models.OpenAiOrganizationUser?> CreateGroupsUserAsync(string groupId, Sdkwork.ClawRouter.Open.Models.OpenAiOrganizationGroupUserCreateRequest body)
        {
            return await _client.PostAsync<Sdkwork.ClawRouter.Open.Models.OpenAiOrganizationUser>(ApiPaths.AiPath($"/organization/groups/{SerializePathParameter(groupId, new PathParameterSpec("group_id", "simple", false))}/users"), body, null, null, "application/json");
        }

        /// <summary>
        /// Delete organization group user
        /// </summary>
        public async Task<Sdkwork.ClawRouter.Open.Models.DeleteResult?> DeleteGroupsUsersAsync(string groupId, string userId)
        {
            return await _client.DeleteAsync<Sdkwork.ClawRouter.Open.Models.DeleteResult>(ApiPaths.AiPath($"/organization/groups/{SerializePathParameter(groupId, new PathParameterSpec("group_id", "simple", false))}/users/{SerializePathParameter(userId, new PathParameterSpec("user_id", "simple", false))}"));
        }

        /// <summary>
        /// List organization invites
        /// </summary>
        public async Task<Sdkwork.ClawRouter.Open.Models.OpenAiOrganizationInviteList?> ListInvitesAsync(int? limit = null, string? order = null, string? after = null, string? before = null)
        {
            var queryString = BuildQueryString(new[]
            {
                new QueryParameterSpec("limit", limit, "form", true, false, null),
                new QueryParameterSpec("order", order, "form", true, false, null),
                new QueryParameterSpec("after", after, "form", true, false, null),
                new QueryParameterSpec("before", before, "form", true, false, null),
            });
            return await _client.GetAsync<Sdkwork.ClawRouter.Open.Models.OpenAiOrganizationInviteList>(ApiPaths.AppendQueryString(ApiPaths.AiPath("/organization/invites"), queryString));
        }

        /// <summary>
        /// Create organization invite
        /// </summary>
        public async Task<Sdkwork.ClawRouter.Open.Models.OpenAiOrganizationInvite?> CreateInviteAsync(Sdkwork.ClawRouter.Open.Models.OpenAiOrganizationInviteCreateRequest body)
        {
            return await _client.PostAsync<Sdkwork.ClawRouter.Open.Models.OpenAiOrganizationInvite>(ApiPaths.AiPath("/organization/invites"), body, null, null, "application/json");
        }

        /// <summary>
        /// Delete organization invite
        /// </summary>
        public async Task<Sdkwork.ClawRouter.Open.Models.DeleteResult?> DeleteInvitesAsync(string inviteId)
        {
            return await _client.DeleteAsync<Sdkwork.ClawRouter.Open.Models.DeleteResult>(ApiPaths.AiPath($"/organization/invites/{SerializePathParameter(inviteId, new PathParameterSpec("invite_id", "simple", false))}"));
        }

        /// <summary>
        /// List organization projects
        /// </summary>
        public async Task<Sdkwork.ClawRouter.Open.Models.OpenAiProjectList?> ListProjectsAsync(int? limit = null, string? order = null, string? after = null, string? before = null)
        {
            var queryString = BuildQueryString(new[]
            {
                new QueryParameterSpec("limit", limit, "form", true, false, null),
                new QueryParameterSpec("order", order, "form", true, false, null),
                new QueryParameterSpec("after", after, "form", true, false, null),
                new QueryParameterSpec("before", before, "form", true, false, null),
            });
            return await _client.GetAsync<Sdkwork.ClawRouter.Open.Models.OpenAiProjectList>(ApiPaths.AppendQueryString(ApiPaths.AiPath("/organization/projects"), queryString));
        }

        /// <summary>
        /// Create organization project
        /// </summary>
        public async Task<Sdkwork.ClawRouter.Open.Models.OpenAiProject?> CreateProjectAsync(Sdkwork.ClawRouter.Open.Models.OpenAiProjectCreateRequest body)
        {
            return await _client.PostAsync<Sdkwork.ClawRouter.Open.Models.OpenAiProject>(ApiPaths.AiPath("/organization/projects"), body, null, null, "application/json");
        }

        /// <summary>
        /// List project API keys
        /// </summary>
        public async Task<Sdkwork.ClawRouter.Open.Models.OpenAiProjectApiKeyList?> ListProjectsApiKeysAsync(string projectId, int? limit = null, string? order = null, string? after = null, string? before = null)
        {
            var queryString = BuildQueryString(new[]
            {
                new QueryParameterSpec("limit", limit, "form", true, false, null),
                new QueryParameterSpec("order", order, "form", true, false, null),
                new QueryParameterSpec("after", after, "form", true, false, null),
                new QueryParameterSpec("before", before, "form", true, false, null),
            });
            return await _client.GetAsync<Sdkwork.ClawRouter.Open.Models.OpenAiProjectApiKeyList>(ApiPaths.AppendQueryString(ApiPaths.AiPath($"/organization/projects/{SerializePathParameter(projectId, new PathParameterSpec("project_id", "simple", false))}/api_keys"), queryString));
        }

        /// <summary>
        /// Delete project API key
        /// </summary>
        public async Task<Sdkwork.ClawRouter.Open.Models.DeleteResult?> DeleteProjectsApiKeysAsync(string projectId, string keyId)
        {
            return await _client.DeleteAsync<Sdkwork.ClawRouter.Open.Models.DeleteResult>(ApiPaths.AiPath($"/organization/projects/{SerializePathParameter(projectId, new PathParameterSpec("project_id", "simple", false))}/api_keys/{SerializePathParameter(keyId, new PathParameterSpec("key_id", "simple", false))}"));
        }

        /// <summary>
        /// Archive organization project
        /// </summary>
        public async Task<Sdkwork.ClawRouter.Open.Models.OpenAiProject?> CreateProjectsArchiveAsync(string projectId)
        {
            return await _client.PostAsync<Sdkwork.ClawRouter.Open.Models.OpenAiProject>(ApiPaths.AiPath($"/organization/projects/{SerializePathParameter(projectId, new PathParameterSpec("project_id", "simple", false))}/archive"), null);
        }

        /// <summary>
        /// List project certificates
        /// </summary>
        public async Task<Sdkwork.ClawRouter.Open.Models.OpenAiCertificateList?> ListProjectsCertificatesAsync(string projectId, int? limit = null, string? order = null, string? after = null, string? before = null)
        {
            var queryString = BuildQueryString(new[]
            {
                new QueryParameterSpec("limit", limit, "form", true, false, null),
                new QueryParameterSpec("order", order, "form", true, false, null),
                new QueryParameterSpec("after", after, "form", true, false, null),
                new QueryParameterSpec("before", before, "form", true, false, null),
            });
            return await _client.GetAsync<Sdkwork.ClawRouter.Open.Models.OpenAiCertificateList>(ApiPaths.AppendQueryString(ApiPaths.AiPath($"/organization/projects/{SerializePathParameter(projectId, new PathParameterSpec("project_id", "simple", false))}/certificates"), queryString));
        }

        /// <summary>
        /// Activate project certificates
        /// </summary>
        public async Task<Sdkwork.ClawRouter.Open.Models.OpenAiCertificateList?> CreateProjectsCertificatesActivateAsync(string projectId, Sdkwork.ClawRouter.Open.Models.OpenAiCertificateActivationRequest body)
        {
            return await _client.PostAsync<Sdkwork.ClawRouter.Open.Models.OpenAiCertificateList>(ApiPaths.AiPath($"/organization/projects/{SerializePathParameter(projectId, new PathParameterSpec("project_id", "simple", false))}/certificates/activate"), body, null, null, "application/json");
        }

        /// <summary>
        /// Deactivate project certificates
        /// </summary>
        public async Task<Sdkwork.ClawRouter.Open.Models.OpenAiCertificateList?> CreateProjectsCertificatesDeactivateAsync(string projectId, Sdkwork.ClawRouter.Open.Models.OpenAiCertificateActivationRequest body)
        {
            return await _client.PostAsync<Sdkwork.ClawRouter.Open.Models.OpenAiCertificateList>(ApiPaths.AiPath($"/organization/projects/{SerializePathParameter(projectId, new PathParameterSpec("project_id", "simple", false))}/certificates/deactivate"), body, null, null, "application/json");
        }

        /// <summary>
        /// List project groups
        /// </summary>
        public async Task<Sdkwork.ClawRouter.Open.Models.OpenAiOrganizationGroupList?> ListProjectsGroupsAsync(string projectId, int? limit = null, string? order = null, string? after = null, string? before = null)
        {
            var queryString = BuildQueryString(new[]
            {
                new QueryParameterSpec("limit", limit, "form", true, false, null),
                new QueryParameterSpec("order", order, "form", true, false, null),
                new QueryParameterSpec("after", after, "form", true, false, null),
                new QueryParameterSpec("before", before, "form", true, false, null),
            });
            return await _client.GetAsync<Sdkwork.ClawRouter.Open.Models.OpenAiOrganizationGroupList>(ApiPaths.AppendQueryString(ApiPaths.AiPath($"/organization/projects/{SerializePathParameter(projectId, new PathParameterSpec("project_id", "simple", false))}/groups"), queryString));
        }

        /// <summary>
        /// Create project group
        /// </summary>
        public async Task<Sdkwork.ClawRouter.Open.Models.OpenAiOrganizationGroup?> CreateProjectsGroupAsync(string projectId, Sdkwork.ClawRouter.Open.Models.OpenAiProjectGroupCreateRequest body)
        {
            return await _client.PostAsync<Sdkwork.ClawRouter.Open.Models.OpenAiOrganizationGroup>(ApiPaths.AiPath($"/organization/projects/{SerializePathParameter(projectId, new PathParameterSpec("project_id", "simple", false))}/groups"), body, null, null, "application/json");
        }

        /// <summary>
        /// Delete project group
        /// </summary>
        public async Task<Sdkwork.ClawRouter.Open.Models.DeleteResult?> DeleteProjectsGroupsAsync(string projectId, string groupId)
        {
            return await _client.DeleteAsync<Sdkwork.ClawRouter.Open.Models.DeleteResult>(ApiPaths.AiPath($"/organization/projects/{SerializePathParameter(projectId, new PathParameterSpec("project_id", "simple", false))}/groups/{SerializePathParameter(groupId, new PathParameterSpec("group_id", "simple", false))}"));
        }

        /// <summary>
        /// List project rate limits
        /// </summary>
        public async Task<Sdkwork.ClawRouter.Open.Models.OpenAiProjectRateLimitList?> ListProjectsRateLimitsAsync(string projectId, int? limit = null, string? order = null, string? after = null, string? before = null)
        {
            var queryString = BuildQueryString(new[]
            {
                new QueryParameterSpec("limit", limit, "form", true, false, null),
                new QueryParameterSpec("order", order, "form", true, false, null),
                new QueryParameterSpec("after", after, "form", true, false, null),
                new QueryParameterSpec("before", before, "form", true, false, null),
            });
            return await _client.GetAsync<Sdkwork.ClawRouter.Open.Models.OpenAiProjectRateLimitList>(ApiPaths.AppendQueryString(ApiPaths.AiPath($"/organization/projects/{SerializePathParameter(projectId, new PathParameterSpec("project_id", "simple", false))}/rate_limits"), queryString));
        }

        /// <summary>
        /// Modify project rate limit
        /// </summary>
        public async Task<Sdkwork.ClawRouter.Open.Models.OpenAiProjectRateLimit?> CreateProjectsRateLimitAsync(string projectId, string rateLimitId, Sdkwork.ClawRouter.Open.Models.OpenAiProjectRateLimitUpdateRequest body)
        {
            return await _client.PostAsync<Sdkwork.ClawRouter.Open.Models.OpenAiProjectRateLimit>(ApiPaths.AiPath($"/organization/projects/{SerializePathParameter(projectId, new PathParameterSpec("project_id", "simple", false))}/rate_limits/{SerializePathParameter(rateLimitId, new PathParameterSpec("rate_limit_id", "simple", false))}"), body, null, null, "application/json");
        }

        /// <summary>
        /// List project service accounts
        /// </summary>
        public async Task<Sdkwork.ClawRouter.Open.Models.OpenAiProjectServiceAccountList?> ListProjectsServiceAccountsAsync(string projectId, int? limit = null, string? order = null, string? after = null, string? before = null)
        {
            var queryString = BuildQueryString(new[]
            {
                new QueryParameterSpec("limit", limit, "form", true, false, null),
                new QueryParameterSpec("order", order, "form", true, false, null),
                new QueryParameterSpec("after", after, "form", true, false, null),
                new QueryParameterSpec("before", before, "form", true, false, null),
            });
            return await _client.GetAsync<Sdkwork.ClawRouter.Open.Models.OpenAiProjectServiceAccountList>(ApiPaths.AppendQueryString(ApiPaths.AiPath($"/organization/projects/{SerializePathParameter(projectId, new PathParameterSpec("project_id", "simple", false))}/service_accounts"), queryString));
        }

        /// <summary>
        /// Create project service account
        /// </summary>
        public async Task<Sdkwork.ClawRouter.Open.Models.OpenAiProjectServiceAccount?> CreateProjectsServiceAccountAsync(string projectId, Sdkwork.ClawRouter.Open.Models.OpenAiProjectServiceAccountCreateRequest body)
        {
            return await _client.PostAsync<Sdkwork.ClawRouter.Open.Models.OpenAiProjectServiceAccount>(ApiPaths.AiPath($"/organization/projects/{SerializePathParameter(projectId, new PathParameterSpec("project_id", "simple", false))}/service_accounts"), body, null, null, "application/json");
        }

        /// <summary>
        /// Delete project service account
        /// </summary>
        public async Task<Sdkwork.ClawRouter.Open.Models.DeleteResult?> DeleteProjectsServiceAccountsAsync(string projectId, string serviceAccountId)
        {
            return await _client.DeleteAsync<Sdkwork.ClawRouter.Open.Models.DeleteResult>(ApiPaths.AiPath($"/organization/projects/{SerializePathParameter(projectId, new PathParameterSpec("project_id", "simple", false))}/service_accounts/{SerializePathParameter(serviceAccountId, new PathParameterSpec("service_account_id", "simple", false))}"));
        }

        /// <summary>
        /// List project users
        /// </summary>
        public async Task<Sdkwork.ClawRouter.Open.Models.OpenAiProjectUserList?> ListProjectsUsersAsync(string projectId, int? limit = null, string? order = null, string? after = null, string? before = null)
        {
            var queryString = BuildQueryString(new[]
            {
                new QueryParameterSpec("limit", limit, "form", true, false, null),
                new QueryParameterSpec("order", order, "form", true, false, null),
                new QueryParameterSpec("after", after, "form", true, false, null),
                new QueryParameterSpec("before", before, "form", true, false, null),
            });
            return await _client.GetAsync<Sdkwork.ClawRouter.Open.Models.OpenAiProjectUserList>(ApiPaths.AppendQueryString(ApiPaths.AiPath($"/organization/projects/{SerializePathParameter(projectId, new PathParameterSpec("project_id", "simple", false))}/users"), queryString));
        }

        /// <summary>
        /// Create project user
        /// </summary>
        public async Task<Sdkwork.ClawRouter.Open.Models.OpenAiProjectUser?> CreateProjectsUserAsync(string projectId, Sdkwork.ClawRouter.Open.Models.OpenAiProjectUserCreateRequest body)
        {
            return await _client.PostAsync<Sdkwork.ClawRouter.Open.Models.OpenAiProjectUser>(ApiPaths.AiPath($"/organization/projects/{SerializePathParameter(projectId, new PathParameterSpec("project_id", "simple", false))}/users"), body, null, null, "application/json");
        }

        /// <summary>
        /// Delete project user
        /// </summary>
        public async Task<Sdkwork.ClawRouter.Open.Models.DeleteResult?> DeleteProjectsUsersAsync(string projectId, string userId)
        {
            return await _client.DeleteAsync<Sdkwork.ClawRouter.Open.Models.DeleteResult>(ApiPaths.AiPath($"/organization/projects/{SerializePathParameter(projectId, new PathParameterSpec("project_id", "simple", false))}/users/{SerializePathParameter(userId, new PathParameterSpec("user_id", "simple", false))}"));
        }

        /// <summary>
        /// List organization roles
        /// </summary>
        public async Task<Sdkwork.ClawRouter.Open.Models.OpenAiRoleList?> ListRolesAsync(int? limit = null, string? order = null, string? after = null, string? before = null)
        {
            var queryString = BuildQueryString(new[]
            {
                new QueryParameterSpec("limit", limit, "form", true, false, null),
                new QueryParameterSpec("order", order, "form", true, false, null),
                new QueryParameterSpec("after", after, "form", true, false, null),
                new QueryParameterSpec("before", before, "form", true, false, null),
            });
            return await _client.GetAsync<Sdkwork.ClawRouter.Open.Models.OpenAiRoleList>(ApiPaths.AppendQueryString(ApiPaths.AiPath("/organization/roles"), queryString));
        }

        /// <summary>
        /// Create organization role
        /// </summary>
        public async Task<Sdkwork.ClawRouter.Open.Models.OpenAiRole?> CreateRoleAsync(Sdkwork.ClawRouter.Open.Models.OpenAiRoleCreateRequest body)
        {
            return await _client.PostAsync<Sdkwork.ClawRouter.Open.Models.OpenAiRole>(ApiPaths.AiPath("/organization/roles"), body, null, null, "application/json");
        }

        /// <summary>
        /// Delete organization role
        /// </summary>
        public async Task<Sdkwork.ClawRouter.Open.Models.DeleteResult?> DeleteRolesAsync(string roleId)
        {
            return await _client.DeleteAsync<Sdkwork.ClawRouter.Open.Models.DeleteResult>(ApiPaths.AiPath($"/organization/roles/{SerializePathParameter(roleId, new PathParameterSpec("role_id", "simple", false))}"));
        }

        /// <summary>
        /// Get audio speech usage
        /// </summary>
        public async Task<Sdkwork.ClawRouter.Open.Models.OpenAiOrganizationUsageList?> ListUsageAudioSpeechesAsync(int? startTime = null, int? endTime = null, string? bucketWidth = null, List<string>? projectIds = null, List<string>? userIds = null, List<string>? apiKeyIds = null, List<string>? models = null, List<string>? groupBy = null, int? limit = null, string? page = null)
        {
            var queryString = BuildQueryString(new[]
            {
                new QueryParameterSpec("start_time", startTime, "form", true, false, null),
                new QueryParameterSpec("end_time", endTime, "form", true, false, null),
                new QueryParameterSpec("bucket_width", bucketWidth, "form", true, false, null),
                new QueryParameterSpec("project_ids", projectIds, "form", true, false, null),
                new QueryParameterSpec("user_ids", userIds, "form", true, false, null),
                new QueryParameterSpec("api_key_ids", apiKeyIds, "form", true, false, null),
                new QueryParameterSpec("models", models, "form", true, false, null),
                new QueryParameterSpec("group_by", groupBy, "form", true, false, null),
                new QueryParameterSpec("limit", limit, "form", true, false, null),
                new QueryParameterSpec("page", page, "form", true, false, null),
            });
            return await _client.GetAsync<Sdkwork.ClawRouter.Open.Models.OpenAiOrganizationUsageList>(ApiPaths.AppendQueryString(ApiPaths.AiPath("/organization/usage/audio_speeches"), queryString));
        }

        /// <summary>
        /// Get audio transcription usage
        /// </summary>
        public async Task<Sdkwork.ClawRouter.Open.Models.OpenAiOrganizationUsageList?> ListUsageAudioTranscriptionsAsync(int? startTime = null, int? endTime = null, string? bucketWidth = null, List<string>? projectIds = null, List<string>? userIds = null, List<string>? apiKeyIds = null, List<string>? models = null, List<string>? groupBy = null, int? limit = null, string? page = null)
        {
            var queryString = BuildQueryString(new[]
            {
                new QueryParameterSpec("start_time", startTime, "form", true, false, null),
                new QueryParameterSpec("end_time", endTime, "form", true, false, null),
                new QueryParameterSpec("bucket_width", bucketWidth, "form", true, false, null),
                new QueryParameterSpec("project_ids", projectIds, "form", true, false, null),
                new QueryParameterSpec("user_ids", userIds, "form", true, false, null),
                new QueryParameterSpec("api_key_ids", apiKeyIds, "form", true, false, null),
                new QueryParameterSpec("models", models, "form", true, false, null),
                new QueryParameterSpec("group_by", groupBy, "form", true, false, null),
                new QueryParameterSpec("limit", limit, "form", true, false, null),
                new QueryParameterSpec("page", page, "form", true, false, null),
            });
            return await _client.GetAsync<Sdkwork.ClawRouter.Open.Models.OpenAiOrganizationUsageList>(ApiPaths.AppendQueryString(ApiPaths.AiPath("/organization/usage/audio_transcriptions"), queryString));
        }

        /// <summary>
        /// Get code interpreter session usage
        /// </summary>
        public async Task<Sdkwork.ClawRouter.Open.Models.OpenAiOrganizationUsageList?> ListUsageCodeInterpreterSessionsAsync(int? startTime = null, int? endTime = null, string? bucketWidth = null, List<string>? projectIds = null, List<string>? userIds = null, List<string>? apiKeyIds = null, List<string>? models = null, List<string>? groupBy = null, int? limit = null, string? page = null)
        {
            var queryString = BuildQueryString(new[]
            {
                new QueryParameterSpec("start_time", startTime, "form", true, false, null),
                new QueryParameterSpec("end_time", endTime, "form", true, false, null),
                new QueryParameterSpec("bucket_width", bucketWidth, "form", true, false, null),
                new QueryParameterSpec("project_ids", projectIds, "form", true, false, null),
                new QueryParameterSpec("user_ids", userIds, "form", true, false, null),
                new QueryParameterSpec("api_key_ids", apiKeyIds, "form", true, false, null),
                new QueryParameterSpec("models", models, "form", true, false, null),
                new QueryParameterSpec("group_by", groupBy, "form", true, false, null),
                new QueryParameterSpec("limit", limit, "form", true, false, null),
                new QueryParameterSpec("page", page, "form", true, false, null),
            });
            return await _client.GetAsync<Sdkwork.ClawRouter.Open.Models.OpenAiOrganizationUsageList>(ApiPaths.AppendQueryString(ApiPaths.AiPath("/organization/usage/code_interpreter_sessions"), queryString));
        }

        /// <summary>
        /// Get completions usage
        /// </summary>
        public async Task<Sdkwork.ClawRouter.Open.Models.OpenAiOrganizationUsageList?> ListUsageCompletionsAsync(int? startTime = null, int? endTime = null, string? bucketWidth = null, List<string>? projectIds = null, List<string>? userIds = null, List<string>? apiKeyIds = null, List<string>? models = null, List<string>? groupBy = null, int? limit = null, string? page = null)
        {
            var queryString = BuildQueryString(new[]
            {
                new QueryParameterSpec("start_time", startTime, "form", true, false, null),
                new QueryParameterSpec("end_time", endTime, "form", true, false, null),
                new QueryParameterSpec("bucket_width", bucketWidth, "form", true, false, null),
                new QueryParameterSpec("project_ids", projectIds, "form", true, false, null),
                new QueryParameterSpec("user_ids", userIds, "form", true, false, null),
                new QueryParameterSpec("api_key_ids", apiKeyIds, "form", true, false, null),
                new QueryParameterSpec("models", models, "form", true, false, null),
                new QueryParameterSpec("group_by", groupBy, "form", true, false, null),
                new QueryParameterSpec("limit", limit, "form", true, false, null),
                new QueryParameterSpec("page", page, "form", true, false, null),
            });
            return await _client.GetAsync<Sdkwork.ClawRouter.Open.Models.OpenAiOrganizationUsageList>(ApiPaths.AppendQueryString(ApiPaths.AiPath("/organization/usage/completions"), queryString));
        }

        /// <summary>
        /// Get embeddings usage
        /// </summary>
        public async Task<Sdkwork.ClawRouter.Open.Models.OpenAiOrganizationUsageList?> ListUsageEmbeddingsAsync(int? startTime = null, int? endTime = null, string? bucketWidth = null, List<string>? projectIds = null, List<string>? userIds = null, List<string>? apiKeyIds = null, List<string>? models = null, List<string>? groupBy = null, int? limit = null, string? page = null)
        {
            var queryString = BuildQueryString(new[]
            {
                new QueryParameterSpec("start_time", startTime, "form", true, false, null),
                new QueryParameterSpec("end_time", endTime, "form", true, false, null),
                new QueryParameterSpec("bucket_width", bucketWidth, "form", true, false, null),
                new QueryParameterSpec("project_ids", projectIds, "form", true, false, null),
                new QueryParameterSpec("user_ids", userIds, "form", true, false, null),
                new QueryParameterSpec("api_key_ids", apiKeyIds, "form", true, false, null),
                new QueryParameterSpec("models", models, "form", true, false, null),
                new QueryParameterSpec("group_by", groupBy, "form", true, false, null),
                new QueryParameterSpec("limit", limit, "form", true, false, null),
                new QueryParameterSpec("page", page, "form", true, false, null),
            });
            return await _client.GetAsync<Sdkwork.ClawRouter.Open.Models.OpenAiOrganizationUsageList>(ApiPaths.AppendQueryString(ApiPaths.AiPath("/organization/usage/embeddings"), queryString));
        }

        /// <summary>
        /// Get image usage
        /// </summary>
        public async Task<Sdkwork.ClawRouter.Open.Models.OpenAiOrganizationUsageList?> ListUsageImagesAsync(int? startTime = null, int? endTime = null, string? bucketWidth = null, List<string>? projectIds = null, List<string>? userIds = null, List<string>? apiKeyIds = null, List<string>? models = null, List<string>? groupBy = null, int? limit = null, string? page = null)
        {
            var queryString = BuildQueryString(new[]
            {
                new QueryParameterSpec("start_time", startTime, "form", true, false, null),
                new QueryParameterSpec("end_time", endTime, "form", true, false, null),
                new QueryParameterSpec("bucket_width", bucketWidth, "form", true, false, null),
                new QueryParameterSpec("project_ids", projectIds, "form", true, false, null),
                new QueryParameterSpec("user_ids", userIds, "form", true, false, null),
                new QueryParameterSpec("api_key_ids", apiKeyIds, "form", true, false, null),
                new QueryParameterSpec("models", models, "form", true, false, null),
                new QueryParameterSpec("group_by", groupBy, "form", true, false, null),
                new QueryParameterSpec("limit", limit, "form", true, false, null),
                new QueryParameterSpec("page", page, "form", true, false, null),
            });
            return await _client.GetAsync<Sdkwork.ClawRouter.Open.Models.OpenAiOrganizationUsageList>(ApiPaths.AppendQueryString(ApiPaths.AiPath("/organization/usage/images"), queryString));
        }

        /// <summary>
        /// Get moderation usage
        /// </summary>
        public async Task<Sdkwork.ClawRouter.Open.Models.OpenAiOrganizationUsageList?> ListUsageModerationsAsync(int? startTime = null, int? endTime = null, string? bucketWidth = null, List<string>? projectIds = null, List<string>? userIds = null, List<string>? apiKeyIds = null, List<string>? models = null, List<string>? groupBy = null, int? limit = null, string? page = null)
        {
            var queryString = BuildQueryString(new[]
            {
                new QueryParameterSpec("start_time", startTime, "form", true, false, null),
                new QueryParameterSpec("end_time", endTime, "form", true, false, null),
                new QueryParameterSpec("bucket_width", bucketWidth, "form", true, false, null),
                new QueryParameterSpec("project_ids", projectIds, "form", true, false, null),
                new QueryParameterSpec("user_ids", userIds, "form", true, false, null),
                new QueryParameterSpec("api_key_ids", apiKeyIds, "form", true, false, null),
                new QueryParameterSpec("models", models, "form", true, false, null),
                new QueryParameterSpec("group_by", groupBy, "form", true, false, null),
                new QueryParameterSpec("limit", limit, "form", true, false, null),
                new QueryParameterSpec("page", page, "form", true, false, null),
            });
            return await _client.GetAsync<Sdkwork.ClawRouter.Open.Models.OpenAiOrganizationUsageList>(ApiPaths.AppendQueryString(ApiPaths.AiPath("/organization/usage/moderations"), queryString));
        }

        /// <summary>
        /// Get vector store usage
        /// </summary>
        public async Task<Sdkwork.ClawRouter.Open.Models.OpenAiOrganizationUsageList?> ListUsageVectorStoresAsync(int? startTime = null, int? endTime = null, string? bucketWidth = null, List<string>? projectIds = null, List<string>? userIds = null, List<string>? apiKeyIds = null, List<string>? models = null, List<string>? groupBy = null, int? limit = null, string? page = null)
        {
            var queryString = BuildQueryString(new[]
            {
                new QueryParameterSpec("start_time", startTime, "form", true, false, null),
                new QueryParameterSpec("end_time", endTime, "form", true, false, null),
                new QueryParameterSpec("bucket_width", bucketWidth, "form", true, false, null),
                new QueryParameterSpec("project_ids", projectIds, "form", true, false, null),
                new QueryParameterSpec("user_ids", userIds, "form", true, false, null),
                new QueryParameterSpec("api_key_ids", apiKeyIds, "form", true, false, null),
                new QueryParameterSpec("models", models, "form", true, false, null),
                new QueryParameterSpec("group_by", groupBy, "form", true, false, null),
                new QueryParameterSpec("limit", limit, "form", true, false, null),
                new QueryParameterSpec("page", page, "form", true, false, null),
            });
            return await _client.GetAsync<Sdkwork.ClawRouter.Open.Models.OpenAiOrganizationUsageList>(ApiPaths.AppendQueryString(ApiPaths.AiPath("/organization/usage/vector_stores"), queryString));
        }

        /// <summary>
        /// List organization users
        /// </summary>
        public async Task<Sdkwork.ClawRouter.Open.Models.OpenAiOrganizationUserList?> ListUsersAsync(int? limit = null, string? order = null, string? after = null, string? before = null)
        {
            var queryString = BuildQueryString(new[]
            {
                new QueryParameterSpec("limit", limit, "form", true, false, null),
                new QueryParameterSpec("order", order, "form", true, false, null),
                new QueryParameterSpec("after", after, "form", true, false, null),
                new QueryParameterSpec("before", before, "form", true, false, null),
            });
            return await _client.GetAsync<Sdkwork.ClawRouter.Open.Models.OpenAiOrganizationUserList>(ApiPaths.AppendQueryString(ApiPaths.AiPath("/organization/users"), queryString));
        }

        /// <summary>
        /// Delete organization user
        /// </summary>
        public async Task<Sdkwork.ClawRouter.Open.Models.DeleteResult?> DeleteUsersAsync(string userId)
        {
            return await _client.DeleteAsync<Sdkwork.ClawRouter.Open.Models.DeleteResult>(ApiPaths.AiPath($"/organization/users/{SerializePathParameter(userId, new PathParameterSpec("user_id", "simple", false))}"));
        }

        /// <summary>
        /// Modify organization user
        /// </summary>
        public async Task<Sdkwork.ClawRouter.Open.Models.OpenAiOrganizationUser?> CreateUserAsync(string userId, Sdkwork.ClawRouter.Open.Models.OpenAiOrganizationUserUpdateRequest body)
        {
            return await _client.PostAsync<Sdkwork.ClawRouter.Open.Models.OpenAiOrganizationUser>(ApiPaths.AiPath($"/organization/users/{SerializePathParameter(userId, new PathParameterSpec("user_id", "simple", false))}"), body, null, null, "application/json");
        }

        /// <summary>
        /// List organization user roles
        /// </summary>
        public async Task<Sdkwork.ClawRouter.Open.Models.OpenAiRoleAssignmentList?> ListUsersRolesAsync(string userId, int? limit = null, string? order = null, string? after = null, string? before = null)
        {
            var queryString = BuildQueryString(new[]
            {
                new QueryParameterSpec("limit", limit, "form", true, false, null),
                new QueryParameterSpec("order", order, "form", true, false, null),
                new QueryParameterSpec("after", after, "form", true, false, null),
                new QueryParameterSpec("before", before, "form", true, false, null),
            });
            return await _client.GetAsync<Sdkwork.ClawRouter.Open.Models.OpenAiRoleAssignmentList>(ApiPaths.AppendQueryString(ApiPaths.AiPath($"/organization/users/{SerializePathParameter(userId, new PathParameterSpec("user_id", "simple", false))}/roles"), queryString));
        }

        /// <summary>
        /// Create organization user role
        /// </summary>
        public async Task<Sdkwork.ClawRouter.Open.Models.OpenAiRoleAssignment?> CreateUsersRoleAsync(string userId, Sdkwork.ClawRouter.Open.Models.OpenAiRoleAssignmentCreateRequest body)
        {
            return await _client.PostAsync<Sdkwork.ClawRouter.Open.Models.OpenAiRoleAssignment>(ApiPaths.AiPath($"/organization/users/{SerializePathParameter(userId, new PathParameterSpec("user_id", "simple", false))}/roles"), body, null, null, "application/json");
        }

        /// <summary>
        /// Delete organization user role
        /// </summary>
        public async Task<Sdkwork.ClawRouter.Open.Models.DeleteResult?> DeleteUsersRolesAsync(string userId, string roleId)
        {
            return await _client.DeleteAsync<Sdkwork.ClawRouter.Open.Models.DeleteResult>(ApiPaths.AiPath($"/organization/users/{SerializePathParameter(userId, new PathParameterSpec("user_id", "simple", false))}/roles/{SerializePathParameter(roleId, new PathParameterSpec("role_id", "simple", false))}"));
        }

        private sealed record PathParameterSpec(string Name, string Style, bool Explode);

        private static string SerializePathParameter(object? value, PathParameterSpec spec)
        {
            if (value is null)
            {
                return string.Empty;
            }
            var style = string.IsNullOrWhiteSpace(spec.Style) ? "simple" : spec.Style;
            if (value is System.Collections.IDictionary dictionary)
            {
                return SerializePathObject(spec.Name, dictionary, style, spec.Explode);
            }
            if (value is System.Collections.IEnumerable enumerable && value is not string)
            {
                return SerializePathArray(spec.Name, enumerable, style, spec.Explode);
            }
            return PathPrimitivePrefix(spec.Name, style) + Uri.EscapeDataString(value.ToString() ?? string.Empty);
        }

        private static string SerializePathArray(string name, System.Collections.IEnumerable values, string style, bool explode)
        {
            var serialized = new List<string>();
            foreach (var item in values)
            {
                if (item is not null)
                {
                    serialized.Add(Uri.EscapeDataString(item.ToString() ?? string.Empty));
                }
            }
            if (serialized.Count == 0)
            {
                return PathPrefix(name, style);
            }
            if (style == "matrix")
            {
                if (explode)
                {
                    var parts = new List<string>();
                    foreach (var item in serialized)
                    {
                        parts.Add(";" + name + "=" + item);
                    }
                    return string.Join(string.Empty, parts);
                }
                return ";" + name + "=" + string.Join(",", serialized);
            }
            var separator = explode ? "." : ",";
            return PathPrefix(name, style) + string.Join(separator, serialized);
        }

        private static string SerializePathObject(string name, System.Collections.IDictionary values, string style, bool explode)
        {
            var entries = new List<string>();
            var exploded = new List<string>();
            foreach (System.Collections.DictionaryEntry item in values)
            {
                if (item.Value is null)
                {
                    continue;
                }
                var escapedKey = Uri.EscapeDataString(item.Key.ToString() ?? string.Empty);
                var escapedValue = Uri.EscapeDataString(item.Value.ToString() ?? string.Empty);
                if (explode)
                {
                    exploded.Add(style == "matrix" ? ";" + escapedKey + "=" + escapedValue : escapedKey + "=" + escapedValue);
                }
                else
                {
                    entries.Add(escapedKey);
                    entries.Add(escapedValue);
                }
            }
            if (style == "matrix")
            {
                return explode ? string.Join(string.Empty, exploded) : ";" + name + "=" + string.Join(",", entries);
            }
            if (explode)
            {
                var separator = style == "label" ? "." : ",";
                return PathPrefix(name, style) + string.Join(separator, exploded);
            }
            return PathPrefix(name, style) + string.Join(",", entries);
        }

        private static string PathPrefix(string name, string style)
        {
            return style switch
            {
                "label" => ".",
                "matrix" => ";" + name,
                _ => string.Empty,
            };
        }

        private static string PathPrimitivePrefix(string name, string style)
        {
            return style == "matrix" ? ";" + name + "=" : PathPrefix(name, style);
        }

        private sealed record QueryParameterSpec(
            string Name,
            object? Value,
            string Style,
            bool Explode,
            bool AllowReserved,
            string? ContentType);

        private static string BuildQueryString(IEnumerable<QueryParameterSpec> parameters)
        {
            var pairs = new List<string>();
            foreach (var parameter in parameters)
            {
                AppendSerializedParameter(pairs, parameter);
            }
            return string.Join("&", pairs);
        }

        private static void AppendSerializedParameter(List<string> pairs, QueryParameterSpec parameter)
        {
            if (parameter.Value is null)
            {
                return;
            }

            if (!string.IsNullOrWhiteSpace(parameter.ContentType))
            {
                var json = System.Text.Json.JsonSerializer.Serialize(parameter.Value);
                pairs.Add(Uri.EscapeDataString(parameter.Name) + "=" + EncodeQueryValue(json, parameter.AllowReserved));
                return;
            }

            var style = string.IsNullOrWhiteSpace(parameter.Style) ? "form" : parameter.Style;
            if (style == "deepObject" && parameter.Value is System.Collections.IDictionary deepObject)
            {
                AppendDeepObjectParameter(pairs, parameter.Name, deepObject, parameter.AllowReserved);
            }
            else if (parameter.Value is System.Collections.IEnumerable enumerable && parameter.Value is not string && parameter.Value is not System.Collections.IDictionary)
            {
                AppendArrayParameter(pairs, parameter.Name, enumerable, style, parameter.Explode, parameter.AllowReserved);
            }
            else if (parameter.Value is System.Collections.IDictionary dictionary)
            {
                AppendObjectParameter(pairs, parameter.Name, dictionary, style, parameter.Explode, parameter.AllowReserved);
            }
            else
            {
                pairs.Add(Uri.EscapeDataString(parameter.Name) + "=" + EncodeQueryValue(parameter.Value.ToString() ?? string.Empty, parameter.AllowReserved));
            }
        }

        private static void AppendArrayParameter(List<string> pairs, string name, System.Collections.IEnumerable values, string style, bool explode, bool allowReserved)
        {
            var serialized = new List<string>();
            foreach (var item in values)
            {
                if (item is not null)
                {
                    serialized.Add(item.ToString() ?? string.Empty);
                }
            }
            if (serialized.Count == 0)
            {
                return;
            }
            if (style == "form" && explode)
            {
                foreach (var item in serialized)
                {
                    pairs.Add(Uri.EscapeDataString(name) + "=" + EncodeQueryValue(item, allowReserved));
                }
                return;
            }
            pairs.Add(Uri.EscapeDataString(name) + "=" + EncodeQueryValue(string.Join(",", serialized), allowReserved));
        }

        private static void AppendObjectParameter(List<string> pairs, string name, System.Collections.IDictionary values, string style, bool explode, bool allowReserved)
        {
            var serialized = new List<string>();
            foreach (System.Collections.DictionaryEntry item in values)
            {
                if (item.Value is null)
                {
                    continue;
                }
                if (style == "form" && explode)
                {
                    pairs.Add(Uri.EscapeDataString(item.Key.ToString() ?? string.Empty) + "=" + EncodeQueryValue(item.Value.ToString() ?? string.Empty, allowReserved));
                }
                else
                {
                    serialized.Add(item.Key.ToString() ?? string.Empty);
                    serialized.Add(item.Value.ToString() ?? string.Empty);
                }
            }
            if (serialized.Count > 0)
            {
                pairs.Add(Uri.EscapeDataString(name) + "=" + EncodeQueryValue(string.Join(",", serialized), allowReserved));
            }
        }

        private static void AppendDeepObjectParameter(List<string> pairs, string name, System.Collections.IDictionary values, bool allowReserved)
        {
            foreach (System.Collections.DictionaryEntry item in values)
            {
                if (item.Value is not null)
                {
                    pairs.Add(Uri.EscapeDataString(name + "[" + item.Key + "]") + "=" + EncodeQueryValue(item.Value.ToString() ?? string.Empty, allowReserved));
                }
            }
        }

        private static string EncodeQueryValue(string value, bool allowReserved)
        {
            var encoded = Uri.EscapeDataString(value);
            if (!allowReserved)
            {
                return encoded;
            }
            return encoded
                .Replace("%3A", ":").Replace("%2F", "/").Replace("%3F", "?").Replace("%23", "#")
                .Replace("%5B", "[").Replace("%5D", "]").Replace("%40", "@").Replace("%21", "!")
                .Replace("%24", "$").Replace("%26", "&").Replace("%27", "'").Replace("%28", "(")
                .Replace("%29", ")").Replace("%2A", "*").Replace("%2B", "+").Replace("%2C", ",")
                .Replace("%3B", ";").Replace("%3D", "=");
        }

    }
}
