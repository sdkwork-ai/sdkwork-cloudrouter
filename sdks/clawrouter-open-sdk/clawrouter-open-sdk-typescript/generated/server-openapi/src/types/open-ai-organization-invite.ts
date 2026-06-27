import type { ProviderJsonValue } from './provider-json-value';

/** OpenAI-compatible organization invite object. */
export interface OpenAiOrganizationInvite {
  /** Unix timestamp in seconds when the invite was created. */
  created_at?: string;
  /** Invitee email address. */
  email: string;
  /** Unix timestamp in seconds when the invite expires. */
  expires_at?: string;
  /** Organization invite identifier. */
  id: string;
  /** Object type, normally organization.invite. */
  object: 'organization.invite';
  /** Projects or project roles included in the invite. */
  projects?: ProviderJsonValue[];
  /** Invited organization role. */
  role?: string;
  /** Invite status. */
  status?: string;
}
