import {
  ensureSdkworkApiSuccess,
  getSdkworkAppbaseAppSdkClient,
  readBoolean,
  readMediaResource,
  readRequiredApiItem,
  readString,
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
    return normalizeUserProfile(readRequiredApiItem(result, 'console.user.states.loadErrorFallback'));
  }
}

function normalizeUserProfile(data: ApiRecord): UserProfile {
  return {
    name: readString(data, 'displayName'),
    email: readString(data, 'email'),
    phone: readString(data, 'phone') || readString(data, 'mobile') || readString(data, 'phoneNumber'),
    language: readString(data, 'language'),
    avatar: readMediaResource(data.avatar),
    isVerified: readBoolean(data, 'isVerified'),
    status: readString(data, 'status'),
    registeredAt: readString(data, 'registeredAt'),
    lastLogin: readString(data, 'lastLogin'),
    lastLoginIp: readString(data, 'lastLoginIp'),
    passwordLastChanged: readString(data, 'passwordLastChanged'),
    twoFactorEnabled: readBoolean(data, 'twoFactorEnabled'),
    thirdPartyBound: readString(data, 'thirdPartyBound'),
  };
}
