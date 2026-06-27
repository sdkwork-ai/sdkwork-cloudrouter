import type { ProviderJsonValue } from './provider-json-value';

/** OpenAI-compatible request to create an organization invite. */
export interface OpenAiOrganizationInviteCreateRequest {
  /** Invitee email address. */
  email: string;
  /** Project memberships or roles to include in the invite. */
  projects?: ProviderJsonValue[];
  /** Organization role identifier. */
  role: string;
}
