import { aiApiPath } from './paths';
import type { HttpClient } from '../http/client';

import type { DeleteResult, OpenAiCertificate, OpenAiCertificateActivationRequest, OpenAiCertificateList, OpenAiCertificateUploadMultipartRequest, OpenAiOrganizationAdminApiKey, OpenAiOrganizationAdminApiKeyCreateRequest, OpenAiOrganizationAdminApiKeyList, OpenAiOrganizationAuditLogList, OpenAiOrganizationCostList, OpenAiOrganizationGroup, OpenAiOrganizationGroupCreateRequest, OpenAiOrganizationGroupList, OpenAiOrganizationGroupUpdateRequest, OpenAiOrganizationGroupUserCreateRequest, OpenAiOrganizationInvite, OpenAiOrganizationInviteCreateRequest, OpenAiOrganizationInviteList, OpenAiOrganizationUsageList, OpenAiOrganizationUser, OpenAiOrganizationUserList, OpenAiOrganizationUserUpdateRequest, OpenAiProject, OpenAiProjectApiKey, OpenAiProjectApiKeyList, OpenAiProjectCreateRequest, OpenAiProjectGroupCreateRequest, OpenAiProjectList, OpenAiProjectRateLimit, OpenAiProjectRateLimitList, OpenAiProjectRateLimitUpdateRequest, OpenAiProjectServiceAccount, OpenAiProjectServiceAccountCreateRequest, OpenAiProjectServiceAccountList, OpenAiProjectUpdateRequest, OpenAiProjectUser, OpenAiProjectUserCreateRequest, OpenAiProjectUserList, OpenAiProjectUserUpdateRequest, OpenAiRole, OpenAiRoleAssignment, OpenAiRoleAssignmentCreateRequest, OpenAiRoleAssignmentList, OpenAiRoleCreateRequest, OpenAiRoleList, OpenAiRoleUpdateRequest } from '../types';


export interface OrganizationUsersRolesListParams {
  limit?: number;
  order?: 'asc' | 'desc';
  after?: string;
  before?: string;
}

export class OrganizationUsersRolesApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** List organization user roles */
  async list(userId: string, params?: OrganizationUsersRolesListParams): Promise<OpenAiRoleAssignmentList> {
    const query = buildQueryString([
      { name: 'limit', value: params?.limit, style: 'form', explode: true, allowReserved: false },
      { name: 'order', value: params?.order, style: 'form', explode: true, allowReserved: false },
      { name: 'after', value: params?.after, style: 'form', explode: true, allowReserved: false },
      { name: 'before', value: params?.before, style: 'form', explode: true, allowReserved: false },
    ]);
    return this.client.get<OpenAiRoleAssignmentList>(appendQueryString(aiApiPath(`/organization/users/${serializePathParameter(userId, { name: 'user_id', style: 'simple', explode: false })}/roles`), query));
  }

/** Create organization user role */
  async create(userId: string, body: OpenAiRoleAssignmentCreateRequest): Promise<OpenAiRoleAssignment> {
    return this.client.post<OpenAiRoleAssignment>(aiApiPath(`/organization/users/${serializePathParameter(userId, { name: 'user_id', style: 'simple', explode: false })}/roles`), body, undefined, undefined, 'application/json');
  }

/** Delete organization user role */
  async delete(userId: string, roleId: string): Promise<DeleteResult> {
    return this.client.delete<DeleteResult>(aiApiPath(`/organization/users/${serializePathParameter(userId, { name: 'user_id', style: 'simple', explode: false })}/roles/${serializePathParameter(roleId, { name: 'role_id', style: 'simple', explode: false })}`));
  }
}

export interface OrganizationUsersListParams {
  limit?: number;
  order?: 'asc' | 'desc';
  after?: string;
  before?: string;
}

export class OrganizationUsersApi {
  private client: HttpClient;
  public readonly roles: OrganizationUsersRolesApi;

  constructor(client: HttpClient) {
    this.client = client;
    this.roles = new OrganizationUsersRolesApi(client);
  }


/** List organization users */
  async list(params?: OrganizationUsersListParams): Promise<OpenAiOrganizationUserList> {
    const query = buildQueryString([
      { name: 'limit', value: params?.limit, style: 'form', explode: true, allowReserved: false },
      { name: 'order', value: params?.order, style: 'form', explode: true, allowReserved: false },
      { name: 'after', value: params?.after, style: 'form', explode: true, allowReserved: false },
      { name: 'before', value: params?.before, style: 'form', explode: true, allowReserved: false },
    ]);
    return this.client.get<OpenAiOrganizationUserList>(appendQueryString(aiApiPath(`/organization/users`), query));
  }

/** Delete organization user */
  async delete(userId: string): Promise<DeleteResult> {
    return this.client.delete<DeleteResult>(aiApiPath(`/organization/users/${serializePathParameter(userId, { name: 'user_id', style: 'simple', explode: false })}`));
  }

/** Retrieve organization user */
  async retrieve(userId: string): Promise<OpenAiOrganizationUser> {
    return this.client.get<OpenAiOrganizationUser>(aiApiPath(`/organization/users/${serializePathParameter(userId, { name: 'user_id', style: 'simple', explode: false })}`));
  }

/** Modify organization user */
  async update(userId: string, body: OpenAiOrganizationUserUpdateRequest): Promise<OpenAiOrganizationUser> {
    return this.client.post<OpenAiOrganizationUser>(aiApiPath(`/organization/users/${serializePathParameter(userId, { name: 'user_id', style: 'simple', explode: false })}`), body, undefined, undefined, 'application/json');
  }
}

export interface OrganizationUsageVectorStoresListParams {
  startTime?: string;
  endTime?: string;
  bucketWidth?: string;
  projectIds?: string[];
  userIds?: string[];
  apiKeyIds?: string[];
  models?: string[];
  groupBy?: string[];
  limit?: number;
  page?: string;
}

export class OrganizationUsageVectorStoresApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Get vector store usage */
  async list(params?: OrganizationUsageVectorStoresListParams): Promise<OpenAiOrganizationUsageList> {
    const query = buildQueryString([
      { name: 'start_time', value: params?.startTime, style: 'form', explode: true, allowReserved: false },
      { name: 'end_time', value: params?.endTime, style: 'form', explode: true, allowReserved: false },
      { name: 'bucket_width', value: params?.bucketWidth, style: 'form', explode: true, allowReserved: false },
      { name: 'project_ids', value: params?.projectIds, style: 'form', explode: true, allowReserved: false },
      { name: 'user_ids', value: params?.userIds, style: 'form', explode: true, allowReserved: false },
      { name: 'api_key_ids', value: params?.apiKeyIds, style: 'form', explode: true, allowReserved: false },
      { name: 'models', value: params?.models, style: 'form', explode: true, allowReserved: false },
      { name: 'group_by', value: params?.groupBy, style: 'form', explode: true, allowReserved: false },
      { name: 'limit', value: params?.limit, style: 'form', explode: true, allowReserved: false },
      { name: 'page', value: params?.page, style: 'form', explode: true, allowReserved: false },
    ]);
    return this.client.get<OpenAiOrganizationUsageList>(appendQueryString(aiApiPath(`/organization/usage/vector_stores`), query));
  }
}

export interface OrganizationUsageModerationsListParams {
  startTime?: string;
  endTime?: string;
  bucketWidth?: string;
  projectIds?: string[];
  userIds?: string[];
  apiKeyIds?: string[];
  models?: string[];
  groupBy?: string[];
  limit?: number;
  page?: string;
}

export class OrganizationUsageModerationsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Get moderation usage */
  async list(params?: OrganizationUsageModerationsListParams): Promise<OpenAiOrganizationUsageList> {
    const query = buildQueryString([
      { name: 'start_time', value: params?.startTime, style: 'form', explode: true, allowReserved: false },
      { name: 'end_time', value: params?.endTime, style: 'form', explode: true, allowReserved: false },
      { name: 'bucket_width', value: params?.bucketWidth, style: 'form', explode: true, allowReserved: false },
      { name: 'project_ids', value: params?.projectIds, style: 'form', explode: true, allowReserved: false },
      { name: 'user_ids', value: params?.userIds, style: 'form', explode: true, allowReserved: false },
      { name: 'api_key_ids', value: params?.apiKeyIds, style: 'form', explode: true, allowReserved: false },
      { name: 'models', value: params?.models, style: 'form', explode: true, allowReserved: false },
      { name: 'group_by', value: params?.groupBy, style: 'form', explode: true, allowReserved: false },
      { name: 'limit', value: params?.limit, style: 'form', explode: true, allowReserved: false },
      { name: 'page', value: params?.page, style: 'form', explode: true, allowReserved: false },
    ]);
    return this.client.get<OpenAiOrganizationUsageList>(appendQueryString(aiApiPath(`/organization/usage/moderations`), query));
  }
}

export interface OrganizationUsageImagesListParams {
  startTime?: string;
  endTime?: string;
  bucketWidth?: string;
  projectIds?: string[];
  userIds?: string[];
  apiKeyIds?: string[];
  models?: string[];
  groupBy?: string[];
  limit?: number;
  page?: string;
}

export class OrganizationUsageImagesApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Get image usage */
  async list(params?: OrganizationUsageImagesListParams): Promise<OpenAiOrganizationUsageList> {
    const query = buildQueryString([
      { name: 'start_time', value: params?.startTime, style: 'form', explode: true, allowReserved: false },
      { name: 'end_time', value: params?.endTime, style: 'form', explode: true, allowReserved: false },
      { name: 'bucket_width', value: params?.bucketWidth, style: 'form', explode: true, allowReserved: false },
      { name: 'project_ids', value: params?.projectIds, style: 'form', explode: true, allowReserved: false },
      { name: 'user_ids', value: params?.userIds, style: 'form', explode: true, allowReserved: false },
      { name: 'api_key_ids', value: params?.apiKeyIds, style: 'form', explode: true, allowReserved: false },
      { name: 'models', value: params?.models, style: 'form', explode: true, allowReserved: false },
      { name: 'group_by', value: params?.groupBy, style: 'form', explode: true, allowReserved: false },
      { name: 'limit', value: params?.limit, style: 'form', explode: true, allowReserved: false },
      { name: 'page', value: params?.page, style: 'form', explode: true, allowReserved: false },
    ]);
    return this.client.get<OpenAiOrganizationUsageList>(appendQueryString(aiApiPath(`/organization/usage/images`), query));
  }
}

export interface OrganizationUsageEmbeddingsListParams {
  startTime?: string;
  endTime?: string;
  bucketWidth?: string;
  projectIds?: string[];
  userIds?: string[];
  apiKeyIds?: string[];
  models?: string[];
  groupBy?: string[];
  limit?: number;
  page?: string;
}

export class OrganizationUsageEmbeddingsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Get embeddings usage */
  async list(params?: OrganizationUsageEmbeddingsListParams): Promise<OpenAiOrganizationUsageList> {
    const query = buildQueryString([
      { name: 'start_time', value: params?.startTime, style: 'form', explode: true, allowReserved: false },
      { name: 'end_time', value: params?.endTime, style: 'form', explode: true, allowReserved: false },
      { name: 'bucket_width', value: params?.bucketWidth, style: 'form', explode: true, allowReserved: false },
      { name: 'project_ids', value: params?.projectIds, style: 'form', explode: true, allowReserved: false },
      { name: 'user_ids', value: params?.userIds, style: 'form', explode: true, allowReserved: false },
      { name: 'api_key_ids', value: params?.apiKeyIds, style: 'form', explode: true, allowReserved: false },
      { name: 'models', value: params?.models, style: 'form', explode: true, allowReserved: false },
      { name: 'group_by', value: params?.groupBy, style: 'form', explode: true, allowReserved: false },
      { name: 'limit', value: params?.limit, style: 'form', explode: true, allowReserved: false },
      { name: 'page', value: params?.page, style: 'form', explode: true, allowReserved: false },
    ]);
    return this.client.get<OpenAiOrganizationUsageList>(appendQueryString(aiApiPath(`/organization/usage/embeddings`), query));
  }
}

export interface OrganizationUsageCompletionsListParams {
  startTime?: string;
  endTime?: string;
  bucketWidth?: string;
  projectIds?: string[];
  userIds?: string[];
  apiKeyIds?: string[];
  models?: string[];
  groupBy?: string[];
  limit?: number;
  page?: string;
}

export class OrganizationUsageCompletionsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Get completions usage */
  async list(params?: OrganizationUsageCompletionsListParams): Promise<OpenAiOrganizationUsageList> {
    const query = buildQueryString([
      { name: 'start_time', value: params?.startTime, style: 'form', explode: true, allowReserved: false },
      { name: 'end_time', value: params?.endTime, style: 'form', explode: true, allowReserved: false },
      { name: 'bucket_width', value: params?.bucketWidth, style: 'form', explode: true, allowReserved: false },
      { name: 'project_ids', value: params?.projectIds, style: 'form', explode: true, allowReserved: false },
      { name: 'user_ids', value: params?.userIds, style: 'form', explode: true, allowReserved: false },
      { name: 'api_key_ids', value: params?.apiKeyIds, style: 'form', explode: true, allowReserved: false },
      { name: 'models', value: params?.models, style: 'form', explode: true, allowReserved: false },
      { name: 'group_by', value: params?.groupBy, style: 'form', explode: true, allowReserved: false },
      { name: 'limit', value: params?.limit, style: 'form', explode: true, allowReserved: false },
      { name: 'page', value: params?.page, style: 'form', explode: true, allowReserved: false },
    ]);
    return this.client.get<OpenAiOrganizationUsageList>(appendQueryString(aiApiPath(`/organization/usage/completions`), query));
  }
}

export interface OrganizationUsageCodeInterpreterSessionsListParams {
  startTime?: string;
  endTime?: string;
  bucketWidth?: string;
  projectIds?: string[];
  userIds?: string[];
  apiKeyIds?: string[];
  models?: string[];
  groupBy?: string[];
  limit?: number;
  page?: string;
}

export class OrganizationUsageCodeInterpreterSessionsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Get code interpreter session usage */
  async list(params?: OrganizationUsageCodeInterpreterSessionsListParams): Promise<OpenAiOrganizationUsageList> {
    const query = buildQueryString([
      { name: 'start_time', value: params?.startTime, style: 'form', explode: true, allowReserved: false },
      { name: 'end_time', value: params?.endTime, style: 'form', explode: true, allowReserved: false },
      { name: 'bucket_width', value: params?.bucketWidth, style: 'form', explode: true, allowReserved: false },
      { name: 'project_ids', value: params?.projectIds, style: 'form', explode: true, allowReserved: false },
      { name: 'user_ids', value: params?.userIds, style: 'form', explode: true, allowReserved: false },
      { name: 'api_key_ids', value: params?.apiKeyIds, style: 'form', explode: true, allowReserved: false },
      { name: 'models', value: params?.models, style: 'form', explode: true, allowReserved: false },
      { name: 'group_by', value: params?.groupBy, style: 'form', explode: true, allowReserved: false },
      { name: 'limit', value: params?.limit, style: 'form', explode: true, allowReserved: false },
      { name: 'page', value: params?.page, style: 'form', explode: true, allowReserved: false },
    ]);
    return this.client.get<OpenAiOrganizationUsageList>(appendQueryString(aiApiPath(`/organization/usage/code_interpreter_sessions`), query));
  }
}

export interface OrganizationUsageAudioTranscriptionsListParams {
  startTime?: string;
  endTime?: string;
  bucketWidth?: string;
  projectIds?: string[];
  userIds?: string[];
  apiKeyIds?: string[];
  models?: string[];
  groupBy?: string[];
  limit?: number;
  page?: string;
}

export class OrganizationUsageAudioTranscriptionsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Get audio transcription usage */
  async list(params?: OrganizationUsageAudioTranscriptionsListParams): Promise<OpenAiOrganizationUsageList> {
    const query = buildQueryString([
      { name: 'start_time', value: params?.startTime, style: 'form', explode: true, allowReserved: false },
      { name: 'end_time', value: params?.endTime, style: 'form', explode: true, allowReserved: false },
      { name: 'bucket_width', value: params?.bucketWidth, style: 'form', explode: true, allowReserved: false },
      { name: 'project_ids', value: params?.projectIds, style: 'form', explode: true, allowReserved: false },
      { name: 'user_ids', value: params?.userIds, style: 'form', explode: true, allowReserved: false },
      { name: 'api_key_ids', value: params?.apiKeyIds, style: 'form', explode: true, allowReserved: false },
      { name: 'models', value: params?.models, style: 'form', explode: true, allowReserved: false },
      { name: 'group_by', value: params?.groupBy, style: 'form', explode: true, allowReserved: false },
      { name: 'limit', value: params?.limit, style: 'form', explode: true, allowReserved: false },
      { name: 'page', value: params?.page, style: 'form', explode: true, allowReserved: false },
    ]);
    return this.client.get<OpenAiOrganizationUsageList>(appendQueryString(aiApiPath(`/organization/usage/audio_transcriptions`), query));
  }
}

export interface OrganizationUsageAudioSpeechesListParams {
  startTime?: string;
  endTime?: string;
  bucketWidth?: string;
  projectIds?: string[];
  userIds?: string[];
  apiKeyIds?: string[];
  models?: string[];
  groupBy?: string[];
  limit?: number;
  page?: string;
}

export class OrganizationUsageAudioSpeechesApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Get audio speech usage */
  async list(params?: OrganizationUsageAudioSpeechesListParams): Promise<OpenAiOrganizationUsageList> {
    const query = buildQueryString([
      { name: 'start_time', value: params?.startTime, style: 'form', explode: true, allowReserved: false },
      { name: 'end_time', value: params?.endTime, style: 'form', explode: true, allowReserved: false },
      { name: 'bucket_width', value: params?.bucketWidth, style: 'form', explode: true, allowReserved: false },
      { name: 'project_ids', value: params?.projectIds, style: 'form', explode: true, allowReserved: false },
      { name: 'user_ids', value: params?.userIds, style: 'form', explode: true, allowReserved: false },
      { name: 'api_key_ids', value: params?.apiKeyIds, style: 'form', explode: true, allowReserved: false },
      { name: 'models', value: params?.models, style: 'form', explode: true, allowReserved: false },
      { name: 'group_by', value: params?.groupBy, style: 'form', explode: true, allowReserved: false },
      { name: 'limit', value: params?.limit, style: 'form', explode: true, allowReserved: false },
      { name: 'page', value: params?.page, style: 'form', explode: true, allowReserved: false },
    ]);
    return this.client.get<OpenAiOrganizationUsageList>(appendQueryString(aiApiPath(`/organization/usage/audio_speeches`), query));
  }
}

export class OrganizationUsageApi {
  private client: HttpClient;
  public readonly audioSpeeches: OrganizationUsageAudioSpeechesApi;
  public readonly audioTranscriptions: OrganizationUsageAudioTranscriptionsApi;
  public readonly codeInterpreterSessions: OrganizationUsageCodeInterpreterSessionsApi;
  public readonly completions: OrganizationUsageCompletionsApi;
  public readonly embeddings: OrganizationUsageEmbeddingsApi;
  public readonly images: OrganizationUsageImagesApi;
  public readonly moderations: OrganizationUsageModerationsApi;
  public readonly vectorStores: OrganizationUsageVectorStoresApi;

  constructor(client: HttpClient) {
    this.client = client;
    this.audioSpeeches = new OrganizationUsageAudioSpeechesApi(client);
    this.audioTranscriptions = new OrganizationUsageAudioTranscriptionsApi(client);
    this.codeInterpreterSessions = new OrganizationUsageCodeInterpreterSessionsApi(client);
    this.completions = new OrganizationUsageCompletionsApi(client);
    this.embeddings = new OrganizationUsageEmbeddingsApi(client);
    this.images = new OrganizationUsageImagesApi(client);
    this.moderations = new OrganizationUsageModerationsApi(client);
    this.vectorStores = new OrganizationUsageVectorStoresApi(client);
  }

}

export interface OrganizationRolesListParams {
  limit?: number;
  order?: 'asc' | 'desc';
  after?: string;
  before?: string;
}

export class OrganizationRolesApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** List organization roles */
  async list(params?: OrganizationRolesListParams): Promise<OpenAiRoleList> {
    const query = buildQueryString([
      { name: 'limit', value: params?.limit, style: 'form', explode: true, allowReserved: false },
      { name: 'order', value: params?.order, style: 'form', explode: true, allowReserved: false },
      { name: 'after', value: params?.after, style: 'form', explode: true, allowReserved: false },
      { name: 'before', value: params?.before, style: 'form', explode: true, allowReserved: false },
    ]);
    return this.client.get<OpenAiRoleList>(appendQueryString(aiApiPath(`/organization/roles`), query));
  }

/** Create organization role */
  async create(body: OpenAiRoleCreateRequest): Promise<OpenAiRole> {
    return this.client.post<OpenAiRole>(aiApiPath(`/organization/roles`), body, undefined, undefined, 'application/json');
  }

/** Delete organization role */
  async delete(roleId: string): Promise<DeleteResult> {
    return this.client.delete<DeleteResult>(aiApiPath(`/organization/roles/${serializePathParameter(roleId, { name: 'role_id', style: 'simple', explode: false })}`));
  }

/** Retrieve organization role */
  async retrieve(roleId: string): Promise<OpenAiRole> {
    return this.client.get<OpenAiRole>(aiApiPath(`/organization/roles/${serializePathParameter(roleId, { name: 'role_id', style: 'simple', explode: false })}`));
  }

/** Modify organization role */
  async update(roleId: string, body: OpenAiRoleUpdateRequest): Promise<OpenAiRole> {
    return this.client.post<OpenAiRole>(aiApiPath(`/organization/roles/${serializePathParameter(roleId, { name: 'role_id', style: 'simple', explode: false })}`), body, undefined, undefined, 'application/json');
  }
}

export interface OrganizationProjectsUsersListParams {
  limit?: number;
  order?: 'asc' | 'desc';
  after?: string;
  before?: string;
}

export class OrganizationProjectsUsersApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** List project users */
  async list(projectId: string, params?: OrganizationProjectsUsersListParams): Promise<OpenAiProjectUserList> {
    const query = buildQueryString([
      { name: 'limit', value: params?.limit, style: 'form', explode: true, allowReserved: false },
      { name: 'order', value: params?.order, style: 'form', explode: true, allowReserved: false },
      { name: 'after', value: params?.after, style: 'form', explode: true, allowReserved: false },
      { name: 'before', value: params?.before, style: 'form', explode: true, allowReserved: false },
    ]);
    return this.client.get<OpenAiProjectUserList>(appendQueryString(aiApiPath(`/organization/projects/${serializePathParameter(projectId, { name: 'project_id', style: 'simple', explode: false })}/users`), query));
  }

/** Create project user */
  async create(projectId: string, body: OpenAiProjectUserCreateRequest): Promise<OpenAiProjectUser> {
    return this.client.post<OpenAiProjectUser>(aiApiPath(`/organization/projects/${serializePathParameter(projectId, { name: 'project_id', style: 'simple', explode: false })}/users`), body, undefined, undefined, 'application/json');
  }

/** Delete project user */
  async delete(projectId: string, userId: string): Promise<DeleteResult> {
    return this.client.delete<DeleteResult>(aiApiPath(`/organization/projects/${serializePathParameter(projectId, { name: 'project_id', style: 'simple', explode: false })}/users/${serializePathParameter(userId, { name: 'user_id', style: 'simple', explode: false })}`));
  }

/** Retrieve project user */
  async retrieve(projectId: string, userId: string): Promise<OpenAiProjectUser> {
    return this.client.get<OpenAiProjectUser>(aiApiPath(`/organization/projects/${serializePathParameter(projectId, { name: 'project_id', style: 'simple', explode: false })}/users/${serializePathParameter(userId, { name: 'user_id', style: 'simple', explode: false })}`));
  }

/** Modify project user */
  async update(projectId: string, userId: string, body: OpenAiProjectUserUpdateRequest): Promise<OpenAiProjectUser> {
    return this.client.post<OpenAiProjectUser>(aiApiPath(`/organization/projects/${serializePathParameter(projectId, { name: 'project_id', style: 'simple', explode: false })}/users/${serializePathParameter(userId, { name: 'user_id', style: 'simple', explode: false })}`), body, undefined, undefined, 'application/json');
  }
}

export interface OrganizationProjectsServiceAccountsListParams {
  limit?: number;
  order?: 'asc' | 'desc';
  after?: string;
  before?: string;
}

export class OrganizationProjectsServiceAccountsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** List project service accounts */
  async list(projectId: string, params?: OrganizationProjectsServiceAccountsListParams): Promise<OpenAiProjectServiceAccountList> {
    const query = buildQueryString([
      { name: 'limit', value: params?.limit, style: 'form', explode: true, allowReserved: false },
      { name: 'order', value: params?.order, style: 'form', explode: true, allowReserved: false },
      { name: 'after', value: params?.after, style: 'form', explode: true, allowReserved: false },
      { name: 'before', value: params?.before, style: 'form', explode: true, allowReserved: false },
    ]);
    return this.client.get<OpenAiProjectServiceAccountList>(appendQueryString(aiApiPath(`/organization/projects/${serializePathParameter(projectId, { name: 'project_id', style: 'simple', explode: false })}/service_accounts`), query));
  }

/** Create project service account */
  async create(projectId: string, body: OpenAiProjectServiceAccountCreateRequest): Promise<OpenAiProjectServiceAccount> {
    return this.client.post<OpenAiProjectServiceAccount>(aiApiPath(`/organization/projects/${serializePathParameter(projectId, { name: 'project_id', style: 'simple', explode: false })}/service_accounts`), body, undefined, undefined, 'application/json');
  }

/** Delete project service account */
  async delete(projectId: string, serviceAccountId: string): Promise<DeleteResult> {
    return this.client.delete<DeleteResult>(aiApiPath(`/organization/projects/${serializePathParameter(projectId, { name: 'project_id', style: 'simple', explode: false })}/service_accounts/${serializePathParameter(serviceAccountId, { name: 'service_account_id', style: 'simple', explode: false })}`));
  }

/** Retrieve project service account */
  async retrieve(projectId: string, serviceAccountId: string): Promise<OpenAiProjectServiceAccount> {
    return this.client.get<OpenAiProjectServiceAccount>(aiApiPath(`/organization/projects/${serializePathParameter(projectId, { name: 'project_id', style: 'simple', explode: false })}/service_accounts/${serializePathParameter(serviceAccountId, { name: 'service_account_id', style: 'simple', explode: false })}`));
  }
}

export interface OrganizationProjectsRateLimitsListParams {
  limit?: number;
  order?: 'asc' | 'desc';
  after?: string;
  before?: string;
}

export class OrganizationProjectsRateLimitsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** List project rate limits */
  async list(projectId: string, params?: OrganizationProjectsRateLimitsListParams): Promise<OpenAiProjectRateLimitList> {
    const query = buildQueryString([
      { name: 'limit', value: params?.limit, style: 'form', explode: true, allowReserved: false },
      { name: 'order', value: params?.order, style: 'form', explode: true, allowReserved: false },
      { name: 'after', value: params?.after, style: 'form', explode: true, allowReserved: false },
      { name: 'before', value: params?.before, style: 'form', explode: true, allowReserved: false },
    ]);
    return this.client.get<OpenAiProjectRateLimitList>(appendQueryString(aiApiPath(`/organization/projects/${serializePathParameter(projectId, { name: 'project_id', style: 'simple', explode: false })}/rate_limits`), query));
  }

/** Modify project rate limit */
  async update(projectId: string, rateLimitId: string, body: OpenAiProjectRateLimitUpdateRequest): Promise<OpenAiProjectRateLimit> {
    return this.client.post<OpenAiProjectRateLimit>(aiApiPath(`/organization/projects/${serializePathParameter(projectId, { name: 'project_id', style: 'simple', explode: false })}/rate_limits/${serializePathParameter(rateLimitId, { name: 'rate_limit_id', style: 'simple', explode: false })}`), body, undefined, undefined, 'application/json');
  }
}

export interface OrganizationProjectsGroupsListParams {
  limit?: number;
  order?: 'asc' | 'desc';
  after?: string;
  before?: string;
}

export class OrganizationProjectsGroupsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** List project groups */
  async list(projectId: string, params?: OrganizationProjectsGroupsListParams): Promise<OpenAiOrganizationGroupList> {
    const query = buildQueryString([
      { name: 'limit', value: params?.limit, style: 'form', explode: true, allowReserved: false },
      { name: 'order', value: params?.order, style: 'form', explode: true, allowReserved: false },
      { name: 'after', value: params?.after, style: 'form', explode: true, allowReserved: false },
      { name: 'before', value: params?.before, style: 'form', explode: true, allowReserved: false },
    ]);
    return this.client.get<OpenAiOrganizationGroupList>(appendQueryString(aiApiPath(`/organization/projects/${serializePathParameter(projectId, { name: 'project_id', style: 'simple', explode: false })}/groups`), query));
  }

/** Create project group */
  async create(projectId: string, body: OpenAiProjectGroupCreateRequest): Promise<OpenAiOrganizationGroup> {
    return this.client.post<OpenAiOrganizationGroup>(aiApiPath(`/organization/projects/${serializePathParameter(projectId, { name: 'project_id', style: 'simple', explode: false })}/groups`), body, undefined, undefined, 'application/json');
  }

/** Delete project group */
  async delete(projectId: string, groupId: string): Promise<DeleteResult> {
    return this.client.delete<DeleteResult>(aiApiPath(`/organization/projects/${serializePathParameter(projectId, { name: 'project_id', style: 'simple', explode: false })}/groups/${serializePathParameter(groupId, { name: 'group_id', style: 'simple', explode: false })}`));
  }
}

export class OrganizationProjectsCertificatesDeactivateApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Deactivate project certificates */
  async create(projectId: string, body: OpenAiCertificateActivationRequest): Promise<OpenAiCertificateList> {
    return this.client.post<OpenAiCertificateList>(aiApiPath(`/organization/projects/${serializePathParameter(projectId, { name: 'project_id', style: 'simple', explode: false })}/certificates/deactivate`), body, undefined, undefined, 'application/json');
  }
}

export class OrganizationProjectsCertificatesActivateApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Activate project certificates */
  async create(projectId: string, body: OpenAiCertificateActivationRequest): Promise<OpenAiCertificateList> {
    return this.client.post<OpenAiCertificateList>(aiApiPath(`/organization/projects/${serializePathParameter(projectId, { name: 'project_id', style: 'simple', explode: false })}/certificates/activate`), body, undefined, undefined, 'application/json');
  }
}

export interface OrganizationProjectsCertificatesListParams {
  limit?: number;
  order?: 'asc' | 'desc';
  after?: string;
  before?: string;
}

export class OrganizationProjectsCertificatesApi {
  private client: HttpClient;
  public readonly activate: OrganizationProjectsCertificatesActivateApi;
  public readonly deactivate: OrganizationProjectsCertificatesDeactivateApi;

  constructor(client: HttpClient) {
    this.client = client;
    this.activate = new OrganizationProjectsCertificatesActivateApi(client);
    this.deactivate = new OrganizationProjectsCertificatesDeactivateApi(client);
  }


/** List project certificates */
  async list(projectId: string, params?: OrganizationProjectsCertificatesListParams): Promise<OpenAiCertificateList> {
    const query = buildQueryString([
      { name: 'limit', value: params?.limit, style: 'form', explode: true, allowReserved: false },
      { name: 'order', value: params?.order, style: 'form', explode: true, allowReserved: false },
      { name: 'after', value: params?.after, style: 'form', explode: true, allowReserved: false },
      { name: 'before', value: params?.before, style: 'form', explode: true, allowReserved: false },
    ]);
    return this.client.get<OpenAiCertificateList>(appendQueryString(aiApiPath(`/organization/projects/${serializePathParameter(projectId, { name: 'project_id', style: 'simple', explode: false })}/certificates`), query));
  }
}

export class OrganizationProjectsArchiveApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Archive organization project */
  async create(projectId: string): Promise<OpenAiProject> {
    return this.client.post<OpenAiProject>(aiApiPath(`/organization/projects/${serializePathParameter(projectId, { name: 'project_id', style: 'simple', explode: false })}/archive`));
  }
}

export interface OrganizationProjectsApiKeysListParams {
  limit?: number;
  order?: 'asc' | 'desc';
  after?: string;
  before?: string;
}

export class OrganizationProjectsApiKeysApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** List project API keys */
  async list(projectId: string, params?: OrganizationProjectsApiKeysListParams): Promise<OpenAiProjectApiKeyList> {
    const query = buildQueryString([
      { name: 'limit', value: params?.limit, style: 'form', explode: true, allowReserved: false },
      { name: 'order', value: params?.order, style: 'form', explode: true, allowReserved: false },
      { name: 'after', value: params?.after, style: 'form', explode: true, allowReserved: false },
      { name: 'before', value: params?.before, style: 'form', explode: true, allowReserved: false },
    ]);
    return this.client.get<OpenAiProjectApiKeyList>(appendQueryString(aiApiPath(`/organization/projects/${serializePathParameter(projectId, { name: 'project_id', style: 'simple', explode: false })}/api_keys`), query));
  }

/** Delete project API key */
  async delete(projectId: string, keyId: string): Promise<DeleteResult> {
    return this.client.delete<DeleteResult>(aiApiPath(`/organization/projects/${serializePathParameter(projectId, { name: 'project_id', style: 'simple', explode: false })}/api_keys/${serializePathParameter(keyId, { name: 'key_id', style: 'simple', explode: false })}`));
  }

/** Retrieve project API key */
  async retrieve(projectId: string, keyId: string): Promise<OpenAiProjectApiKey> {
    return this.client.get<OpenAiProjectApiKey>(aiApiPath(`/organization/projects/${serializePathParameter(projectId, { name: 'project_id', style: 'simple', explode: false })}/api_keys/${serializePathParameter(keyId, { name: 'key_id', style: 'simple', explode: false })}`));
  }
}

export interface OrganizationProjectsListParams {
  limit?: number;
  order?: 'asc' | 'desc';
  after?: string;
  before?: string;
}

export class OrganizationProjectsApi {
  private client: HttpClient;
  public readonly apiKeys: OrganizationProjectsApiKeysApi;
  public readonly archive: OrganizationProjectsArchiveApi;
  public readonly certificates: OrganizationProjectsCertificatesApi;
  public readonly groups: OrganizationProjectsGroupsApi;
  public readonly rateLimits: OrganizationProjectsRateLimitsApi;
  public readonly serviceAccounts: OrganizationProjectsServiceAccountsApi;
  public readonly users: OrganizationProjectsUsersApi;

  constructor(client: HttpClient) {
    this.client = client;
    this.apiKeys = new OrganizationProjectsApiKeysApi(client);
    this.archive = new OrganizationProjectsArchiveApi(client);
    this.certificates = new OrganizationProjectsCertificatesApi(client);
    this.groups = new OrganizationProjectsGroupsApi(client);
    this.rateLimits = new OrganizationProjectsRateLimitsApi(client);
    this.serviceAccounts = new OrganizationProjectsServiceAccountsApi(client);
    this.users = new OrganizationProjectsUsersApi(client);
  }


/** List organization projects */
  async list(params?: OrganizationProjectsListParams): Promise<OpenAiProjectList> {
    const query = buildQueryString([
      { name: 'limit', value: params?.limit, style: 'form', explode: true, allowReserved: false },
      { name: 'order', value: params?.order, style: 'form', explode: true, allowReserved: false },
      { name: 'after', value: params?.after, style: 'form', explode: true, allowReserved: false },
      { name: 'before', value: params?.before, style: 'form', explode: true, allowReserved: false },
    ]);
    return this.client.get<OpenAiProjectList>(appendQueryString(aiApiPath(`/organization/projects`), query));
  }

/** Create organization project */
  async create(body: OpenAiProjectCreateRequest): Promise<OpenAiProject> {
    return this.client.post<OpenAiProject>(aiApiPath(`/organization/projects`), body, undefined, undefined, 'application/json');
  }

/** Retrieve organization project */
  async retrieve(projectId: string): Promise<OpenAiProject> {
    return this.client.get<OpenAiProject>(aiApiPath(`/organization/projects/${serializePathParameter(projectId, { name: 'project_id', style: 'simple', explode: false })}`));
  }

/** Modify organization project */
  async update(projectId: string, body: OpenAiProjectUpdateRequest): Promise<OpenAiProject> {
    return this.client.post<OpenAiProject>(aiApiPath(`/organization/projects/${serializePathParameter(projectId, { name: 'project_id', style: 'simple', explode: false })}`), body, undefined, undefined, 'application/json');
  }
}

export interface OrganizationInvitesListParams {
  limit?: number;
  order?: 'asc' | 'desc';
  after?: string;
  before?: string;
}

export class OrganizationInvitesApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** List organization invites */
  async list(params?: OrganizationInvitesListParams): Promise<OpenAiOrganizationInviteList> {
    const query = buildQueryString([
      { name: 'limit', value: params?.limit, style: 'form', explode: true, allowReserved: false },
      { name: 'order', value: params?.order, style: 'form', explode: true, allowReserved: false },
      { name: 'after', value: params?.after, style: 'form', explode: true, allowReserved: false },
      { name: 'before', value: params?.before, style: 'form', explode: true, allowReserved: false },
    ]);
    return this.client.get<OpenAiOrganizationInviteList>(appendQueryString(aiApiPath(`/organization/invites`), query));
  }

/** Create organization invite */
  async create(body: OpenAiOrganizationInviteCreateRequest): Promise<OpenAiOrganizationInvite> {
    return this.client.post<OpenAiOrganizationInvite>(aiApiPath(`/organization/invites`), body, undefined, undefined, 'application/json');
  }

/** Delete organization invite */
  async delete(inviteId: string): Promise<DeleteResult> {
    return this.client.delete<DeleteResult>(aiApiPath(`/organization/invites/${serializePathParameter(inviteId, { name: 'invite_id', style: 'simple', explode: false })}`));
  }

/** Retrieve organization invite */
  async retrieve(inviteId: string): Promise<OpenAiOrganizationInvite> {
    return this.client.get<OpenAiOrganizationInvite>(aiApiPath(`/organization/invites/${serializePathParameter(inviteId, { name: 'invite_id', style: 'simple', explode: false })}`));
  }
}

export interface OrganizationGroupsUsersListParams {
  limit?: number;
  order?: 'asc' | 'desc';
  after?: string;
  before?: string;
}

export class OrganizationGroupsUsersApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** List organization group users */
  async list(groupId: string, params?: OrganizationGroupsUsersListParams): Promise<OpenAiOrganizationUserList> {
    const query = buildQueryString([
      { name: 'limit', value: params?.limit, style: 'form', explode: true, allowReserved: false },
      { name: 'order', value: params?.order, style: 'form', explode: true, allowReserved: false },
      { name: 'after', value: params?.after, style: 'form', explode: true, allowReserved: false },
      { name: 'before', value: params?.before, style: 'form', explode: true, allowReserved: false },
    ]);
    return this.client.get<OpenAiOrganizationUserList>(appendQueryString(aiApiPath(`/organization/groups/${serializePathParameter(groupId, { name: 'group_id', style: 'simple', explode: false })}/users`), query));
  }

/** Add organization group user */
  async create(groupId: string, body: OpenAiOrganizationGroupUserCreateRequest): Promise<OpenAiOrganizationUser> {
    return this.client.post<OpenAiOrganizationUser>(aiApiPath(`/organization/groups/${serializePathParameter(groupId, { name: 'group_id', style: 'simple', explode: false })}/users`), body, undefined, undefined, 'application/json');
  }

/** Delete organization group user */
  async delete(groupId: string, userId: string): Promise<DeleteResult> {
    return this.client.delete<DeleteResult>(aiApiPath(`/organization/groups/${serializePathParameter(groupId, { name: 'group_id', style: 'simple', explode: false })}/users/${serializePathParameter(userId, { name: 'user_id', style: 'simple', explode: false })}`));
  }
}

export interface OrganizationGroupsRolesListParams {
  limit?: number;
  order?: 'asc' | 'desc';
  after?: string;
  before?: string;
}

export class OrganizationGroupsRolesApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** List organization group roles */
  async list(groupId: string, params?: OrganizationGroupsRolesListParams): Promise<OpenAiRoleAssignmentList> {
    const query = buildQueryString([
      { name: 'limit', value: params?.limit, style: 'form', explode: true, allowReserved: false },
      { name: 'order', value: params?.order, style: 'form', explode: true, allowReserved: false },
      { name: 'after', value: params?.after, style: 'form', explode: true, allowReserved: false },
      { name: 'before', value: params?.before, style: 'form', explode: true, allowReserved: false },
    ]);
    return this.client.get<OpenAiRoleAssignmentList>(appendQueryString(aiApiPath(`/organization/groups/${serializePathParameter(groupId, { name: 'group_id', style: 'simple', explode: false })}/roles`), query));
  }

/** Create organization group role */
  async create(groupId: string, body: OpenAiRoleAssignmentCreateRequest): Promise<OpenAiRoleAssignment> {
    return this.client.post<OpenAiRoleAssignment>(aiApiPath(`/organization/groups/${serializePathParameter(groupId, { name: 'group_id', style: 'simple', explode: false })}/roles`), body, undefined, undefined, 'application/json');
  }

/** Delete organization group role */
  async delete(groupId: string, roleId: string): Promise<DeleteResult> {
    return this.client.delete<DeleteResult>(aiApiPath(`/organization/groups/${serializePathParameter(groupId, { name: 'group_id', style: 'simple', explode: false })}/roles/${serializePathParameter(roleId, { name: 'role_id', style: 'simple', explode: false })}`));
  }
}

export interface OrganizationGroupsListParams {
  limit?: number;
  order?: 'asc' | 'desc';
  after?: string;
  before?: string;
}

export class OrganizationGroupsApi {
  private client: HttpClient;
  public readonly roles: OrganizationGroupsRolesApi;
  public readonly users: OrganizationGroupsUsersApi;

  constructor(client: HttpClient) {
    this.client = client;
    this.roles = new OrganizationGroupsRolesApi(client);
    this.users = new OrganizationGroupsUsersApi(client);
  }


/** List organization groups */
  async list(params?: OrganizationGroupsListParams): Promise<OpenAiOrganizationGroupList> {
    const query = buildQueryString([
      { name: 'limit', value: params?.limit, style: 'form', explode: true, allowReserved: false },
      { name: 'order', value: params?.order, style: 'form', explode: true, allowReserved: false },
      { name: 'after', value: params?.after, style: 'form', explode: true, allowReserved: false },
      { name: 'before', value: params?.before, style: 'form', explode: true, allowReserved: false },
    ]);
    return this.client.get<OpenAiOrganizationGroupList>(appendQueryString(aiApiPath(`/organization/groups`), query));
  }

/** Create organization group */
  async create(body: OpenAiOrganizationGroupCreateRequest): Promise<OpenAiOrganizationGroup> {
    return this.client.post<OpenAiOrganizationGroup>(aiApiPath(`/organization/groups`), body, undefined, undefined, 'application/json');
  }

/** Delete organization group */
  async delete(groupId: string): Promise<DeleteResult> {
    return this.client.delete<DeleteResult>(aiApiPath(`/organization/groups/${serializePathParameter(groupId, { name: 'group_id', style: 'simple', explode: false })}`));
  }

/** Retrieve organization group */
  async retrieve(groupId: string): Promise<OpenAiOrganizationGroup> {
    return this.client.get<OpenAiOrganizationGroup>(aiApiPath(`/organization/groups/${serializePathParameter(groupId, { name: 'group_id', style: 'simple', explode: false })}`));
  }

/** Modify organization group */
  async update(groupId: string, body: OpenAiOrganizationGroupUpdateRequest): Promise<OpenAiOrganizationGroup> {
    return this.client.post<OpenAiOrganizationGroup>(aiApiPath(`/organization/groups/${serializePathParameter(groupId, { name: 'group_id', style: 'simple', explode: false })}`), body, undefined, undefined, 'application/json');
  }
}

export interface OrganizationCostsListParams {
  startTime?: string;
  endTime?: string;
  bucketWidth?: string;
  projectIds?: string[];
  userIds?: string[];
  apiKeyIds?: string[];
  models?: string[];
  groupBy?: string[];
  limit?: number;
  page?: string;
}

export class OrganizationCostsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Get organization costs */
  async list(params?: OrganizationCostsListParams): Promise<OpenAiOrganizationCostList> {
    const query = buildQueryString([
      { name: 'start_time', value: params?.startTime, style: 'form', explode: true, allowReserved: false },
      { name: 'end_time', value: params?.endTime, style: 'form', explode: true, allowReserved: false },
      { name: 'bucket_width', value: params?.bucketWidth, style: 'form', explode: true, allowReserved: false },
      { name: 'project_ids', value: params?.projectIds, style: 'form', explode: true, allowReserved: false },
      { name: 'user_ids', value: params?.userIds, style: 'form', explode: true, allowReserved: false },
      { name: 'api_key_ids', value: params?.apiKeyIds, style: 'form', explode: true, allowReserved: false },
      { name: 'models', value: params?.models, style: 'form', explode: true, allowReserved: false },
      { name: 'group_by', value: params?.groupBy, style: 'form', explode: true, allowReserved: false },
      { name: 'limit', value: params?.limit, style: 'form', explode: true, allowReserved: false },
      { name: 'page', value: params?.page, style: 'form', explode: true, allowReserved: false },
    ]);
    return this.client.get<OpenAiOrganizationCostList>(appendQueryString(aiApiPath(`/organization/costs`), query));
  }
}

export class OrganizationCertificatesDeactivateApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Deactivate organization certificates */
  async create(body: OpenAiCertificateActivationRequest): Promise<OpenAiCertificateList> {
    return this.client.post<OpenAiCertificateList>(aiApiPath(`/organization/certificates/deactivate`), body, undefined, undefined, 'application/json');
  }
}

export class OrganizationCertificatesActivateApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Activate organization certificates */
  async create(body: OpenAiCertificateActivationRequest): Promise<OpenAiCertificateList> {
    return this.client.post<OpenAiCertificateList>(aiApiPath(`/organization/certificates/activate`), body, undefined, undefined, 'application/json');
  }
}

export interface OrganizationCertificatesListParams {
  limit?: number;
  order?: 'asc' | 'desc';
  after?: string;
  before?: string;
}

export class OrganizationCertificatesApi {
  private client: HttpClient;
  public readonly activate: OrganizationCertificatesActivateApi;
  public readonly deactivate: OrganizationCertificatesDeactivateApi;

  constructor(client: HttpClient) {
    this.client = client;
    this.activate = new OrganizationCertificatesActivateApi(client);
    this.deactivate = new OrganizationCertificatesDeactivateApi(client);
  }


/** List organization certificates */
  async list(params?: OrganizationCertificatesListParams): Promise<OpenAiCertificateList> {
    const query = buildQueryString([
      { name: 'limit', value: params?.limit, style: 'form', explode: true, allowReserved: false },
      { name: 'order', value: params?.order, style: 'form', explode: true, allowReserved: false },
      { name: 'after', value: params?.after, style: 'form', explode: true, allowReserved: false },
      { name: 'before', value: params?.before, style: 'form', explode: true, allowReserved: false },
    ]);
    return this.client.get<OpenAiCertificateList>(appendQueryString(aiApiPath(`/organization/certificates`), query));
  }

/** Upload organization certificate */
  async create(body: OpenAiCertificateUploadMultipartRequest): Promise<OpenAiCertificate> {
    return this.client.post<OpenAiCertificate>(aiApiPath(`/organization/certificates`), body, undefined, undefined, 'multipart/form-data');
  }

/** Delete organization certificate */
  async delete(certificateId: string): Promise<DeleteResult> {
    return this.client.delete<DeleteResult>(aiApiPath(`/organization/certificates/${serializePathParameter(certificateId, { name: 'certificate_id', style: 'simple', explode: false })}`));
  }

/** Retrieve organization certificate */
  async retrieve(certificateId: string): Promise<OpenAiCertificate> {
    return this.client.get<OpenAiCertificate>(aiApiPath(`/organization/certificates/${serializePathParameter(certificateId, { name: 'certificate_id', style: 'simple', explode: false })}`));
  }
}

export interface OrganizationAuditLogsListParams {
  effectiveAtGte?: string;
  effectiveAtLte?: string;
  projectIds?: string[];
  eventTypes?: string[];
  actorIds?: string[];
  actorEmails?: string[];
  resourceIds?: string[];
  limit?: number;
  after?: string;
  before?: string;
}

export class OrganizationAuditLogsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** List organization audit logs */
  async list(params?: OrganizationAuditLogsListParams): Promise<OpenAiOrganizationAuditLogList> {
    const query = buildQueryString([
      { name: 'effective_at[gte]', value: params?.effectiveAtGte, style: 'form', explode: true, allowReserved: false },
      { name: 'effective_at[lte]', value: params?.effectiveAtLte, style: 'form', explode: true, allowReserved: false },
      { name: 'project_ids[]', value: params?.projectIds, style: 'form', explode: true, allowReserved: false },
      { name: 'event_types[]', value: params?.eventTypes, style: 'form', explode: true, allowReserved: false },
      { name: 'actor_ids[]', value: params?.actorIds, style: 'form', explode: true, allowReserved: false },
      { name: 'actor_emails[]', value: params?.actorEmails, style: 'form', explode: true, allowReserved: false },
      { name: 'resource_ids[]', value: params?.resourceIds, style: 'form', explode: true, allowReserved: false },
      { name: 'limit', value: params?.limit, style: 'form', explode: true, allowReserved: false },
      { name: 'after', value: params?.after, style: 'form', explode: true, allowReserved: false },
      { name: 'before', value: params?.before, style: 'form', explode: true, allowReserved: false },
    ]);
    return this.client.get<OpenAiOrganizationAuditLogList>(appendQueryString(aiApiPath(`/organization/audit_logs`), query));
  }
}

export interface OrganizationAdminApiKeysListParams {
  limit?: number;
  order?: 'asc' | 'desc';
  after?: string;
  before?: string;
}

export class OrganizationAdminApiKeysApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** List organization admin API keys */
  async list(params?: OrganizationAdminApiKeysListParams): Promise<OpenAiOrganizationAdminApiKeyList> {
    const query = buildQueryString([
      { name: 'limit', value: params?.limit, style: 'form', explode: true, allowReserved: false },
      { name: 'order', value: params?.order, style: 'form', explode: true, allowReserved: false },
      { name: 'after', value: params?.after, style: 'form', explode: true, allowReserved: false },
      { name: 'before', value: params?.before, style: 'form', explode: true, allowReserved: false },
    ]);
    return this.client.get<OpenAiOrganizationAdminApiKeyList>(appendQueryString(aiApiPath(`/organization/admin_api_keys`), query));
  }

/** Create organization admin API key */
  async create(body: OpenAiOrganizationAdminApiKeyCreateRequest): Promise<OpenAiOrganizationAdminApiKey> {
    return this.client.post<OpenAiOrganizationAdminApiKey>(aiApiPath(`/organization/admin_api_keys`), body, undefined, undefined, 'application/json');
  }

/** Delete organization admin API key */
  async delete(keyId: string): Promise<DeleteResult> {
    return this.client.delete<DeleteResult>(aiApiPath(`/organization/admin_api_keys/${serializePathParameter(keyId, { name: 'key_id', style: 'simple', explode: false })}`));
  }

/** Retrieve organization admin API key */
  async retrieve(keyId: string): Promise<OpenAiOrganizationAdminApiKey> {
    return this.client.get<OpenAiOrganizationAdminApiKey>(aiApiPath(`/organization/admin_api_keys/${serializePathParameter(keyId, { name: 'key_id', style: 'simple', explode: false })}`));
  }
}

export class OrganizationApi {
  private client: HttpClient;
  public readonly adminApiKeys: OrganizationAdminApiKeysApi;
  public readonly auditLogs: OrganizationAuditLogsApi;
  public readonly certificates: OrganizationCertificatesApi;
  public readonly costs: OrganizationCostsApi;
  public readonly groups: OrganizationGroupsApi;
  public readonly invites: OrganizationInvitesApi;
  public readonly projects: OrganizationProjectsApi;
  public readonly roles: OrganizationRolesApi;
  public readonly usage: OrganizationUsageApi;
  public readonly users: OrganizationUsersApi;

  constructor(client: HttpClient) {
    this.client = client;
    this.adminApiKeys = new OrganizationAdminApiKeysApi(client);
    this.auditLogs = new OrganizationAuditLogsApi(client);
    this.certificates = new OrganizationCertificatesApi(client);
    this.costs = new OrganizationCostsApi(client);
    this.groups = new OrganizationGroupsApi(client);
    this.invites = new OrganizationInvitesApi(client);
    this.projects = new OrganizationProjectsApi(client);
    this.roles = new OrganizationRolesApi(client);
    this.usage = new OrganizationUsageApi(client);
    this.users = new OrganizationUsersApi(client);
  }

}

export function createOrganizationApi(client: HttpClient): OrganizationApi {
  return new OrganizationApi(client);
}

function appendQueryString(path: string, rawQueryString: string): string {
  const query = rawQueryString.replace(/^\?+/, '');
  if (!query) {
    return path;
  }
  return path.includes('?') ? `${path}&${query}` : `${path}?${query}`;
}

interface PathParameterSpec {
  name: string;
  style: string;
  explode: boolean;
}

function serializePathParameter(value: unknown, spec: PathParameterSpec): string {
  if (value === undefined || value === null) {
    return '';
  }

  const style = spec.style || 'simple';
  if (Array.isArray(value)) {
    return serializePathArray(spec.name, value, style, spec.explode);
  }
  if (typeof value === 'object') {
    return serializePathObject(spec.name, value as Record<string, unknown>, style, spec.explode);
  }
  return pathPrefix(spec.name, style, false) + encodePathValue(serializePathPrimitive(value));
}

function serializePathArray(name: string, values: unknown[], style: string, explode: boolean): string {
  const serialized = values
    .filter((item) => item !== undefined && item !== null)
    .map((item) => encodePathValue(serializePathPrimitive(item)));
  if (serialized.length === 0) {
    return pathPrefix(name, style, false);
  }
  if (style === 'matrix') {
    return explode
      ? serialized.map((item) => `;${name}=${item}`).join('')
      : `;${name}=${serialized.join(',')}`;
  }
  return pathPrefix(name, style, false) + serialized.join(explode ? '.' : ',');
}

function serializePathObject(name: string, value: Record<string, unknown>, style: string, explode: boolean): string {
  const entries = Object.entries(value).filter(([, entryValue]) => entryValue !== undefined && entryValue !== null);
  if (entries.length === 0) {
    return pathPrefix(name, style, true);
  }
  if (style === 'matrix') {
    return explode
      ? entries.map(([key, entryValue]) => `;${encodePathValue(key)}=${encodePathValue(serializePathPrimitive(entryValue))}`).join('')
      : `;${name}=${entries.flatMap(([key, entryValue]) => [encodePathValue(key), encodePathValue(serializePathPrimitive(entryValue))]).join(',')}`;
  }
  const serialized = explode
    ? entries.map(([key, entryValue]) => `${encodePathValue(key)}=${encodePathValue(serializePathPrimitive(entryValue))}`).join(style === 'label' ? '.' : ',')
    : entries.flatMap(([key, entryValue]) => [encodePathValue(key), encodePathValue(serializePathPrimitive(entryValue))]).join(',');
  return pathPrefix(name, style, true) + serialized;
}

function pathPrefix(name: string, style: string, _objectValue: boolean): string {
  if (style === 'label') return '.';
  if (style === 'matrix') return `;${name}`;
  return '';
}

function encodePathValue(value: string): string {
  return encodeURIComponent(value);
}

function serializePathPrimitive(value: unknown): string {
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (typeof value === 'object') {
    return JSON.stringify(value);
  }
  return String(value);
}
interface QueryParameterSpec {
  name: string;
  value: unknown;
  style: string;
  explode: boolean;
  allowReserved: boolean;
  contentType?: string;
}

function buildQueryString(parameters: QueryParameterSpec[]): string {
  const pairs: string[] = [];
  for (const parameter of parameters) {
    appendSerializedParameter(pairs, parameter);
  }
  return pairs.join('&');
}

function appendSerializedParameter(pairs: string[], parameter: QueryParameterSpec): void {
  if (parameter.value === undefined || parameter.value === null) {
    return;
  }

  if (parameter.contentType) {
    pairs.push(`${encodeQueryComponent(parameter.name)}=${encodeQueryValue(JSON.stringify(parameter.value), parameter.allowReserved)}`);
    return;
  }

  const style = parameter.style || 'form';
  if (style === 'deepObject') {
    appendDeepObjectParameter(pairs, parameter.name, parameter.value, parameter.allowReserved);
    return;
  }

  if (Array.isArray(parameter.value)) {
    appendArrayParameter(pairs, parameter.name, parameter.value, style, parameter.explode, parameter.allowReserved);
    return;
  }

  if (typeof parameter.value === 'object') {
    appendObjectParameter(pairs, parameter.name, parameter.value as Record<string, unknown>, style, parameter.explode, parameter.allowReserved);
    return;
  }

  pairs.push(`${encodeQueryComponent(parameter.name)}=${encodeQueryValue(serializePrimitive(parameter.value), parameter.allowReserved)}`);
}

function appendArrayParameter(
  pairs: string[],
  name: string,
  value: unknown[],
  style: string,
  explode: boolean,
  allowReserved: boolean,
): void {
  const values = value
    .filter((item) => item !== undefined && item !== null)
    .map((item) => serializePrimitive(item));
  if (values.length === 0) {
    return;
  }

  if (style === 'form' && explode) {
    for (const item of values) {
      pairs.push(`${encodeQueryComponent(name)}=${encodeQueryValue(item, allowReserved)}`);
    }
    return;
  }

  pairs.push(`${encodeQueryComponent(name)}=${encodeQueryValue(values.join(','), allowReserved)}`);
}

function appendObjectParameter(
  pairs: string[],
  name: string,
  value: Record<string, unknown>,
  style: string,
  explode: boolean,
  allowReserved: boolean,
): void {
  const entries = Object.entries(value).filter(([, entryValue]) => entryValue !== undefined && entryValue !== null);
  if (entries.length === 0) {
    return;
  }

  if (style === 'form' && explode) {
    for (const [key, entryValue] of entries) {
      pairs.push(`${encodeQueryComponent(key)}=${encodeQueryValue(serializePrimitive(entryValue), allowReserved)}`);
    }
    return;
  }

  const serialized = entries.flatMap(([key, entryValue]) => [key, serializePrimitive(entryValue)]).join(',');
  pairs.push(`${encodeQueryComponent(name)}=${encodeQueryValue(serialized, allowReserved)}`);
}

function appendDeepObjectParameter(
  pairs: string[],
  name: string,
  value: unknown,
  allowReserved: boolean,
): void {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    pairs.push(`${encodeQueryComponent(name)}=${encodeQueryValue(serializePrimitive(value), allowReserved)}`);
    return;
  }

  for (const [key, entryValue] of Object.entries(value as Record<string, unknown>)) {
    if (entryValue === undefined || entryValue === null) {
      continue;
    }
    pairs.push(`${encodeQueryComponent(`${name}[${key}]`)}=${encodeQueryValue(serializePrimitive(entryValue), allowReserved)}`);
  }
}

function serializePrimitive(value: unknown): string {
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (typeof value === 'object') {
    return JSON.stringify(value);
  }
  return String(value);
}

function encodeQueryComponent(value: string): string {
  return encodeURIComponent(value);
}

function encodeQueryValue(value: string, allowReserved: boolean): string {
  const encoded = encodeURIComponent(value);
  if (!allowReserved) {
    return encoded;
  }
  return encoded.replace(/%3A/gi, ':')
    .replace(/%2F/gi, '/')
    .replace(/%3F/gi, '?')
    .replace(/%23/gi, '#')
    .replace(/%5B/gi, '[')
    .replace(/%5D/gi, ']')
    .replace(/%40/gi, '@')
    .replace(/%21/gi, '!')
    .replace(/%24/gi, '$')
    .replace(/%26/gi, '&')
    .replace(/%27/gi, "'")
    .replace(/%28/gi, '(')
    .replace(/%29/gi, ')')
    .replace(/%2A/gi, '*')
    .replace(/%2B/gi, '+')
    .replace(/%2C/gi, ',')
    .replace(/%3B/gi, ';')
    .replace(/%3D/gi, '=');
}
