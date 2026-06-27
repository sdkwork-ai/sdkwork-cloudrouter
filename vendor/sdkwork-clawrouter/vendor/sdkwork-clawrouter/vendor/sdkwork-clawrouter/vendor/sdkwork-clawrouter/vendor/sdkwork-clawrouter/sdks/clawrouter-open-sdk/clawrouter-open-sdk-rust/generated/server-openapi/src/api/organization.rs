use std::sync::Arc;

use crate::api::paths::ai_path;
use crate::api::paths::append_query_string;
use crate::http::{SdkworkError, SdkworkHttpClient};
use crate::models::{
    DeleteResult, OpenAiCertificate, OpenAiCertificateActivationRequest, OpenAiCertificateList,
    OpenAiCertificateUploadMultipartRequest, OpenAiOrganizationAdminApiKey,
    OpenAiOrganizationAdminApiKeyCreateRequest, OpenAiOrganizationAdminApiKeyList,
    OpenAiOrganizationAuditLogList, OpenAiOrganizationCostList, OpenAiOrganizationGroup,
    OpenAiOrganizationGroupCreateRequest, OpenAiOrganizationGroupList,
    OpenAiOrganizationGroupUserCreateRequest, OpenAiOrganizationInvite,
    OpenAiOrganizationInviteCreateRequest, OpenAiOrganizationInviteList,
    OpenAiOrganizationUsageList, OpenAiOrganizationUser, OpenAiOrganizationUserList,
    OpenAiOrganizationUserUpdateRequest, OpenAiProject, OpenAiProjectApiKeyList,
    OpenAiProjectCreateRequest, OpenAiProjectGroupCreateRequest, OpenAiProjectList,
    OpenAiProjectRateLimit, OpenAiProjectRateLimitList, OpenAiProjectRateLimitUpdateRequest,
    OpenAiProjectServiceAccount, OpenAiProjectServiceAccountCreateRequest,
    OpenAiProjectServiceAccountList, OpenAiProjectUser, OpenAiProjectUserCreateRequest,
    OpenAiProjectUserList, OpenAiRole, OpenAiRoleAssignment, OpenAiRoleAssignmentCreateRequest,
    OpenAiRoleAssignmentList, OpenAiRoleCreateRequest, OpenAiRoleList,
};

#[derive(Clone)]
pub struct OrganizationApi {
    client: Arc<SdkworkHttpClient>,
}

impl OrganizationApi {
    pub fn new(client: Arc<SdkworkHttpClient>) -> Self {
        Self { client }
    }

    /// List organization admin API keys
    pub async fn list_admin_api_keys(
        &self,
        limit: Option<i64>,
        order: Option<&str>,
        after: Option<&str>,
        before: Option<&str>,
    ) -> Result<OpenAiOrganizationAdminApiKeyList, SdkworkError> {
        let query = build_query_string(&[
            QueryParameterSpec::new("limit", limit, "form", true, false, None),
            QueryParameterSpec::new("order", order, "form", true, false, None),
            QueryParameterSpec::new("after", after, "form", true, false, None),
            QueryParameterSpec::new("before", before, "form", true, false, None),
        ]);
        let path =
            append_query_string(ai_path(&"/organization/admin_api_keys".to_string()), &query);
        self.client.get(&path, None, None).await
    }

    /// Create organization admin API key
    pub async fn create_admin_api_key(
        &self,
        body: &OpenAiOrganizationAdminApiKeyCreateRequest,
    ) -> Result<OpenAiOrganizationAdminApiKey, SdkworkError> {
        let path = ai_path(&"/organization/admin_api_keys".to_string());
        self.client
            .post(&path, Some(body), None, None, Some("application/json"))
            .await
    }

    /// Delete organization admin API key
    pub async fn delete_admin_api_keys(&self, key_id: &str) -> Result<DeleteResult, SdkworkError> {
        let path = ai_path(&format!(
            "/organization/admin_api_keys/{}",
            serialize_path_parameter(key_id, PathParameterSpec::new("key_id", "simple", false))
        ));
        self.client.delete(&path, None, None).await
    }

    /// List organization audit logs
    pub async fn list_audit_logs(
        &self,
        effective_at_gte: Option<i64>,
        effective_at_lte: Option<i64>,
        project_ids: Option<&[String]>,
        event_types: Option<&[String]>,
        actor_ids: Option<&[String]>,
        actor_emails: Option<&[String]>,
        resource_ids: Option<&[String]>,
        limit: Option<i64>,
        after: Option<&str>,
        before: Option<&str>,
    ) -> Result<OpenAiOrganizationAuditLogList, SdkworkError> {
        let query = build_query_string(&[
            QueryParameterSpec::new(
                "effective_at[gte]",
                effective_at_gte,
                "form",
                true,
                false,
                None,
            ),
            QueryParameterSpec::new(
                "effective_at[lte]",
                effective_at_lte,
                "form",
                true,
                false,
                None,
            ),
            QueryParameterSpec::new("project_ids[]", project_ids, "form", true, false, None),
            QueryParameterSpec::new("event_types[]", event_types, "form", true, false, None),
            QueryParameterSpec::new("actor_ids[]", actor_ids, "form", true, false, None),
            QueryParameterSpec::new("actor_emails[]", actor_emails, "form", true, false, None),
            QueryParameterSpec::new("resource_ids[]", resource_ids, "form", true, false, None),
            QueryParameterSpec::new("limit", limit, "form", true, false, None),
            QueryParameterSpec::new("after", after, "form", true, false, None),
            QueryParameterSpec::new("before", before, "form", true, false, None),
        ]);
        let path = append_query_string(ai_path(&"/organization/audit_logs".to_string()), &query);
        self.client.get(&path, None, None).await
    }

    /// List organization certificates
    pub async fn list_certificates(
        &self,
        limit: Option<i64>,
        order: Option<&str>,
        after: Option<&str>,
        before: Option<&str>,
    ) -> Result<OpenAiCertificateList, SdkworkError> {
        let query = build_query_string(&[
            QueryParameterSpec::new("limit", limit, "form", true, false, None),
            QueryParameterSpec::new("order", order, "form", true, false, None),
            QueryParameterSpec::new("after", after, "form", true, false, None),
            QueryParameterSpec::new("before", before, "form", true, false, None),
        ]);
        let path = append_query_string(ai_path(&"/organization/certificates".to_string()), &query);
        self.client.get(&path, None, None).await
    }

    /// Upload organization certificate
    pub async fn create_certificate(
        &self,
        body: &OpenAiCertificateUploadMultipartRequest,
    ) -> Result<OpenAiCertificate, SdkworkError> {
        let path = ai_path(&"/organization/certificates".to_string());
        self.client
            .post(&path, Some(body), None, None, Some("multipart/form-data"))
            .await
    }

    /// Activate organization certificates
    pub async fn create_certificates_activate(
        &self,
        body: &OpenAiCertificateActivationRequest,
    ) -> Result<OpenAiCertificateList, SdkworkError> {
        let path = ai_path(&"/organization/certificates/activate".to_string());
        self.client
            .post(&path, Some(body), None, None, Some("application/json"))
            .await
    }

    /// Deactivate organization certificates
    pub async fn create_certificates_deactivate(
        &self,
        body: &OpenAiCertificateActivationRequest,
    ) -> Result<OpenAiCertificateList, SdkworkError> {
        let path = ai_path(&"/organization/certificates/deactivate".to_string());
        self.client
            .post(&path, Some(body), None, None, Some("application/json"))
            .await
    }

    /// Delete organization certificate
    pub async fn delete_certificates(
        &self,
        certificate_id: &str,
    ) -> Result<DeleteResult, SdkworkError> {
        let path = ai_path(&format!(
            "/organization/certificates/{}",
            serialize_path_parameter(
                certificate_id,
                PathParameterSpec::new("certificate_id", "simple", false)
            )
        ));
        self.client.delete(&path, None, None).await
    }

    /// Get organization costs
    pub async fn list_costs(
        &self,
        start_time: Option<i64>,
        end_time: Option<i64>,
        bucket_width: Option<&str>,
        project_ids: Option<&[String]>,
        user_ids: Option<&[String]>,
        api_key_ids: Option<&[String]>,
        models: Option<&[String]>,
        group_by: Option<&[String]>,
        limit: Option<i64>,
        page: Option<&str>,
    ) -> Result<OpenAiOrganizationCostList, SdkworkError> {
        let query = build_query_string(&[
            QueryParameterSpec::new("start_time", start_time, "form", true, false, None),
            QueryParameterSpec::new("end_time", end_time, "form", true, false, None),
            QueryParameterSpec::new("bucket_width", bucket_width, "form", true, false, None),
            QueryParameterSpec::new("project_ids", project_ids, "form", true, false, None),
            QueryParameterSpec::new("user_ids", user_ids, "form", true, false, None),
            QueryParameterSpec::new("api_key_ids", api_key_ids, "form", true, false, None),
            QueryParameterSpec::new("models", models, "form", true, false, None),
            QueryParameterSpec::new("group_by", group_by, "form", true, false, None),
            QueryParameterSpec::new("limit", limit, "form", true, false, None),
            QueryParameterSpec::new("page", page, "form", true, false, None),
        ]);
        let path = append_query_string(ai_path(&"/organization/costs".to_string()), &query);
        self.client.get(&path, None, None).await
    }

    /// List organization groups
    pub async fn list_groups(
        &self,
        limit: Option<i64>,
        order: Option<&str>,
        after: Option<&str>,
        before: Option<&str>,
    ) -> Result<OpenAiOrganizationGroupList, SdkworkError> {
        let query = build_query_string(&[
            QueryParameterSpec::new("limit", limit, "form", true, false, None),
            QueryParameterSpec::new("order", order, "form", true, false, None),
            QueryParameterSpec::new("after", after, "form", true, false, None),
            QueryParameterSpec::new("before", before, "form", true, false, None),
        ]);
        let path = append_query_string(ai_path(&"/organization/groups".to_string()), &query);
        self.client.get(&path, None, None).await
    }

    /// Create organization group
    pub async fn create_group(
        &self,
        body: &OpenAiOrganizationGroupCreateRequest,
    ) -> Result<OpenAiOrganizationGroup, SdkworkError> {
        let path = ai_path(&"/organization/groups".to_string());
        self.client
            .post(&path, Some(body), None, None, Some("application/json"))
            .await
    }

    /// Delete organization group
    pub async fn delete_groups(&self, group_id: &str) -> Result<DeleteResult, SdkworkError> {
        let path = ai_path(&format!(
            "/organization/groups/{}",
            serialize_path_parameter(
                group_id,
                PathParameterSpec::new("group_id", "simple", false)
            )
        ));
        self.client.delete(&path, None, None).await
    }

    /// List organization group roles
    pub async fn list_groups_roles(
        &self,
        group_id: &str,
        limit: Option<i64>,
        order: Option<&str>,
        after: Option<&str>,
        before: Option<&str>,
    ) -> Result<OpenAiRoleAssignmentList, SdkworkError> {
        let query = build_query_string(&[
            QueryParameterSpec::new("limit", limit, "form", true, false, None),
            QueryParameterSpec::new("order", order, "form", true, false, None),
            QueryParameterSpec::new("after", after, "form", true, false, None),
            QueryParameterSpec::new("before", before, "form", true, false, None),
        ]);
        let path = append_query_string(
            ai_path(&format!(
                "/organization/groups/{}/roles",
                serialize_path_parameter(
                    group_id,
                    PathParameterSpec::new("group_id", "simple", false)
                )
            )),
            &query,
        );
        self.client.get(&path, None, None).await
    }

    /// Create organization group role
    pub async fn create_groups_role(
        &self,
        group_id: &str,
        body: &OpenAiRoleAssignmentCreateRequest,
    ) -> Result<OpenAiRoleAssignment, SdkworkError> {
        let path = ai_path(&format!(
            "/organization/groups/{}/roles",
            serialize_path_parameter(
                group_id,
                PathParameterSpec::new("group_id", "simple", false)
            )
        ));
        self.client
            .post(&path, Some(body), None, None, Some("application/json"))
            .await
    }

    /// Delete organization group role
    pub async fn delete_groups_roles(
        &self,
        group_id: &str,
        role_id: &str,
    ) -> Result<DeleteResult, SdkworkError> {
        let path = ai_path(&format!(
            "/organization/groups/{}/roles/{}",
            serialize_path_parameter(
                group_id,
                PathParameterSpec::new("group_id", "simple", false)
            ),
            serialize_path_parameter(role_id, PathParameterSpec::new("role_id", "simple", false))
        ));
        self.client.delete(&path, None, None).await
    }

    /// List organization group users
    pub async fn list_groups_users(
        &self,
        group_id: &str,
        limit: Option<i64>,
        order: Option<&str>,
        after: Option<&str>,
        before: Option<&str>,
    ) -> Result<OpenAiOrganizationUserList, SdkworkError> {
        let query = build_query_string(&[
            QueryParameterSpec::new("limit", limit, "form", true, false, None),
            QueryParameterSpec::new("order", order, "form", true, false, None),
            QueryParameterSpec::new("after", after, "form", true, false, None),
            QueryParameterSpec::new("before", before, "form", true, false, None),
        ]);
        let path = append_query_string(
            ai_path(&format!(
                "/organization/groups/{}/users",
                serialize_path_parameter(
                    group_id,
                    PathParameterSpec::new("group_id", "simple", false)
                )
            )),
            &query,
        );
        self.client.get(&path, None, None).await
    }

    /// Add organization group user
    pub async fn create_groups_user(
        &self,
        group_id: &str,
        body: &OpenAiOrganizationGroupUserCreateRequest,
    ) -> Result<OpenAiOrganizationUser, SdkworkError> {
        let path = ai_path(&format!(
            "/organization/groups/{}/users",
            serialize_path_parameter(
                group_id,
                PathParameterSpec::new("group_id", "simple", false)
            )
        ));
        self.client
            .post(&path, Some(body), None, None, Some("application/json"))
            .await
    }

    /// Delete organization group user
    pub async fn delete_groups_users(
        &self,
        group_id: &str,
        user_id: &str,
    ) -> Result<DeleteResult, SdkworkError> {
        let path = ai_path(&format!(
            "/organization/groups/{}/users/{}",
            serialize_path_parameter(
                group_id,
                PathParameterSpec::new("group_id", "simple", false)
            ),
            serialize_path_parameter(user_id, PathParameterSpec::new("user_id", "simple", false))
        ));
        self.client.delete(&path, None, None).await
    }

    /// List organization invites
    pub async fn list_invites(
        &self,
        limit: Option<i64>,
        order: Option<&str>,
        after: Option<&str>,
        before: Option<&str>,
    ) -> Result<OpenAiOrganizationInviteList, SdkworkError> {
        let query = build_query_string(&[
            QueryParameterSpec::new("limit", limit, "form", true, false, None),
            QueryParameterSpec::new("order", order, "form", true, false, None),
            QueryParameterSpec::new("after", after, "form", true, false, None),
            QueryParameterSpec::new("before", before, "form", true, false, None),
        ]);
        let path = append_query_string(ai_path(&"/organization/invites".to_string()), &query);
        self.client.get(&path, None, None).await
    }

    /// Create organization invite
    pub async fn create_invite(
        &self,
        body: &OpenAiOrganizationInviteCreateRequest,
    ) -> Result<OpenAiOrganizationInvite, SdkworkError> {
        let path = ai_path(&"/organization/invites".to_string());
        self.client
            .post(&path, Some(body), None, None, Some("application/json"))
            .await
    }

    /// Delete organization invite
    pub async fn delete_invites(&self, invite_id: &str) -> Result<DeleteResult, SdkworkError> {
        let path = ai_path(&format!(
            "/organization/invites/{}",
            serialize_path_parameter(
                invite_id,
                PathParameterSpec::new("invite_id", "simple", false)
            )
        ));
        self.client.delete(&path, None, None).await
    }

    /// List organization projects
    pub async fn list_projects(
        &self,
        limit: Option<i64>,
        order: Option<&str>,
        after: Option<&str>,
        before: Option<&str>,
    ) -> Result<OpenAiProjectList, SdkworkError> {
        let query = build_query_string(&[
            QueryParameterSpec::new("limit", limit, "form", true, false, None),
            QueryParameterSpec::new("order", order, "form", true, false, None),
            QueryParameterSpec::new("after", after, "form", true, false, None),
            QueryParameterSpec::new("before", before, "form", true, false, None),
        ]);
        let path = append_query_string(ai_path(&"/organization/projects".to_string()), &query);
        self.client.get(&path, None, None).await
    }

    /// Create organization project
    pub async fn create_project(
        &self,
        body: &OpenAiProjectCreateRequest,
    ) -> Result<OpenAiProject, SdkworkError> {
        let path = ai_path(&"/organization/projects".to_string());
        self.client
            .post(&path, Some(body), None, None, Some("application/json"))
            .await
    }

    /// List project API keys
    pub async fn list_projects_api_keys(
        &self,
        project_id: &str,
        limit: Option<i64>,
        order: Option<&str>,
        after: Option<&str>,
        before: Option<&str>,
    ) -> Result<OpenAiProjectApiKeyList, SdkworkError> {
        let query = build_query_string(&[
            QueryParameterSpec::new("limit", limit, "form", true, false, None),
            QueryParameterSpec::new("order", order, "form", true, false, None),
            QueryParameterSpec::new("after", after, "form", true, false, None),
            QueryParameterSpec::new("before", before, "form", true, false, None),
        ]);
        let path = append_query_string(
            ai_path(&format!(
                "/organization/projects/{}/api_keys",
                serialize_path_parameter(
                    project_id,
                    PathParameterSpec::new("project_id", "simple", false)
                )
            )),
            &query,
        );
        self.client.get(&path, None, None).await
    }

    /// Delete project API key
    pub async fn delete_projects_api_keys(
        &self,
        project_id: &str,
        key_id: &str,
    ) -> Result<DeleteResult, SdkworkError> {
        let path = ai_path(&format!(
            "/organization/projects/{}/api_keys/{}",
            serialize_path_parameter(
                project_id,
                PathParameterSpec::new("project_id", "simple", false)
            ),
            serialize_path_parameter(key_id, PathParameterSpec::new("key_id", "simple", false))
        ));
        self.client.delete(&path, None, None).await
    }

    /// Archive organization project
    pub async fn create_projects_archive(
        &self,
        project_id: &str,
    ) -> Result<OpenAiProject, SdkworkError> {
        let path = ai_path(&format!(
            "/organization/projects/{}/archive",
            serialize_path_parameter(
                project_id,
                PathParameterSpec::new("project_id", "simple", false)
            )
        ));
        self.client
            .post(&path, Option::<&serde_json::Value>::None, None, None, None)
            .await
    }

    /// List project certificates
    pub async fn list_projects_certificates(
        &self,
        project_id: &str,
        limit: Option<i64>,
        order: Option<&str>,
        after: Option<&str>,
        before: Option<&str>,
    ) -> Result<OpenAiCertificateList, SdkworkError> {
        let query = build_query_string(&[
            QueryParameterSpec::new("limit", limit, "form", true, false, None),
            QueryParameterSpec::new("order", order, "form", true, false, None),
            QueryParameterSpec::new("after", after, "form", true, false, None),
            QueryParameterSpec::new("before", before, "form", true, false, None),
        ]);
        let path = append_query_string(
            ai_path(&format!(
                "/organization/projects/{}/certificates",
                serialize_path_parameter(
                    project_id,
                    PathParameterSpec::new("project_id", "simple", false)
                )
            )),
            &query,
        );
        self.client.get(&path, None, None).await
    }

    /// Activate project certificates
    pub async fn create_projects_certificates_activate(
        &self,
        project_id: &str,
        body: &OpenAiCertificateActivationRequest,
    ) -> Result<OpenAiCertificateList, SdkworkError> {
        let path = ai_path(&format!(
            "/organization/projects/{}/certificates/activate",
            serialize_path_parameter(
                project_id,
                PathParameterSpec::new("project_id", "simple", false)
            )
        ));
        self.client
            .post(&path, Some(body), None, None, Some("application/json"))
            .await
    }

    /// Deactivate project certificates
    pub async fn create_projects_certificates_deactivate(
        &self,
        project_id: &str,
        body: &OpenAiCertificateActivationRequest,
    ) -> Result<OpenAiCertificateList, SdkworkError> {
        let path = ai_path(&format!(
            "/organization/projects/{}/certificates/deactivate",
            serialize_path_parameter(
                project_id,
                PathParameterSpec::new("project_id", "simple", false)
            )
        ));
        self.client
            .post(&path, Some(body), None, None, Some("application/json"))
            .await
    }

    /// List project groups
    pub async fn list_projects_groups(
        &self,
        project_id: &str,
        limit: Option<i64>,
        order: Option<&str>,
        after: Option<&str>,
        before: Option<&str>,
    ) -> Result<OpenAiOrganizationGroupList, SdkworkError> {
        let query = build_query_string(&[
            QueryParameterSpec::new("limit", limit, "form", true, false, None),
            QueryParameterSpec::new("order", order, "form", true, false, None),
            QueryParameterSpec::new("after", after, "form", true, false, None),
            QueryParameterSpec::new("before", before, "form", true, false, None),
        ]);
        let path = append_query_string(
            ai_path(&format!(
                "/organization/projects/{}/groups",
                serialize_path_parameter(
                    project_id,
                    PathParameterSpec::new("project_id", "simple", false)
                )
            )),
            &query,
        );
        self.client.get(&path, None, None).await
    }

    /// Create project group
    pub async fn create_projects_group(
        &self,
        project_id: &str,
        body: &OpenAiProjectGroupCreateRequest,
    ) -> Result<OpenAiOrganizationGroup, SdkworkError> {
        let path = ai_path(&format!(
            "/organization/projects/{}/groups",
            serialize_path_parameter(
                project_id,
                PathParameterSpec::new("project_id", "simple", false)
            )
        ));
        self.client
            .post(&path, Some(body), None, None, Some("application/json"))
            .await
    }

    /// Delete project group
    pub async fn delete_projects_groups(
        &self,
        project_id: &str,
        group_id: &str,
    ) -> Result<DeleteResult, SdkworkError> {
        let path = ai_path(&format!(
            "/organization/projects/{}/groups/{}",
            serialize_path_parameter(
                project_id,
                PathParameterSpec::new("project_id", "simple", false)
            ),
            serialize_path_parameter(
                group_id,
                PathParameterSpec::new("group_id", "simple", false)
            )
        ));
        self.client.delete(&path, None, None).await
    }

    /// List project rate limits
    pub async fn list_projects_rate_limits(
        &self,
        project_id: &str,
        limit: Option<i64>,
        order: Option<&str>,
        after: Option<&str>,
        before: Option<&str>,
    ) -> Result<OpenAiProjectRateLimitList, SdkworkError> {
        let query = build_query_string(&[
            QueryParameterSpec::new("limit", limit, "form", true, false, None),
            QueryParameterSpec::new("order", order, "form", true, false, None),
            QueryParameterSpec::new("after", after, "form", true, false, None),
            QueryParameterSpec::new("before", before, "form", true, false, None),
        ]);
        let path = append_query_string(
            ai_path(&format!(
                "/organization/projects/{}/rate_limits",
                serialize_path_parameter(
                    project_id,
                    PathParameterSpec::new("project_id", "simple", false)
                )
            )),
            &query,
        );
        self.client.get(&path, None, None).await
    }

    /// Modify project rate limit
    pub async fn create_projects_rate_limit(
        &self,
        project_id: &str,
        rate_limit_id: &str,
        body: &OpenAiProjectRateLimitUpdateRequest,
    ) -> Result<OpenAiProjectRateLimit, SdkworkError> {
        let path = ai_path(&format!(
            "/organization/projects/{}/rate_limits/{}",
            serialize_path_parameter(
                project_id,
                PathParameterSpec::new("project_id", "simple", false)
            ),
            serialize_path_parameter(
                rate_limit_id,
                PathParameterSpec::new("rate_limit_id", "simple", false)
            )
        ));
        self.client
            .post(&path, Some(body), None, None, Some("application/json"))
            .await
    }

    /// List project service accounts
    pub async fn list_projects_service_accounts(
        &self,
        project_id: &str,
        limit: Option<i64>,
        order: Option<&str>,
        after: Option<&str>,
        before: Option<&str>,
    ) -> Result<OpenAiProjectServiceAccountList, SdkworkError> {
        let query = build_query_string(&[
            QueryParameterSpec::new("limit", limit, "form", true, false, None),
            QueryParameterSpec::new("order", order, "form", true, false, None),
            QueryParameterSpec::new("after", after, "form", true, false, None),
            QueryParameterSpec::new("before", before, "form", true, false, None),
        ]);
        let path = append_query_string(
            ai_path(&format!(
                "/organization/projects/{}/service_accounts",
                serialize_path_parameter(
                    project_id,
                    PathParameterSpec::new("project_id", "simple", false)
                )
            )),
            &query,
        );
        self.client.get(&path, None, None).await
    }

    /// Create project service account
    pub async fn create_projects_service_account(
        &self,
        project_id: &str,
        body: &OpenAiProjectServiceAccountCreateRequest,
    ) -> Result<OpenAiProjectServiceAccount, SdkworkError> {
        let path = ai_path(&format!(
            "/organization/projects/{}/service_accounts",
            serialize_path_parameter(
                project_id,
                PathParameterSpec::new("project_id", "simple", false)
            )
        ));
        self.client
            .post(&path, Some(body), None, None, Some("application/json"))
            .await
    }

    /// Delete project service account
    pub async fn delete_projects_service_accounts(
        &self,
        project_id: &str,
        service_account_id: &str,
    ) -> Result<DeleteResult, SdkworkError> {
        let path = ai_path(&format!(
            "/organization/projects/{}/service_accounts/{}",
            serialize_path_parameter(
                project_id,
                PathParameterSpec::new("project_id", "simple", false)
            ),
            serialize_path_parameter(
                service_account_id,
                PathParameterSpec::new("service_account_id", "simple", false)
            )
        ));
        self.client.delete(&path, None, None).await
    }

    /// List project users
    pub async fn list_projects_users(
        &self,
        project_id: &str,
        limit: Option<i64>,
        order: Option<&str>,
        after: Option<&str>,
        before: Option<&str>,
    ) -> Result<OpenAiProjectUserList, SdkworkError> {
        let query = build_query_string(&[
            QueryParameterSpec::new("limit", limit, "form", true, false, None),
            QueryParameterSpec::new("order", order, "form", true, false, None),
            QueryParameterSpec::new("after", after, "form", true, false, None),
            QueryParameterSpec::new("before", before, "form", true, false, None),
        ]);
        let path = append_query_string(
            ai_path(&format!(
                "/organization/projects/{}/users",
                serialize_path_parameter(
                    project_id,
                    PathParameterSpec::new("project_id", "simple", false)
                )
            )),
            &query,
        );
        self.client.get(&path, None, None).await
    }

    /// Create project user
    pub async fn create_projects_user(
        &self,
        project_id: &str,
        body: &OpenAiProjectUserCreateRequest,
    ) -> Result<OpenAiProjectUser, SdkworkError> {
        let path = ai_path(&format!(
            "/organization/projects/{}/users",
            serialize_path_parameter(
                project_id,
                PathParameterSpec::new("project_id", "simple", false)
            )
        ));
        self.client
            .post(&path, Some(body), None, None, Some("application/json"))
            .await
    }

    /// Delete project user
    pub async fn delete_projects_users(
        &self,
        project_id: &str,
        user_id: &str,
    ) -> Result<DeleteResult, SdkworkError> {
        let path = ai_path(&format!(
            "/organization/projects/{}/users/{}",
            serialize_path_parameter(
                project_id,
                PathParameterSpec::new("project_id", "simple", false)
            ),
            serialize_path_parameter(user_id, PathParameterSpec::new("user_id", "simple", false))
        ));
        self.client.delete(&path, None, None).await
    }

    /// List organization roles
    pub async fn list_roles(
        &self,
        limit: Option<i64>,
        order: Option<&str>,
        after: Option<&str>,
        before: Option<&str>,
    ) -> Result<OpenAiRoleList, SdkworkError> {
        let query = build_query_string(&[
            QueryParameterSpec::new("limit", limit, "form", true, false, None),
            QueryParameterSpec::new("order", order, "form", true, false, None),
            QueryParameterSpec::new("after", after, "form", true, false, None),
            QueryParameterSpec::new("before", before, "form", true, false, None),
        ]);
        let path = append_query_string(ai_path(&"/organization/roles".to_string()), &query);
        self.client.get(&path, None, None).await
    }

    /// Create organization role
    pub async fn create_role(
        &self,
        body: &OpenAiRoleCreateRequest,
    ) -> Result<OpenAiRole, SdkworkError> {
        let path = ai_path(&"/organization/roles".to_string());
        self.client
            .post(&path, Some(body), None, None, Some("application/json"))
            .await
    }

    /// Delete organization role
    pub async fn delete_roles(&self, role_id: &str) -> Result<DeleteResult, SdkworkError> {
        let path = ai_path(&format!(
            "/organization/roles/{}",
            serialize_path_parameter(role_id, PathParameterSpec::new("role_id", "simple", false))
        ));
        self.client.delete(&path, None, None).await
    }

    /// Get audio speech usage
    pub async fn list_usage_audio_speeches(
        &self,
        start_time: Option<i64>,
        end_time: Option<i64>,
        bucket_width: Option<&str>,
        project_ids: Option<&[String]>,
        user_ids: Option<&[String]>,
        api_key_ids: Option<&[String]>,
        models: Option<&[String]>,
        group_by: Option<&[String]>,
        limit: Option<i64>,
        page: Option<&str>,
    ) -> Result<OpenAiOrganizationUsageList, SdkworkError> {
        let query = build_query_string(&[
            QueryParameterSpec::new("start_time", start_time, "form", true, false, None),
            QueryParameterSpec::new("end_time", end_time, "form", true, false, None),
            QueryParameterSpec::new("bucket_width", bucket_width, "form", true, false, None),
            QueryParameterSpec::new("project_ids", project_ids, "form", true, false, None),
            QueryParameterSpec::new("user_ids", user_ids, "form", true, false, None),
            QueryParameterSpec::new("api_key_ids", api_key_ids, "form", true, false, None),
            QueryParameterSpec::new("models", models, "form", true, false, None),
            QueryParameterSpec::new("group_by", group_by, "form", true, false, None),
            QueryParameterSpec::new("limit", limit, "form", true, false, None),
            QueryParameterSpec::new("page", page, "form", true, false, None),
        ]);
        let path = append_query_string(
            ai_path(&"/organization/usage/audio_speeches".to_string()),
            &query,
        );
        self.client.get(&path, None, None).await
    }

    /// Get audio transcription usage
    pub async fn list_usage_audio_transcriptions(
        &self,
        start_time: Option<i64>,
        end_time: Option<i64>,
        bucket_width: Option<&str>,
        project_ids: Option<&[String]>,
        user_ids: Option<&[String]>,
        api_key_ids: Option<&[String]>,
        models: Option<&[String]>,
        group_by: Option<&[String]>,
        limit: Option<i64>,
        page: Option<&str>,
    ) -> Result<OpenAiOrganizationUsageList, SdkworkError> {
        let query = build_query_string(&[
            QueryParameterSpec::new("start_time", start_time, "form", true, false, None),
            QueryParameterSpec::new("end_time", end_time, "form", true, false, None),
            QueryParameterSpec::new("bucket_width", bucket_width, "form", true, false, None),
            QueryParameterSpec::new("project_ids", project_ids, "form", true, false, None),
            QueryParameterSpec::new("user_ids", user_ids, "form", true, false, None),
            QueryParameterSpec::new("api_key_ids", api_key_ids, "form", true, false, None),
            QueryParameterSpec::new("models", models, "form", true, false, None),
            QueryParameterSpec::new("group_by", group_by, "form", true, false, None),
            QueryParameterSpec::new("limit", limit, "form", true, false, None),
            QueryParameterSpec::new("page", page, "form", true, false, None),
        ]);
        let path = append_query_string(
            ai_path(&"/organization/usage/audio_transcriptions".to_string()),
            &query,
        );
        self.client.get(&path, None, None).await
    }

    /// Get code interpreter session usage
    pub async fn list_usage_code_interpreter_sessions(
        &self,
        start_time: Option<i64>,
        end_time: Option<i64>,
        bucket_width: Option<&str>,
        project_ids: Option<&[String]>,
        user_ids: Option<&[String]>,
        api_key_ids: Option<&[String]>,
        models: Option<&[String]>,
        group_by: Option<&[String]>,
        limit: Option<i64>,
        page: Option<&str>,
    ) -> Result<OpenAiOrganizationUsageList, SdkworkError> {
        let query = build_query_string(&[
            QueryParameterSpec::new("start_time", start_time, "form", true, false, None),
            QueryParameterSpec::new("end_time", end_time, "form", true, false, None),
            QueryParameterSpec::new("bucket_width", bucket_width, "form", true, false, None),
            QueryParameterSpec::new("project_ids", project_ids, "form", true, false, None),
            QueryParameterSpec::new("user_ids", user_ids, "form", true, false, None),
            QueryParameterSpec::new("api_key_ids", api_key_ids, "form", true, false, None),
            QueryParameterSpec::new("models", models, "form", true, false, None),
            QueryParameterSpec::new("group_by", group_by, "form", true, false, None),
            QueryParameterSpec::new("limit", limit, "form", true, false, None),
            QueryParameterSpec::new("page", page, "form", true, false, None),
        ]);
        let path = append_query_string(
            ai_path(&"/organization/usage/code_interpreter_sessions".to_string()),
            &query,
        );
        self.client.get(&path, None, None).await
    }

    /// Get completions usage
    pub async fn list_usage_completions(
        &self,
        start_time: Option<i64>,
        end_time: Option<i64>,
        bucket_width: Option<&str>,
        project_ids: Option<&[String]>,
        user_ids: Option<&[String]>,
        api_key_ids: Option<&[String]>,
        models: Option<&[String]>,
        group_by: Option<&[String]>,
        limit: Option<i64>,
        page: Option<&str>,
    ) -> Result<OpenAiOrganizationUsageList, SdkworkError> {
        let query = build_query_string(&[
            QueryParameterSpec::new("start_time", start_time, "form", true, false, None),
            QueryParameterSpec::new("end_time", end_time, "form", true, false, None),
            QueryParameterSpec::new("bucket_width", bucket_width, "form", true, false, None),
            QueryParameterSpec::new("project_ids", project_ids, "form", true, false, None),
            QueryParameterSpec::new("user_ids", user_ids, "form", true, false, None),
            QueryParameterSpec::new("api_key_ids", api_key_ids, "form", true, false, None),
            QueryParameterSpec::new("models", models, "form", true, false, None),
            QueryParameterSpec::new("group_by", group_by, "form", true, false, None),
            QueryParameterSpec::new("limit", limit, "form", true, false, None),
            QueryParameterSpec::new("page", page, "form", true, false, None),
        ]);
        let path = append_query_string(
            ai_path(&"/organization/usage/completions".to_string()),
            &query,
        );
        self.client.get(&path, None, None).await
    }

    /// Get embeddings usage
    pub async fn list_usage_embeddings(
        &self,
        start_time: Option<i64>,
        end_time: Option<i64>,
        bucket_width: Option<&str>,
        project_ids: Option<&[String]>,
        user_ids: Option<&[String]>,
        api_key_ids: Option<&[String]>,
        models: Option<&[String]>,
        group_by: Option<&[String]>,
        limit: Option<i64>,
        page: Option<&str>,
    ) -> Result<OpenAiOrganizationUsageList, SdkworkError> {
        let query = build_query_string(&[
            QueryParameterSpec::new("start_time", start_time, "form", true, false, None),
            QueryParameterSpec::new("end_time", end_time, "form", true, false, None),
            QueryParameterSpec::new("bucket_width", bucket_width, "form", true, false, None),
            QueryParameterSpec::new("project_ids", project_ids, "form", true, false, None),
            QueryParameterSpec::new("user_ids", user_ids, "form", true, false, None),
            QueryParameterSpec::new("api_key_ids", api_key_ids, "form", true, false, None),
            QueryParameterSpec::new("models", models, "form", true, false, None),
            QueryParameterSpec::new("group_by", group_by, "form", true, false, None),
            QueryParameterSpec::new("limit", limit, "form", true, false, None),
            QueryParameterSpec::new("page", page, "form", true, false, None),
        ]);
        let path = append_query_string(
            ai_path(&"/organization/usage/embeddings".to_string()),
            &query,
        );
        self.client.get(&path, None, None).await
    }

    /// Get image usage
    pub async fn list_usage_images(
        &self,
        start_time: Option<i64>,
        end_time: Option<i64>,
        bucket_width: Option<&str>,
        project_ids: Option<&[String]>,
        user_ids: Option<&[String]>,
        api_key_ids: Option<&[String]>,
        models: Option<&[String]>,
        group_by: Option<&[String]>,
        limit: Option<i64>,
        page: Option<&str>,
    ) -> Result<OpenAiOrganizationUsageList, SdkworkError> {
        let query = build_query_string(&[
            QueryParameterSpec::new("start_time", start_time, "form", true, false, None),
            QueryParameterSpec::new("end_time", end_time, "form", true, false, None),
            QueryParameterSpec::new("bucket_width", bucket_width, "form", true, false, None),
            QueryParameterSpec::new("project_ids", project_ids, "form", true, false, None),
            QueryParameterSpec::new("user_ids", user_ids, "form", true, false, None),
            QueryParameterSpec::new("api_key_ids", api_key_ids, "form", true, false, None),
            QueryParameterSpec::new("models", models, "form", true, false, None),
            QueryParameterSpec::new("group_by", group_by, "form", true, false, None),
            QueryParameterSpec::new("limit", limit, "form", true, false, None),
            QueryParameterSpec::new("page", page, "form", true, false, None),
        ]);
        let path = append_query_string(ai_path(&"/organization/usage/images".to_string()), &query);
        self.client.get(&path, None, None).await
    }

    /// Get moderation usage
    pub async fn list_usage_moderations(
        &self,
        start_time: Option<i64>,
        end_time: Option<i64>,
        bucket_width: Option<&str>,
        project_ids: Option<&[String]>,
        user_ids: Option<&[String]>,
        api_key_ids: Option<&[String]>,
        models: Option<&[String]>,
        group_by: Option<&[String]>,
        limit: Option<i64>,
        page: Option<&str>,
    ) -> Result<OpenAiOrganizationUsageList, SdkworkError> {
        let query = build_query_string(&[
            QueryParameterSpec::new("start_time", start_time, "form", true, false, None),
            QueryParameterSpec::new("end_time", end_time, "form", true, false, None),
            QueryParameterSpec::new("bucket_width", bucket_width, "form", true, false, None),
            QueryParameterSpec::new("project_ids", project_ids, "form", true, false, None),
            QueryParameterSpec::new("user_ids", user_ids, "form", true, false, None),
            QueryParameterSpec::new("api_key_ids", api_key_ids, "form", true, false, None),
            QueryParameterSpec::new("models", models, "form", true, false, None),
            QueryParameterSpec::new("group_by", group_by, "form", true, false, None),
            QueryParameterSpec::new("limit", limit, "form", true, false, None),
            QueryParameterSpec::new("page", page, "form", true, false, None),
        ]);
        let path = append_query_string(
            ai_path(&"/organization/usage/moderations".to_string()),
            &query,
        );
        self.client.get(&path, None, None).await
    }

    /// Get vector store usage
    pub async fn list_usage_vector_stores(
        &self,
        start_time: Option<i64>,
        end_time: Option<i64>,
        bucket_width: Option<&str>,
        project_ids: Option<&[String]>,
        user_ids: Option<&[String]>,
        api_key_ids: Option<&[String]>,
        models: Option<&[String]>,
        group_by: Option<&[String]>,
        limit: Option<i64>,
        page: Option<&str>,
    ) -> Result<OpenAiOrganizationUsageList, SdkworkError> {
        let query = build_query_string(&[
            QueryParameterSpec::new("start_time", start_time, "form", true, false, None),
            QueryParameterSpec::new("end_time", end_time, "form", true, false, None),
            QueryParameterSpec::new("bucket_width", bucket_width, "form", true, false, None),
            QueryParameterSpec::new("project_ids", project_ids, "form", true, false, None),
            QueryParameterSpec::new("user_ids", user_ids, "form", true, false, None),
            QueryParameterSpec::new("api_key_ids", api_key_ids, "form", true, false, None),
            QueryParameterSpec::new("models", models, "form", true, false, None),
            QueryParameterSpec::new("group_by", group_by, "form", true, false, None),
            QueryParameterSpec::new("limit", limit, "form", true, false, None),
            QueryParameterSpec::new("page", page, "form", true, false, None),
        ]);
        let path = append_query_string(
            ai_path(&"/organization/usage/vector_stores".to_string()),
            &query,
        );
        self.client.get(&path, None, None).await
    }

    /// List organization users
    pub async fn list_users(
        &self,
        limit: Option<i64>,
        order: Option<&str>,
        after: Option<&str>,
        before: Option<&str>,
    ) -> Result<OpenAiOrganizationUserList, SdkworkError> {
        let query = build_query_string(&[
            QueryParameterSpec::new("limit", limit, "form", true, false, None),
            QueryParameterSpec::new("order", order, "form", true, false, None),
            QueryParameterSpec::new("after", after, "form", true, false, None),
            QueryParameterSpec::new("before", before, "form", true, false, None),
        ]);
        let path = append_query_string(ai_path(&"/organization/users".to_string()), &query);
        self.client.get(&path, None, None).await
    }

    /// Delete organization user
    pub async fn delete_users(&self, user_id: &str) -> Result<DeleteResult, SdkworkError> {
        let path = ai_path(&format!(
            "/organization/users/{}",
            serialize_path_parameter(user_id, PathParameterSpec::new("user_id", "simple", false))
        ));
        self.client.delete(&path, None, None).await
    }

    /// Modify organization user
    pub async fn create_user(
        &self,
        user_id: &str,
        body: &OpenAiOrganizationUserUpdateRequest,
    ) -> Result<OpenAiOrganizationUser, SdkworkError> {
        let path = ai_path(&format!(
            "/organization/users/{}",
            serialize_path_parameter(user_id, PathParameterSpec::new("user_id", "simple", false))
        ));
        self.client
            .post(&path, Some(body), None, None, Some("application/json"))
            .await
    }

    /// List organization user roles
    pub async fn list_users_roles(
        &self,
        user_id: &str,
        limit: Option<i64>,
        order: Option<&str>,
        after: Option<&str>,
        before: Option<&str>,
    ) -> Result<OpenAiRoleAssignmentList, SdkworkError> {
        let query = build_query_string(&[
            QueryParameterSpec::new("limit", limit, "form", true, false, None),
            QueryParameterSpec::new("order", order, "form", true, false, None),
            QueryParameterSpec::new("after", after, "form", true, false, None),
            QueryParameterSpec::new("before", before, "form", true, false, None),
        ]);
        let path = append_query_string(
            ai_path(&format!(
                "/organization/users/{}/roles",
                serialize_path_parameter(
                    user_id,
                    PathParameterSpec::new("user_id", "simple", false)
                )
            )),
            &query,
        );
        self.client.get(&path, None, None).await
    }

    /// Create organization user role
    pub async fn create_users_role(
        &self,
        user_id: &str,
        body: &OpenAiRoleAssignmentCreateRequest,
    ) -> Result<OpenAiRoleAssignment, SdkworkError> {
        let path = ai_path(&format!(
            "/organization/users/{}/roles",
            serialize_path_parameter(user_id, PathParameterSpec::new("user_id", "simple", false))
        ));
        self.client
            .post(&path, Some(body), None, None, Some("application/json"))
            .await
    }

    /// Delete organization user role
    pub async fn delete_users_roles(
        &self,
        user_id: &str,
        role_id: &str,
    ) -> Result<DeleteResult, SdkworkError> {
        let path = ai_path(&format!(
            "/organization/users/{}/roles/{}",
            serialize_path_parameter(user_id, PathParameterSpec::new("user_id", "simple", false)),
            serialize_path_parameter(role_id, PathParameterSpec::new("role_id", "simple", false))
        ));
        self.client.delete(&path, None, None).await
    }
}

struct PathParameterSpec<'a> {
    name: &'a str,
    style: &'a str,
    explode: bool,
}

impl<'a> PathParameterSpec<'a> {
    fn new(name: &'a str, style: &'a str, explode: bool) -> Self {
        Self {
            name,
            style,
            explode,
        }
    }
}

fn serialize_path_parameter<T: serde::Serialize>(value: T, spec: PathParameterSpec<'_>) -> String {
    let value = serde_json::to_value(value).unwrap_or(serde_json::Value::Null);
    if value.is_null() {
        return String::new();
    }
    let style = if spec.style.is_empty() {
        "simple"
    } else {
        spec.style
    };
    match value {
        serde_json::Value::Array(values) => {
            serialize_path_array(spec.name, &values, style, spec.explode)
        }
        serde_json::Value::Object(values) => {
            serialize_path_object(spec.name, &values, style, spec.explode)
        }
        value => format!(
            "{}{}",
            path_primitive_prefix(spec.name, style),
            percent_encode(&primitive_to_string(&value))
        ),
    }
}

fn serialize_path_array(
    name: &str,
    values: &[serde_json::Value],
    style: &str,
    explode: bool,
) -> String {
    let serialized = values
        .iter()
        .filter(|value| !value.is_null())
        .map(|value| percent_encode(&primitive_to_string(value)))
        .collect::<Vec<_>>();
    if serialized.is_empty() {
        return path_prefix(name, style);
    }
    if style == "matrix" {
        if explode {
            return serialized
                .iter()
                .map(|item| format!(";{}={}", name, item))
                .collect::<Vec<_>>()
                .join("");
        }
        return format!(";{}={}", name, serialized.join(","));
    }
    let separator = if explode { "." } else { "," };
    format!("{}{}", path_prefix(name, style), serialized.join(separator))
}

fn serialize_path_object(
    name: &str,
    values: &serde_json::Map<String, serde_json::Value>,
    style: &str,
    explode: bool,
) -> String {
    let mut entries = Vec::new();
    let mut exploded = Vec::new();
    for (key, value) in values {
        if value.is_null() {
            continue;
        }
        let escaped_key = percent_encode(key);
        let escaped_value = percent_encode(&primitive_to_string(value));
        if explode {
            if style == "matrix" {
                exploded.push(format!(";{}={}", escaped_key, escaped_value));
            } else {
                exploded.push(format!("{}={}", escaped_key, escaped_value));
            }
        } else {
            entries.push(escaped_key);
            entries.push(escaped_value);
        }
    }
    if style == "matrix" {
        if explode {
            return exploded.join("");
        }
        return format!(";{}={}", name, entries.join(","));
    }
    if explode {
        let separator = if style == "label" { "." } else { "," };
        return format!("{}{}", path_prefix(name, style), exploded.join(separator));
    }
    format!("{}{}", path_prefix(name, style), entries.join(","))
}

fn path_prefix(name: &str, style: &str) -> String {
    match style {
        "label" => ".".to_string(),
        "matrix" => format!(";{}", name),
        _ => String::new(),
    }
}

fn path_primitive_prefix(name: &str, style: &str) -> String {
    if style == "matrix" {
        format!(";{}=", name)
    } else {
        path_prefix(name, style)
    }
}

struct QueryParameterSpec<'a> {
    name: &'a str,
    value: serde_json::Value,
    style: &'a str,
    explode: bool,
    allow_reserved: bool,
    content_type: Option<&'a str>,
}

impl<'a> QueryParameterSpec<'a> {
    fn new<T: serde::Serialize>(
        name: &'a str,
        value: T,
        style: &'a str,
        explode: bool,
        allow_reserved: bool,
        content_type: Option<&'a str>,
    ) -> Self {
        Self {
            name,
            value: serde_json::to_value(value).unwrap_or(serde_json::Value::Null),
            style,
            explode,
            allow_reserved,
            content_type,
        }
    }
}

fn build_query_string(parameters: &[QueryParameterSpec<'_>]) -> String {
    let mut pairs = Vec::new();
    for parameter in parameters {
        append_serialized_parameter(&mut pairs, parameter);
    }
    pairs.join("&")
}

fn append_serialized_parameter(pairs: &mut Vec<String>, parameter: &QueryParameterSpec<'_>) {
    if parameter.value.is_null() {
        return;
    }
    if parameter.content_type.is_some() {
        pairs.push(format!(
            "{}={}",
            percent_encode(parameter.name),
            encode_query_value(&parameter.value.to_string(), parameter.allow_reserved)
        ));
        return;
    }

    let style = if parameter.style.is_empty() {
        "form"
    } else {
        parameter.style
    };
    match &parameter.value {
        serde_json::Value::Array(values) => append_array_parameter(
            pairs,
            parameter.name,
            values,
            style,
            parameter.explode,
            parameter.allow_reserved,
        ),
        serde_json::Value::Object(values) if style == "deepObject" => {
            append_deep_object_parameter(pairs, parameter.name, values, parameter.allow_reserved)
        }
        serde_json::Value::Object(values) => append_object_parameter(
            pairs,
            parameter.name,
            values,
            style,
            parameter.explode,
            parameter.allow_reserved,
        ),
        value => pairs.push(format!(
            "{}={}",
            percent_encode(parameter.name),
            encode_query_value(&primitive_to_string(value), parameter.allow_reserved)
        )),
    }
}

fn append_array_parameter(
    pairs: &mut Vec<String>,
    name: &str,
    values: &[serde_json::Value],
    style: &str,
    explode: bool,
    allow_reserved: bool,
) {
    let serialized = values
        .iter()
        .filter(|value| !value.is_null())
        .map(primitive_to_string)
        .collect::<Vec<_>>();
    if serialized.is_empty() {
        return;
    }
    if style == "form" && explode {
        for item in serialized {
            pairs.push(format!(
                "{}={}",
                percent_encode(name),
                encode_query_value(&item, allow_reserved)
            ));
        }
        return;
    }
    pairs.push(format!(
        "{}={}",
        percent_encode(name),
        encode_query_value(&serialized.join(","), allow_reserved)
    ));
}

fn append_object_parameter(
    pairs: &mut Vec<String>,
    name: &str,
    values: &serde_json::Map<String, serde_json::Value>,
    style: &str,
    explode: bool,
    allow_reserved: bool,
) {
    let mut serialized = Vec::new();
    for (key, value) in values {
        if value.is_null() {
            continue;
        }
        if style == "form" && explode {
            pairs.push(format!(
                "{}={}",
                percent_encode(key),
                encode_query_value(&primitive_to_string(value), allow_reserved)
            ));
        } else {
            serialized.push(key.clone());
            serialized.push(primitive_to_string(value));
        }
    }
    if !serialized.is_empty() {
        pairs.push(format!(
            "{}={}",
            percent_encode(name),
            encode_query_value(&serialized.join(","), allow_reserved)
        ));
    }
}

fn append_deep_object_parameter(
    pairs: &mut Vec<String>,
    name: &str,
    values: &serde_json::Map<String, serde_json::Value>,
    allow_reserved: bool,
) {
    for (key, value) in values {
        if !value.is_null() {
            pairs.push(format!(
                "{}={}",
                percent_encode(&format!("{}[{}]", name, key)),
                encode_query_value(&primitive_to_string(value), allow_reserved)
            ));
        }
    }
}

fn encode_query_value(value: &str, allow_reserved: bool) -> String {
    let mut encoded = percent_encode(value);
    if !allow_reserved {
        return encoded;
    }
    for (escaped, reserved) in [
        ("%3A", ":"),
        ("%2F", "/"),
        ("%3F", "?"),
        ("%23", "#"),
        ("%5B", "["),
        ("%5D", "]"),
        ("%40", "@"),
        ("%21", "!"),
        ("%24", "$"),
        ("%26", "&"),
        ("%27", "'"),
        ("%28", "("),
        ("%29", ")"),
        ("%2A", "*"),
        ("%2B", "+"),
        ("%2C", ","),
        ("%3B", ";"),
        ("%3D", "="),
    ] {
        encoded = encoded.replace(escaped, reserved);
    }
    encoded
}

fn primitive_to_string(value: &serde_json::Value) -> String {
    match value {
        serde_json::Value::String(value) => value.clone(),
        serde_json::Value::Number(value) => value.to_string(),
        serde_json::Value::Bool(value) => value.to_string(),
        other => other.to_string(),
    }
}

fn percent_encode(value: &str) -> String {
    value
        .bytes()
        .flat_map(|byte| match byte {
            b'A'..=b'Z' | b'a'..=b'z' | b'0'..=b'9' | b'-' | b'_' | b'.' | b'~' => {
                vec![byte as char]
            }
            _ => format!("%{:02X}", byte).chars().collect(),
        })
        .collect()
}
