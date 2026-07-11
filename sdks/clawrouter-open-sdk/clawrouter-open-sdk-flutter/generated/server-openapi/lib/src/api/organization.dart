import 'dart:convert';
import '../http/client.dart';
import '../models.dart';

import 'paths.dart';
import 'response_helpers.dart';


class OrganizationApi {
  final HttpClient _client;

  OrganizationApi(this._client);

  /// List organization admin API keys
  Future<OpenAiOrganizationAdminApiKeyList?> listAdminApiKeys([int? limit, String? order, String? after, String? before]) async {
    final query = buildQueryString([
      QueryParameterSpec('page_size', limit, 'form', true, false, null),
      QueryParameterSpec('order', order, 'form', true, false, null),
      QueryParameterSpec('after', after, 'form', true, false, null),
      QueryParameterSpec('before', before, 'form', true, false, null)
    ]);
    final response = await _client.get(ApiPaths.appendQueryString(ApiPaths.aiPath('/organization/admin_api_keys'), query));
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : OpenAiOrganizationAdminApiKeyList.fromJson(map);
    })();
  }

  /// Create organization admin API key
  Future<OpenAiOrganizationAdminApiKey?> createAdminApiKey(OpenAiOrganizationAdminApiKeyCreateRequest body) async {
    final payload = body.toJson();
    final response = await _client.post(ApiPaths.aiPath('/organization/admin_api_keys'), body: payload, contentType: 'application/json');
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : OpenAiOrganizationAdminApiKey.fromJson(map);
    })();
  }

  /// Delete organization admin API key
  Future<DeleteResult?> deleteAdminApiKeys(String keyId) async {
    final response = await _client.delete(ApiPaths.aiPath('/organization/admin_api_keys/${serializePathParameter(keyId, const PathParameterSpec('key_id', 'simple', false))}'));
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : DeleteResult.fromJson(map);
    })();
  }

  /// List organization audit logs
  Future<OpenAiOrganizationAuditLogList?> listAuditLogs([int? effectiveAtGte, int? effectiveAtLte, List<String>? projectIds, List<String>? eventTypes, List<String>? actorIds, List<String>? actorEmails, List<String>? resourceIds, int? limit, String? after, String? before]) async {
    final query = buildQueryString([
      QueryParameterSpec('effective_at[gte]', effectiveAtGte, 'form', true, false, null),
      QueryParameterSpec('effective_at[lte]', effectiveAtLte, 'form', true, false, null),
      QueryParameterSpec('project_ids[]', projectIds, 'form', true, false, null),
      QueryParameterSpec('event_types[]', eventTypes, 'form', true, false, null),
      QueryParameterSpec('actor_ids[]', actorIds, 'form', true, false, null),
      QueryParameterSpec('actor_emails[]', actorEmails, 'form', true, false, null),
      QueryParameterSpec('resource_ids[]', resourceIds, 'form', true, false, null),
      QueryParameterSpec('page_size', limit, 'form', true, false, null),
      QueryParameterSpec('after', after, 'form', true, false, null),
      QueryParameterSpec('before', before, 'form', true, false, null)
    ]);
    final response = await _client.get(ApiPaths.appendQueryString(ApiPaths.aiPath('/organization/audit_logs'), query));
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : OpenAiOrganizationAuditLogList.fromJson(map);
    })();
  }

  /// List organization certificates
  Future<OpenAiCertificateList?> listCertificates([int? limit, String? order, String? after, String? before]) async {
    final query = buildQueryString([
      QueryParameterSpec('page_size', limit, 'form', true, false, null),
      QueryParameterSpec('order', order, 'form', true, false, null),
      QueryParameterSpec('after', after, 'form', true, false, null),
      QueryParameterSpec('before', before, 'form', true, false, null)
    ]);
    final response = await _client.get(ApiPaths.appendQueryString(ApiPaths.aiPath('/organization/certificates'), query));
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : OpenAiCertificateList.fromJson(map);
    })();
  }

  /// Upload organization certificate
  Future<OpenAiCertificate?> createCertificate(OpenAiCertificateUploadMultipartRequest body) async {
    final payload = body.toJson();
    final response = await _client.post(ApiPaths.aiPath('/organization/certificates'), body: payload, contentType: 'multipart/form-data');
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : OpenAiCertificate.fromJson(map);
    })();
  }

  /// Activate organization certificates
  Future<OpenAiCertificateList?> createCertificatesActivate(OpenAiCertificateActivationRequest body) async {
    final payload = body.toJson();
    final response = await _client.post(ApiPaths.aiPath('/organization/certificates/activate'), body: payload, contentType: 'application/json');
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : OpenAiCertificateList.fromJson(map);
    })();
  }

  /// Deactivate organization certificates
  Future<OpenAiCertificateList?> createCertificatesDeactivate(OpenAiCertificateActivationRequest body) async {
    final payload = body.toJson();
    final response = await _client.post(ApiPaths.aiPath('/organization/certificates/deactivate'), body: payload, contentType: 'application/json');
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : OpenAiCertificateList.fromJson(map);
    })();
  }

  /// Delete organization certificate
  Future<DeleteResult?> deleteCertificates(String certificateId) async {
    final response = await _client.delete(ApiPaths.aiPath('/organization/certificates/${serializePathParameter(certificateId, const PathParameterSpec('certificate_id', 'simple', false))}'));
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : DeleteResult.fromJson(map);
    })();
  }

  /// Get organization costs
  Future<OpenAiOrganizationCostList?> listCosts([int? startTime, int? endTime, String? bucketWidth, List<String>? projectIds, List<String>? userIds, List<String>? apiKeyIds, List<String>? models, List<String>? groupBy, int? limit, String? page]) async {
    final query = buildQueryString([
      QueryParameterSpec('start_time', startTime, 'form', true, false, null),
      QueryParameterSpec('end_time', endTime, 'form', true, false, null),
      QueryParameterSpec('bucket_width', bucketWidth, 'form', true, false, null),
      QueryParameterSpec('project_ids', projectIds, 'form', true, false, null),
      QueryParameterSpec('user_ids', userIds, 'form', true, false, null),
      QueryParameterSpec('api_key_ids', apiKeyIds, 'form', true, false, null),
      QueryParameterSpec('models', models, 'form', true, false, null),
      QueryParameterSpec('group_by', groupBy, 'form', true, false, null),
      QueryParameterSpec('page_size', limit, 'form', true, false, null),
      QueryParameterSpec('page', page, 'form', true, false, null)
    ]);
    final response = await _client.get(ApiPaths.appendQueryString(ApiPaths.aiPath('/organization/costs'), query));
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : OpenAiOrganizationCostList.fromJson(map);
    })();
  }

  /// List organization groups
  Future<OpenAiOrganizationGroupList?> listGroups([int? limit, String? order, String? after, String? before]) async {
    final query = buildQueryString([
      QueryParameterSpec('page_size', limit, 'form', true, false, null),
      QueryParameterSpec('order', order, 'form', true, false, null),
      QueryParameterSpec('after', after, 'form', true, false, null),
      QueryParameterSpec('before', before, 'form', true, false, null)
    ]);
    final response = await _client.get(ApiPaths.appendQueryString(ApiPaths.aiPath('/organization/groups'), query));
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : OpenAiOrganizationGroupList.fromJson(map);
    })();
  }

  /// Create organization group
  Future<OpenAiOrganizationGroup?> createGroup(OpenAiOrganizationGroupCreateRequest body) async {
    final payload = body.toJson();
    final response = await _client.post(ApiPaths.aiPath('/organization/groups'), body: payload, contentType: 'application/json');
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : OpenAiOrganizationGroup.fromJson(map);
    })();
  }

  /// Delete organization group
  Future<DeleteResult?> deleteGroups(String groupId) async {
    final response = await _client.delete(ApiPaths.aiPath('/organization/groups/${serializePathParameter(groupId, const PathParameterSpec('group_id', 'simple', false))}'));
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : DeleteResult.fromJson(map);
    })();
  }

  /// List organization group roles
  Future<OpenAiRoleAssignmentList?> listGroupsRoles(String groupId, [int? limit, String? order, String? after, String? before]) async {
    final query = buildQueryString([
      QueryParameterSpec('page_size', limit, 'form', true, false, null),
      QueryParameterSpec('order', order, 'form', true, false, null),
      QueryParameterSpec('after', after, 'form', true, false, null),
      QueryParameterSpec('before', before, 'form', true, false, null)
    ]);
    final response = await _client.get(ApiPaths.appendQueryString(ApiPaths.aiPath('/organization/groups/${serializePathParameter(groupId, const PathParameterSpec('group_id', 'simple', false))}/roles'), query));
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : OpenAiRoleAssignmentList.fromJson(map);
    })();
  }

  /// Create organization group role
  Future<OpenAiRoleAssignment?> createGroupsRole(String groupId, OpenAiRoleAssignmentCreateRequest body) async {
    final payload = body.toJson();
    final response = await _client.post(ApiPaths.aiPath('/organization/groups/${serializePathParameter(groupId, const PathParameterSpec('group_id', 'simple', false))}/roles'), body: payload, contentType: 'application/json');
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : OpenAiRoleAssignment.fromJson(map);
    })();
  }

  /// Delete organization group role
  Future<DeleteResult?> deleteGroupsRoles(String groupId, String roleId) async {
    final response = await _client.delete(ApiPaths.aiPath('/organization/groups/${serializePathParameter(groupId, const PathParameterSpec('group_id', 'simple', false))}/roles/${serializePathParameter(roleId, const PathParameterSpec('role_id', 'simple', false))}'));
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : DeleteResult.fromJson(map);
    })();
  }

  /// List organization group users
  Future<OpenAiOrganizationUserList?> listGroupsUsers(String groupId, [int? limit, String? order, String? after, String? before]) async {
    final query = buildQueryString([
      QueryParameterSpec('page_size', limit, 'form', true, false, null),
      QueryParameterSpec('order', order, 'form', true, false, null),
      QueryParameterSpec('after', after, 'form', true, false, null),
      QueryParameterSpec('before', before, 'form', true, false, null)
    ]);
    final response = await _client.get(ApiPaths.appendQueryString(ApiPaths.aiPath('/organization/groups/${serializePathParameter(groupId, const PathParameterSpec('group_id', 'simple', false))}/users'), query));
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : OpenAiOrganizationUserList.fromJson(map);
    })();
  }

  /// Add organization group user
  Future<OpenAiOrganizationUser?> createGroupsUser(String groupId, OpenAiOrganizationGroupUserCreateRequest body) async {
    final payload = body.toJson();
    final response = await _client.post(ApiPaths.aiPath('/organization/groups/${serializePathParameter(groupId, const PathParameterSpec('group_id', 'simple', false))}/users'), body: payload, contentType: 'application/json');
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : OpenAiOrganizationUser.fromJson(map);
    })();
  }

  /// Delete organization group user
  Future<DeleteResult?> deleteGroupsUsers(String groupId, String userId) async {
    final response = await _client.delete(ApiPaths.aiPath('/organization/groups/${serializePathParameter(groupId, const PathParameterSpec('group_id', 'simple', false))}/users/${serializePathParameter(userId, const PathParameterSpec('user_id', 'simple', false))}'));
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : DeleteResult.fromJson(map);
    })();
  }

  /// List organization invites
  Future<OpenAiOrganizationInviteList?> listInvites([int? limit, String? order, String? after, String? before]) async {
    final query = buildQueryString([
      QueryParameterSpec('page_size', limit, 'form', true, false, null),
      QueryParameterSpec('order', order, 'form', true, false, null),
      QueryParameterSpec('after', after, 'form', true, false, null),
      QueryParameterSpec('before', before, 'form', true, false, null)
    ]);
    final response = await _client.get(ApiPaths.appendQueryString(ApiPaths.aiPath('/organization/invites'), query));
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : OpenAiOrganizationInviteList.fromJson(map);
    })();
  }

  /// Create organization invite
  Future<OpenAiOrganizationInvite?> createInvite(OpenAiOrganizationInviteCreateRequest body) async {
    final payload = body.toJson();
    final response = await _client.post(ApiPaths.aiPath('/organization/invites'), body: payload, contentType: 'application/json');
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : OpenAiOrganizationInvite.fromJson(map);
    })();
  }

  /// Delete organization invite
  Future<DeleteResult?> deleteInvites(String inviteId) async {
    final response = await _client.delete(ApiPaths.aiPath('/organization/invites/${serializePathParameter(inviteId, const PathParameterSpec('invite_id', 'simple', false))}'));
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : DeleteResult.fromJson(map);
    })();
  }

  /// List organization projects
  Future<OpenAiProjectList?> listProjects([int? limit, String? order, String? after, String? before]) async {
    final query = buildQueryString([
      QueryParameterSpec('page_size', limit, 'form', true, false, null),
      QueryParameterSpec('order', order, 'form', true, false, null),
      QueryParameterSpec('after', after, 'form', true, false, null),
      QueryParameterSpec('before', before, 'form', true, false, null)
    ]);
    final response = await _client.get(ApiPaths.appendQueryString(ApiPaths.aiPath('/organization/projects'), query));
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : OpenAiProjectList.fromJson(map);
    })();
  }

  /// Create organization project
  Future<OpenAiProject?> createProject(OpenAiProjectCreateRequest body) async {
    final payload = body.toJson();
    final response = await _client.post(ApiPaths.aiPath('/organization/projects'), body: payload, contentType: 'application/json');
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : OpenAiProject.fromJson(map);
    })();
  }

  /// List project API keys
  Future<OpenAiProjectApiKeyList?> listProjectsApiKeys(String projectId, [int? limit, String? order, String? after, String? before]) async {
    final query = buildQueryString([
      QueryParameterSpec('page_size', limit, 'form', true, false, null),
      QueryParameterSpec('order', order, 'form', true, false, null),
      QueryParameterSpec('after', after, 'form', true, false, null),
      QueryParameterSpec('before', before, 'form', true, false, null)
    ]);
    final response = await _client.get(ApiPaths.appendQueryString(ApiPaths.aiPath('/organization/projects/${serializePathParameter(projectId, const PathParameterSpec('project_id', 'simple', false))}/api_keys'), query));
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : OpenAiProjectApiKeyList.fromJson(map);
    })();
  }

  /// Delete project API key
  Future<DeleteResult?> deleteProjectsApiKeys(String projectId, String keyId) async {
    final response = await _client.delete(ApiPaths.aiPath('/organization/projects/${serializePathParameter(projectId, const PathParameterSpec('project_id', 'simple', false))}/api_keys/${serializePathParameter(keyId, const PathParameterSpec('key_id', 'simple', false))}'));
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : DeleteResult.fromJson(map);
    })();
  }

  /// Archive organization project
  Future<OpenAiProject?> createProjectsArchive(String projectId) async {
    final response = await _client.post(ApiPaths.aiPath('/organization/projects/${serializePathParameter(projectId, const PathParameterSpec('project_id', 'simple', false))}/archive'));
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : OpenAiProject.fromJson(map);
    })();
  }

  /// List project certificates
  Future<OpenAiCertificateList?> listProjectsCertificates(String projectId, [int? limit, String? order, String? after, String? before]) async {
    final query = buildQueryString([
      QueryParameterSpec('page_size', limit, 'form', true, false, null),
      QueryParameterSpec('order', order, 'form', true, false, null),
      QueryParameterSpec('after', after, 'form', true, false, null),
      QueryParameterSpec('before', before, 'form', true, false, null)
    ]);
    final response = await _client.get(ApiPaths.appendQueryString(ApiPaths.aiPath('/organization/projects/${serializePathParameter(projectId, const PathParameterSpec('project_id', 'simple', false))}/certificates'), query));
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : OpenAiCertificateList.fromJson(map);
    })();
  }

  /// Activate project certificates
  Future<OpenAiCertificateList?> createProjectsCertificatesActivate(String projectId, OpenAiCertificateActivationRequest body) async {
    final payload = body.toJson();
    final response = await _client.post(ApiPaths.aiPath('/organization/projects/${serializePathParameter(projectId, const PathParameterSpec('project_id', 'simple', false))}/certificates/activate'), body: payload, contentType: 'application/json');
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : OpenAiCertificateList.fromJson(map);
    })();
  }

  /// Deactivate project certificates
  Future<OpenAiCertificateList?> createProjectsCertificatesDeactivate(String projectId, OpenAiCertificateActivationRequest body) async {
    final payload = body.toJson();
    final response = await _client.post(ApiPaths.aiPath('/organization/projects/${serializePathParameter(projectId, const PathParameterSpec('project_id', 'simple', false))}/certificates/deactivate'), body: payload, contentType: 'application/json');
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : OpenAiCertificateList.fromJson(map);
    })();
  }

  /// List project groups
  Future<OpenAiOrganizationGroupList?> listProjectsGroups(String projectId, [int? limit, String? order, String? after, String? before]) async {
    final query = buildQueryString([
      QueryParameterSpec('page_size', limit, 'form', true, false, null),
      QueryParameterSpec('order', order, 'form', true, false, null),
      QueryParameterSpec('after', after, 'form', true, false, null),
      QueryParameterSpec('before', before, 'form', true, false, null)
    ]);
    final response = await _client.get(ApiPaths.appendQueryString(ApiPaths.aiPath('/organization/projects/${serializePathParameter(projectId, const PathParameterSpec('project_id', 'simple', false))}/groups'), query));
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : OpenAiOrganizationGroupList.fromJson(map);
    })();
  }

  /// Create project group
  Future<OpenAiOrganizationGroup?> createProjectsGroup(String projectId, OpenAiProjectGroupCreateRequest body) async {
    final payload = body.toJson();
    final response = await _client.post(ApiPaths.aiPath('/organization/projects/${serializePathParameter(projectId, const PathParameterSpec('project_id', 'simple', false))}/groups'), body: payload, contentType: 'application/json');
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : OpenAiOrganizationGroup.fromJson(map);
    })();
  }

  /// Delete project group
  Future<DeleteResult?> deleteProjectsGroups(String projectId, String groupId) async {
    final response = await _client.delete(ApiPaths.aiPath('/organization/projects/${serializePathParameter(projectId, const PathParameterSpec('project_id', 'simple', false))}/groups/${serializePathParameter(groupId, const PathParameterSpec('group_id', 'simple', false))}'));
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : DeleteResult.fromJson(map);
    })();
  }

  /// List project rate limits
  Future<OpenAiProjectRateLimitList?> listProjectsRateLimits(String projectId, [int? limit, String? order, String? after, String? before]) async {
    final query = buildQueryString([
      QueryParameterSpec('page_size', limit, 'form', true, false, null),
      QueryParameterSpec('order', order, 'form', true, false, null),
      QueryParameterSpec('after', after, 'form', true, false, null),
      QueryParameterSpec('before', before, 'form', true, false, null)
    ]);
    final response = await _client.get(ApiPaths.appendQueryString(ApiPaths.aiPath('/organization/projects/${serializePathParameter(projectId, const PathParameterSpec('project_id', 'simple', false))}/rate_limits'), query));
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : OpenAiProjectRateLimitList.fromJson(map);
    })();
  }

  /// Modify project rate limit
  Future<OpenAiProjectRateLimit?> createProjectsRateLimit(String projectId, String rateLimitId, OpenAiProjectRateLimitUpdateRequest body) async {
    final payload = body.toJson();
    final response = await _client.post(ApiPaths.aiPath('/organization/projects/${serializePathParameter(projectId, const PathParameterSpec('project_id', 'simple', false))}/rate_limits/${serializePathParameter(rateLimitId, const PathParameterSpec('rate_limit_id', 'simple', false))}'), body: payload, contentType: 'application/json');
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : OpenAiProjectRateLimit.fromJson(map);
    })();
  }

  /// List project service accounts
  Future<OpenAiProjectServiceAccountList?> listProjectsServiceAccounts(String projectId, [int? limit, String? order, String? after, String? before]) async {
    final query = buildQueryString([
      QueryParameterSpec('page_size', limit, 'form', true, false, null),
      QueryParameterSpec('order', order, 'form', true, false, null),
      QueryParameterSpec('after', after, 'form', true, false, null),
      QueryParameterSpec('before', before, 'form', true, false, null)
    ]);
    final response = await _client.get(ApiPaths.appendQueryString(ApiPaths.aiPath('/organization/projects/${serializePathParameter(projectId, const PathParameterSpec('project_id', 'simple', false))}/service_accounts'), query));
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : OpenAiProjectServiceAccountList.fromJson(map);
    })();
  }

  /// Create project service account
  Future<OpenAiProjectServiceAccount?> createProjectsServiceAccount(String projectId, OpenAiProjectServiceAccountCreateRequest body) async {
    final payload = body.toJson();
    final response = await _client.post(ApiPaths.aiPath('/organization/projects/${serializePathParameter(projectId, const PathParameterSpec('project_id', 'simple', false))}/service_accounts'), body: payload, contentType: 'application/json');
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : OpenAiProjectServiceAccount.fromJson(map);
    })();
  }

  /// Delete project service account
  Future<DeleteResult?> deleteProjectsServiceAccounts(String projectId, String serviceAccountId) async {
    final response = await _client.delete(ApiPaths.aiPath('/organization/projects/${serializePathParameter(projectId, const PathParameterSpec('project_id', 'simple', false))}/service_accounts/${serializePathParameter(serviceAccountId, const PathParameterSpec('service_account_id', 'simple', false))}'));
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : DeleteResult.fromJson(map);
    })();
  }

  /// List project users
  Future<OpenAiProjectUserList?> listProjectsUsers(String projectId, [int? limit, String? order, String? after, String? before]) async {
    final query = buildQueryString([
      QueryParameterSpec('page_size', limit, 'form', true, false, null),
      QueryParameterSpec('order', order, 'form', true, false, null),
      QueryParameterSpec('after', after, 'form', true, false, null),
      QueryParameterSpec('before', before, 'form', true, false, null)
    ]);
    final response = await _client.get(ApiPaths.appendQueryString(ApiPaths.aiPath('/organization/projects/${serializePathParameter(projectId, const PathParameterSpec('project_id', 'simple', false))}/users'), query));
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : OpenAiProjectUserList.fromJson(map);
    })();
  }

  /// Create project user
  Future<OpenAiProjectUser?> createProjectsUser(String projectId, OpenAiProjectUserCreateRequest body) async {
    final payload = body.toJson();
    final response = await _client.post(ApiPaths.aiPath('/organization/projects/${serializePathParameter(projectId, const PathParameterSpec('project_id', 'simple', false))}/users'), body: payload, contentType: 'application/json');
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : OpenAiProjectUser.fromJson(map);
    })();
  }

  /// Delete project user
  Future<DeleteResult?> deleteProjectsUsers(String projectId, String userId) async {
    final response = await _client.delete(ApiPaths.aiPath('/organization/projects/${serializePathParameter(projectId, const PathParameterSpec('project_id', 'simple', false))}/users/${serializePathParameter(userId, const PathParameterSpec('user_id', 'simple', false))}'));
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : DeleteResult.fromJson(map);
    })();
  }

  /// List organization roles
  Future<OpenAiRoleList?> listRoles([int? limit, String? order, String? after, String? before]) async {
    final query = buildQueryString([
      QueryParameterSpec('page_size', limit, 'form', true, false, null),
      QueryParameterSpec('order', order, 'form', true, false, null),
      QueryParameterSpec('after', after, 'form', true, false, null),
      QueryParameterSpec('before', before, 'form', true, false, null)
    ]);
    final response = await _client.get(ApiPaths.appendQueryString(ApiPaths.aiPath('/organization/roles'), query));
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : OpenAiRoleList.fromJson(map);
    })();
  }

  /// Create organization role
  Future<OpenAiRole?> createRole(OpenAiRoleCreateRequest body) async {
    final payload = body.toJson();
    final response = await _client.post(ApiPaths.aiPath('/organization/roles'), body: payload, contentType: 'application/json');
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : OpenAiRole.fromJson(map);
    })();
  }

  /// Delete organization role
  Future<DeleteResult?> deleteRoles(String roleId) async {
    final response = await _client.delete(ApiPaths.aiPath('/organization/roles/${serializePathParameter(roleId, const PathParameterSpec('role_id', 'simple', false))}'));
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : DeleteResult.fromJson(map);
    })();
  }

  /// Get audio speech usage
  Future<OpenAiOrganizationUsageList?> listUsageAudioSpeeches([int? startTime, int? endTime, String? bucketWidth, List<String>? projectIds, List<String>? userIds, List<String>? apiKeyIds, List<String>? models, List<String>? groupBy, int? limit, String? page]) async {
    final query = buildQueryString([
      QueryParameterSpec('start_time', startTime, 'form', true, false, null),
      QueryParameterSpec('end_time', endTime, 'form', true, false, null),
      QueryParameterSpec('bucket_width', bucketWidth, 'form', true, false, null),
      QueryParameterSpec('project_ids', projectIds, 'form', true, false, null),
      QueryParameterSpec('user_ids', userIds, 'form', true, false, null),
      QueryParameterSpec('api_key_ids', apiKeyIds, 'form', true, false, null),
      QueryParameterSpec('models', models, 'form', true, false, null),
      QueryParameterSpec('group_by', groupBy, 'form', true, false, null),
      QueryParameterSpec('page_size', limit, 'form', true, false, null),
      QueryParameterSpec('page', page, 'form', true, false, null)
    ]);
    final response = await _client.get(ApiPaths.appendQueryString(ApiPaths.aiPath('/organization/usage/audio_speeches'), query));
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : OpenAiOrganizationUsageList.fromJson(map);
    })();
  }

  /// Get audio transcription usage
  Future<OpenAiOrganizationUsageList?> listUsageAudioTranscriptions([int? startTime, int? endTime, String? bucketWidth, List<String>? projectIds, List<String>? userIds, List<String>? apiKeyIds, List<String>? models, List<String>? groupBy, int? limit, String? page]) async {
    final query = buildQueryString([
      QueryParameterSpec('start_time', startTime, 'form', true, false, null),
      QueryParameterSpec('end_time', endTime, 'form', true, false, null),
      QueryParameterSpec('bucket_width', bucketWidth, 'form', true, false, null),
      QueryParameterSpec('project_ids', projectIds, 'form', true, false, null),
      QueryParameterSpec('user_ids', userIds, 'form', true, false, null),
      QueryParameterSpec('api_key_ids', apiKeyIds, 'form', true, false, null),
      QueryParameterSpec('models', models, 'form', true, false, null),
      QueryParameterSpec('group_by', groupBy, 'form', true, false, null),
      QueryParameterSpec('page_size', limit, 'form', true, false, null),
      QueryParameterSpec('page', page, 'form', true, false, null)
    ]);
    final response = await _client.get(ApiPaths.appendQueryString(ApiPaths.aiPath('/organization/usage/audio_transcriptions'), query));
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : OpenAiOrganizationUsageList.fromJson(map);
    })();
  }

  /// Get code interpreter session usage
  Future<OpenAiOrganizationUsageList?> listUsageCodeInterpreterSessions([int? startTime, int? endTime, String? bucketWidth, List<String>? projectIds, List<String>? userIds, List<String>? apiKeyIds, List<String>? models, List<String>? groupBy, int? limit, String? page]) async {
    final query = buildQueryString([
      QueryParameterSpec('start_time', startTime, 'form', true, false, null),
      QueryParameterSpec('end_time', endTime, 'form', true, false, null),
      QueryParameterSpec('bucket_width', bucketWidth, 'form', true, false, null),
      QueryParameterSpec('project_ids', projectIds, 'form', true, false, null),
      QueryParameterSpec('user_ids', userIds, 'form', true, false, null),
      QueryParameterSpec('api_key_ids', apiKeyIds, 'form', true, false, null),
      QueryParameterSpec('models', models, 'form', true, false, null),
      QueryParameterSpec('group_by', groupBy, 'form', true, false, null),
      QueryParameterSpec('page_size', limit, 'form', true, false, null),
      QueryParameterSpec('page', page, 'form', true, false, null)
    ]);
    final response = await _client.get(ApiPaths.appendQueryString(ApiPaths.aiPath('/organization/usage/code_interpreter_sessions'), query));
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : OpenAiOrganizationUsageList.fromJson(map);
    })();
  }

  /// Get completions usage
  Future<OpenAiOrganizationUsageList?> listUsageCompletions([int? startTime, int? endTime, String? bucketWidth, List<String>? projectIds, List<String>? userIds, List<String>? apiKeyIds, List<String>? models, List<String>? groupBy, int? limit, String? page]) async {
    final query = buildQueryString([
      QueryParameterSpec('start_time', startTime, 'form', true, false, null),
      QueryParameterSpec('end_time', endTime, 'form', true, false, null),
      QueryParameterSpec('bucket_width', bucketWidth, 'form', true, false, null),
      QueryParameterSpec('project_ids', projectIds, 'form', true, false, null),
      QueryParameterSpec('user_ids', userIds, 'form', true, false, null),
      QueryParameterSpec('api_key_ids', apiKeyIds, 'form', true, false, null),
      QueryParameterSpec('models', models, 'form', true, false, null),
      QueryParameterSpec('group_by', groupBy, 'form', true, false, null),
      QueryParameterSpec('page_size', limit, 'form', true, false, null),
      QueryParameterSpec('page', page, 'form', true, false, null)
    ]);
    final response = await _client.get(ApiPaths.appendQueryString(ApiPaths.aiPath('/organization/usage/completions'), query));
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : OpenAiOrganizationUsageList.fromJson(map);
    })();
  }

  /// Get embeddings usage
  Future<OpenAiOrganizationUsageList?> listUsageEmbeddings([int? startTime, int? endTime, String? bucketWidth, List<String>? projectIds, List<String>? userIds, List<String>? apiKeyIds, List<String>? models, List<String>? groupBy, int? limit, String? page]) async {
    final query = buildQueryString([
      QueryParameterSpec('start_time', startTime, 'form', true, false, null),
      QueryParameterSpec('end_time', endTime, 'form', true, false, null),
      QueryParameterSpec('bucket_width', bucketWidth, 'form', true, false, null),
      QueryParameterSpec('project_ids', projectIds, 'form', true, false, null),
      QueryParameterSpec('user_ids', userIds, 'form', true, false, null),
      QueryParameterSpec('api_key_ids', apiKeyIds, 'form', true, false, null),
      QueryParameterSpec('models', models, 'form', true, false, null),
      QueryParameterSpec('group_by', groupBy, 'form', true, false, null),
      QueryParameterSpec('page_size', limit, 'form', true, false, null),
      QueryParameterSpec('page', page, 'form', true, false, null)
    ]);
    final response = await _client.get(ApiPaths.appendQueryString(ApiPaths.aiPath('/organization/usage/embeddings'), query));
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : OpenAiOrganizationUsageList.fromJson(map);
    })();
  }

  /// Get image usage
  Future<OpenAiOrganizationUsageList?> listUsageImages([int? startTime, int? endTime, String? bucketWidth, List<String>? projectIds, List<String>? userIds, List<String>? apiKeyIds, List<String>? models, List<String>? groupBy, int? limit, String? page]) async {
    final query = buildQueryString([
      QueryParameterSpec('start_time', startTime, 'form', true, false, null),
      QueryParameterSpec('end_time', endTime, 'form', true, false, null),
      QueryParameterSpec('bucket_width', bucketWidth, 'form', true, false, null),
      QueryParameterSpec('project_ids', projectIds, 'form', true, false, null),
      QueryParameterSpec('user_ids', userIds, 'form', true, false, null),
      QueryParameterSpec('api_key_ids', apiKeyIds, 'form', true, false, null),
      QueryParameterSpec('models', models, 'form', true, false, null),
      QueryParameterSpec('group_by', groupBy, 'form', true, false, null),
      QueryParameterSpec('page_size', limit, 'form', true, false, null),
      QueryParameterSpec('page', page, 'form', true, false, null)
    ]);
    final response = await _client.get(ApiPaths.appendQueryString(ApiPaths.aiPath('/organization/usage/images'), query));
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : OpenAiOrganizationUsageList.fromJson(map);
    })();
  }

  /// Get moderation usage
  Future<OpenAiOrganizationUsageList?> listUsageModerations([int? startTime, int? endTime, String? bucketWidth, List<String>? projectIds, List<String>? userIds, List<String>? apiKeyIds, List<String>? models, List<String>? groupBy, int? limit, String? page]) async {
    final query = buildQueryString([
      QueryParameterSpec('start_time', startTime, 'form', true, false, null),
      QueryParameterSpec('end_time', endTime, 'form', true, false, null),
      QueryParameterSpec('bucket_width', bucketWidth, 'form', true, false, null),
      QueryParameterSpec('project_ids', projectIds, 'form', true, false, null),
      QueryParameterSpec('user_ids', userIds, 'form', true, false, null),
      QueryParameterSpec('api_key_ids', apiKeyIds, 'form', true, false, null),
      QueryParameterSpec('models', models, 'form', true, false, null),
      QueryParameterSpec('group_by', groupBy, 'form', true, false, null),
      QueryParameterSpec('page_size', limit, 'form', true, false, null),
      QueryParameterSpec('page', page, 'form', true, false, null)
    ]);
    final response = await _client.get(ApiPaths.appendQueryString(ApiPaths.aiPath('/organization/usage/moderations'), query));
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : OpenAiOrganizationUsageList.fromJson(map);
    })();
  }

  /// Get vector store usage
  Future<OpenAiOrganizationUsageList?> listUsageVectorStores([int? startTime, int? endTime, String? bucketWidth, List<String>? projectIds, List<String>? userIds, List<String>? apiKeyIds, List<String>? models, List<String>? groupBy, int? limit, String? page]) async {
    final query = buildQueryString([
      QueryParameterSpec('start_time', startTime, 'form', true, false, null),
      QueryParameterSpec('end_time', endTime, 'form', true, false, null),
      QueryParameterSpec('bucket_width', bucketWidth, 'form', true, false, null),
      QueryParameterSpec('project_ids', projectIds, 'form', true, false, null),
      QueryParameterSpec('user_ids', userIds, 'form', true, false, null),
      QueryParameterSpec('api_key_ids', apiKeyIds, 'form', true, false, null),
      QueryParameterSpec('models', models, 'form', true, false, null),
      QueryParameterSpec('group_by', groupBy, 'form', true, false, null),
      QueryParameterSpec('page_size', limit, 'form', true, false, null),
      QueryParameterSpec('page', page, 'form', true, false, null)
    ]);
    final response = await _client.get(ApiPaths.appendQueryString(ApiPaths.aiPath('/organization/usage/vector_stores'), query));
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : OpenAiOrganizationUsageList.fromJson(map);
    })();
  }

  /// List organization users
  Future<OpenAiOrganizationUserList?> listUsers([int? limit, String? order, String? after, String? before]) async {
    final query = buildQueryString([
      QueryParameterSpec('page_size', limit, 'form', true, false, null),
      QueryParameterSpec('order', order, 'form', true, false, null),
      QueryParameterSpec('after', after, 'form', true, false, null),
      QueryParameterSpec('before', before, 'form', true, false, null)
    ]);
    final response = await _client.get(ApiPaths.appendQueryString(ApiPaths.aiPath('/organization/users'), query));
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : OpenAiOrganizationUserList.fromJson(map);
    })();
  }

  /// Delete organization user
  Future<DeleteResult?> deleteUsers(String userId) async {
    final response = await _client.delete(ApiPaths.aiPath('/organization/users/${serializePathParameter(userId, const PathParameterSpec('user_id', 'simple', false))}'));
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : DeleteResult.fromJson(map);
    })();
  }

  /// Modify organization user
  Future<OpenAiOrganizationUser?> createUser(String userId, OpenAiOrganizationUserUpdateRequest body) async {
    final payload = body.toJson();
    final response = await _client.post(ApiPaths.aiPath('/organization/users/${serializePathParameter(userId, const PathParameterSpec('user_id', 'simple', false))}'), body: payload, contentType: 'application/json');
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : OpenAiOrganizationUser.fromJson(map);
    })();
  }

  /// List organization user roles
  Future<OpenAiRoleAssignmentList?> listUsersRoles(String userId, [int? limit, String? order, String? after, String? before]) async {
    final query = buildQueryString([
      QueryParameterSpec('page_size', limit, 'form', true, false, null),
      QueryParameterSpec('order', order, 'form', true, false, null),
      QueryParameterSpec('after', after, 'form', true, false, null),
      QueryParameterSpec('before', before, 'form', true, false, null)
    ]);
    final response = await _client.get(ApiPaths.appendQueryString(ApiPaths.aiPath('/organization/users/${serializePathParameter(userId, const PathParameterSpec('user_id', 'simple', false))}/roles'), query));
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : OpenAiRoleAssignmentList.fromJson(map);
    })();
  }

  /// Create organization user role
  Future<OpenAiRoleAssignment?> createUsersRole(String userId, OpenAiRoleAssignmentCreateRequest body) async {
    final payload = body.toJson();
    final response = await _client.post(ApiPaths.aiPath('/organization/users/${serializePathParameter(userId, const PathParameterSpec('user_id', 'simple', false))}/roles'), body: payload, contentType: 'application/json');
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : OpenAiRoleAssignment.fromJson(map);
    })();
  }

  /// Delete organization user role
  Future<DeleteResult?> deleteUsersRoles(String userId, String roleId) async {
    final response = await _client.delete(ApiPaths.aiPath('/organization/users/${serializePathParameter(userId, const PathParameterSpec('user_id', 'simple', false))}/roles/${serializePathParameter(roleId, const PathParameterSpec('role_id', 'simple', false))}'));
    return (() {
      final map = sdkworkResponseAsMap(response);
      return map == null ? null : DeleteResult.fromJson(map);
    })();
  }
}

class PathParameterSpec {
  final String name;
  final String style;
  final bool explode;

  const PathParameterSpec(this.name, this.style, this.explode);
}

String serializePathParameter(dynamic value, PathParameterSpec spec) {
  if (value == null) return '';
  final style = spec.style.trim().isEmpty ? 'simple' : spec.style;
  if (value is Iterable) {
    return serializePathArray(spec.name, value, style, spec.explode);
  }
  if (value is Map) {
    return serializePathObject(spec.name, value, style, spec.explode);
  }
  return pathPrimitivePrefix(spec.name, style) + Uri.encodeComponent(value.toString());
}

String serializePathArray(String name, Iterable values, String style, bool explode) {
  final serialized = values.where((item) => item != null).map((item) => Uri.encodeComponent(item.toString())).toList();
  if (serialized.isEmpty) return pathPrefix(name, style);
  if (style == 'matrix') {
    if (explode) {
      return serialized.map((item) => ';$name=$item').join();
    }
    return ';$name=${serialized.join(',')}';
  }
  final separator = explode ? '.' : ',';
  return pathPrefix(name, style) + serialized.join(separator);
}

String serializePathObject(String name, Map values, String style, bool explode) {
  final entries = <String>[];
  final exploded = <String>[];
  values.forEach((key, value) {
    if (value == null) return;
    final escapedKey = Uri.encodeComponent(key.toString());
    final escapedValue = Uri.encodeComponent(value.toString());
    if (explode) {
      if (style == 'matrix') {
        exploded.add(';$escapedKey=$escapedValue');
      } else {
        exploded.add('$escapedKey=$escapedValue');
      }
    } else {
      entries.add(escapedKey);
      entries.add(escapedValue);
    }
  });
  if (style == 'matrix') {
    if (explode) return exploded.join();
    return ';$name=${entries.join(',')}';
  }
  if (explode) {
    final separator = style == 'label' ? '.' : ',';
    return pathPrefix(name, style) + exploded.join(separator);
  }
  return pathPrefix(name, style) + entries.join(',');
}

String pathPrefix(String name, String style) {
  if (style == 'label') return '.';
  if (style == 'matrix') return ';$name';
  return '';
}

String pathPrimitivePrefix(String name, String style) {
  return style == 'matrix' ? ';$name=' : pathPrefix(name, style);
}
class QueryParameterSpec {
  final String name;
  final dynamic value;
  final String style;
  final bool explode;
  final bool allowReserved;
  final String? contentType;

  const QueryParameterSpec(
    this.name,
    this.value,
    this.style,
    this.explode,
    this.allowReserved,
    this.contentType,
  );
}

String buildQueryString(List<QueryParameterSpec> parameters) {
  final pairs = <String>[];
  for (final parameter in parameters) {
    appendSerializedParameter(pairs, parameter);
  }
  return pairs.join('&');
}

void appendSerializedParameter(List<String> pairs, QueryParameterSpec parameter) {
  final value = parameter.value;
  if (value == null) return;

  final contentType = parameter.contentType;
  if (contentType != null && contentType.trim().isNotEmpty) {
    pairs.add('${urlEncode(parameter.name)}=${encodeQueryValue(jsonEncode(value), parameter.allowReserved)}');
    return;
  }

  final style = parameter.style.trim().isEmpty ? 'form' : parameter.style;
  if (style == 'deepObject' && value is Map) {
    appendDeepObjectParameter(pairs, parameter.name, value, parameter.allowReserved);
    return;
  }
  if (value is Iterable) {
    appendArrayParameter(pairs, parameter.name, value, style, parameter.explode, parameter.allowReserved);
    return;
  }
  if (value is Map) {
    appendObjectParameter(pairs, parameter.name, value, style, parameter.explode, parameter.allowReserved);
    return;
  }
  pairs.add('${urlEncode(parameter.name)}=${encodeQueryValue(value.toString(), parameter.allowReserved)}');
}

void appendArrayParameter(
  List<String> pairs,
  String name,
  Iterable values,
  String style,
  bool explode,
  bool allowReserved,
) {
  final serialized = values.where((item) => item != null).map((item) => item.toString()).toList();
  if (serialized.isEmpty) return;
  if (style == 'form' && explode) {
    for (final item in serialized) {
      pairs.add('${urlEncode(name)}=${encodeQueryValue(item, allowReserved)}');
    }
    return;
  }
  pairs.add('${urlEncode(name)}=${encodeQueryValue(serialized.join(','), allowReserved)}');
}

void appendObjectParameter(
  List<String> pairs,
  String name,
  Map values,
  String style,
  bool explode,
  bool allowReserved,
) {
  final serialized = <String>[];
  values.forEach((key, value) {
    if (value == null) return;
    if (style == 'form' && explode) {
      pairs.add('${urlEncode(key.toString())}=${encodeQueryValue(value.toString(), allowReserved)}');
      return;
    }
    serialized.add(key.toString());
    serialized.add(value.toString());
  });
  if (serialized.isNotEmpty) {
    pairs.add('${urlEncode(name)}=${encodeQueryValue(serialized.join(','), allowReserved)}');
  }
}

void appendDeepObjectParameter(List<String> pairs, String name, Map values, bool allowReserved) {
  values.forEach((key, value) {
    if (value != null) {
      pairs.add('${urlEncode('$name[$key]')}=${encodeQueryValue(value.toString(), allowReserved)}');
    }
  });
}

String encodeQueryValue(String value, bool allowReserved) {
  var encoded = urlEncode(value);
  if (!allowReserved) return encoded;
  const replacements = <String, String>{
    '%3A': ':',
    '%2F': '/',
    '%3F': '?',
    '%23': '#',
    '%5B': '[',
    '%5D': ']',
    '%40': '@',
    '%21': '!',
    '%24': r'$',
    '%26': '&',
    '%27': "'",
    '%28': '(',
    '%29': ')',
    '%2A': '*',
    '%2B': '+',
    '%2C': ',',
    '%3B': ';',
    '%3D': '=',
  };
  replacements.forEach((escaped, reserved) {
    encoded = encoded.replaceAll(escaped, reserved);
  });
  return encoded;
}

String urlEncode(String value) => Uri.encodeQueryComponent(value);
