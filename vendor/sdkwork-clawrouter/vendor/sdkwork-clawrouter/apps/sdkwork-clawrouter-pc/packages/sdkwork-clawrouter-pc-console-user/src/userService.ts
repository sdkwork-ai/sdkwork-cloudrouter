import {
  ensureSdkworkApiSuccess,
  getSdkworkAppbaseAppSdkClient,
  readApiRecord,
  readRequiredMediaResource,
  readRequiredString,
  type ApiRecord,
} from '@sdkwork/clawroutes-pc-commons/runtime';

interface SdkUserProfileResponse {
  avatar: unknown;
  displayName: string;
  email: string;
  isVerified: boolean;
  language: string;
  lastLogin: string;
  lastLoginIp: string;
  passwordLastChanged: string;
  phone: string;
  registeredAt: string;
  status: string;
  thirdPartyBound: string;
  twoFactorEnabled: boolean;
}

export interface UserProfile {
  name: SdkUserProfileResponse['displayName'];
  email: SdkUserProfileResponse['email'];
  phone: SdkUserProfileResponse['phone'];
  language: SdkUserProfileResponse['language'];
  avatar: SdkUserProfileResponse['avatar'];
  isVerified: SdkUserProfileResponse['isVerified'];
  status: SdkUserProfileResponse['status'];
  registeredAt: SdkUserProfileResponse['registeredAt'];
  lastLogin: SdkUserProfileResponse['lastLogin'];
  lastLoginIp: SdkUserProfileResponse['lastLoginIp'];
  passwordLastChanged: SdkUserProfileResponse['passwordLastChanged'];
  twoFactorEnabled: SdkUserProfileResponse['twoFactorEnabled'];
  thirdPartyBound: SdkUserProfileResponse['thirdPartyBound'];
}

export class UserService {
  static async fetchCurrentUser(): Promise<UserProfile> {
    const result = await getSdkworkAppbaseAppSdkClient().iam.users.current.retrieve();
    ensureSdkworkApiSuccess(result, 'console.user.states.loadErrorFallback');
    return normalizeUserProfile(readApiRecord(result));
  }
}

function normalizeUserProfile(data: ApiRecord): UserProfile {
  return {
    name: readRequiredString(data, 'displayName', 'User profile display name is required'),
    email: readRequiredString(data, 'email', 'User profile response missing data'),
    phone: readRequiredStringAllowEmpty(data, 'phone', 'User profile phone is required'),
    language: readRequiredString(data, 'language', 'User profile language is required'),
    avatar: readRequiredMediaResource(data.avatar, 'User profile avatar is required'),
    isVerified: readRequiredBoolean(data, 'isVerified', 'User profile verification status is required'),
    status: readRequiredString(data, 'status', 'User profile status is required'),
    registeredAt: readRequiredString(data, 'registeredAt', 'User profile registration time is required'),
    lastLogin: readRequiredString(data, 'lastLogin', 'User profile last login time is required'),
    lastLoginIp: readRequiredStringAllowEmpty(data, 'lastLoginIp', 'User profile last login IP is required'),
    passwordLastChanged: readRequiredStringAllowEmpty(data, 'passwordLastChanged', 'User profile password change time is required'),
    twoFactorEnabled: readRequiredBoolean(data, 'twoFactorEnabled', 'User profile two-factor status is required'),
    thirdPartyBound: readRequiredStringAllowEmpty(data, 'thirdPartyBound', 'User profile third-party binding summary is required'),
  };
}

function readRequiredStringAllowEmpty(record: ApiRecord, key: string, message: string): string {
  const value = record[key];
  if (value === undefined || value === null) {
    throw new Error(message);
  }
  if (typeof value === 'string') {
    return value;
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  throw new Error(message);
}

function readRequiredBoolean(record: ApiRecord, key: string, message: string): boolean {
  const value = record[key];
  if (typeof value === 'boolean') {
    return value;
  }
  if (typeof value === 'string') {
    if (value.toLowerCase() === 'true') {
      return true;
    }
    if (value.toLowerCase() === 'false') {
      return false;
    }
  }
  throw new Error(message);
}
