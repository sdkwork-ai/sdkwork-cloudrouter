Map<String, dynamic>? _sdkworkAsMap(dynamic value) {
  if (value is Map<String, dynamic>) {
    return value;
  }
  if (value is Map) {
    return value.map((key, item) => MapEntry(key.toString(), item));
  }
  return null;
}

List<dynamic>? _sdkworkAsList(dynamic value) {
  return value is List ? value : null;
}

class AcknowledgeNotificationResponse {
  final String state;
  final bool updated;

  AcknowledgeNotificationResponse({
    required this.state,
    required this.updated
  });

  factory AcknowledgeNotificationResponse.fromJson(Map<String, dynamic> json) {
    return AcknowledgeNotificationResponse(
      state: (() {
        final value = json['state']?.toString();
        if (value == null) {
          throw FormatException('AcknowledgeNotificationResponse.state is required');
        }
        return value;
      })(),
      updated: (() {
        final value = json['updated'];
        if (value is! bool) {
          throw FormatException('AcknowledgeNotificationResponse.updated is required');
        }
        return value;
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'state': state,
      'updated': updated,
    };
  }
}

class AgentsListResult {
  final int code;
  final dynamic data;
  final String traceId;

  AgentsListResult({
    required this.code,
    required this.data,
    required this.traceId
  });

  factory AgentsListResult.fromJson(Map<String, dynamic> json) {
    return AgentsListResult(
      code: (() {
        final value = json['code'];
        if (value is! int) {
          throw FormatException('AgentsListResult.code is required');
        }
        return value;
      })(),
      data: json['data'],
      traceId: (() {
        final value = json['traceId']?.toString();
        if (value == null) {
          throw FormatException('AgentsListResult.traceId is required');
        }
        return value;
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'code': code,
      'data': data,
      'traceId': traceId,
    };
  }
}

class ApiKeysCreateResult {
  final int code;
  final dynamic data;
  final String traceId;

  ApiKeysCreateResult({
    required this.code,
    required this.data,
    required this.traceId
  });

  factory ApiKeysCreateResult.fromJson(Map<String, dynamic> json) {
    return ApiKeysCreateResult(
      code: (() {
        final value = json['code'];
        if (value is! int) {
          throw FormatException('ApiKeysCreateResult.code is required');
        }
        return value;
      })(),
      data: json['data'],
      traceId: (() {
        final value = json['traceId']?.toString();
        if (value == null) {
          throw FormatException('ApiKeysCreateResult.traceId is required');
        }
        return value;
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'code': code,
      'data': data,
      'traceId': traceId,
    };
  }
}

class ApiKeysListResult {
  final int code;
  final dynamic data;
  final String traceId;

  ApiKeysListResult({
    required this.code,
    required this.data,
    required this.traceId
  });

  factory ApiKeysListResult.fromJson(Map<String, dynamic> json) {
    return ApiKeysListResult(
      code: (() {
        final value = json['code'];
        if (value is! int) {
          throw FormatException('ApiKeysListResult.code is required');
        }
        return value;
      })(),
      data: json['data'],
      traceId: (() {
        final value = json['traceId']?.toString();
        if (value == null) {
          throw FormatException('ApiKeysListResult.traceId is required');
        }
        return value;
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'code': code,
      'data': data,
      'traceId': traceId,
    };
  }
}

class ApiKeysUpdateResult {
  final int code;
  final dynamic data;
  final String traceId;

  ApiKeysUpdateResult({
    required this.code,
    required this.data,
    required this.traceId
  });

  factory ApiKeysUpdateResult.fromJson(Map<String, dynamic> json) {
    return ApiKeysUpdateResult(
      code: (() {
        final value = json['code'];
        if (value is! int) {
          throw FormatException('ApiKeysUpdateResult.code is required');
        }
        return value;
      })(),
      data: json['data'],
      traceId: (() {
        final value = json['traceId']?.toString();
        if (value == null) {
          throw FormatException('ApiKeysUpdateResult.traceId is required');
        }
        return value;
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'code': code,
      'data': data,
      'traceId': traceId,
    };
  }
}

class AppApiKeyItem {
  final String accountGroup;
  final String accountGroupName;
  final List<String> accountGroups;
  final String created;
  final bool defaultForRuntime;
  final String expires;
  final List<Map<String, dynamic>>? groupBindings;
  final String id;
  final String ipLimit;
  final String maskedKey;
  final List<String> modalities;
  final String name;
  final String quota;
  final String? rate;
  final String? rawKey;
  final String status;
  final String usedQuota;

  AppApiKeyItem({
    required this.accountGroup,
    required this.accountGroupName,
    required this.accountGroups,
    required this.created,
    required this.defaultForRuntime,
    required this.expires,
    this.groupBindings,
    required this.id,
    required this.ipLimit,
    required this.maskedKey,
    required this.modalities,
    required this.name,
    required this.quota,
    this.rate,
    this.rawKey,
    required this.status,
    required this.usedQuota
  });

  factory AppApiKeyItem.fromJson(Map<String, dynamic> json) {
    return AppApiKeyItem(
      accountGroup: (() {
        final value = json['accountGroup']?.toString();
        if (value == null) {
          throw FormatException('AppApiKeyItem.accountGroup is required');
        }
        return value;
      })(),
      accountGroupName: (() {
        final value = json['accountGroupName']?.toString();
        if (value == null) {
          throw FormatException('AppApiKeyItem.accountGroupName is required');
        }
        return value;
      })(),
      accountGroups: (() {
        final list = _sdkworkAsList(json['accountGroups']);
        if (list == null) {
          throw FormatException('AppApiKeyItem.accountGroups is required');
        }
        return list
            .map((item) => item?.toString())
            .whereType<String>()
            .toList();
      })(),
      created: (() {
        final value = json['created']?.toString();
        if (value == null) {
          throw FormatException('AppApiKeyItem.created is required');
        }
        return value;
      })(),
      defaultForRuntime: (() {
        final value = json['defaultForRuntime'];
        if (value is! bool) {
          throw FormatException('AppApiKeyItem.defaultForRuntime is required');
        }
        return value;
      })(),
      expires: (() {
        final value = json['expires']?.toString();
        if (value == null) {
          throw FormatException('AppApiKeyItem.expires is required');
        }
        return value;
      })(),
      groupBindings: (() {
        final list = _sdkworkAsList(json['groupBindings']);
        if (list == null) {
          return null;
        }
        return list
            .map((item) => _sdkworkAsMap(item))
            .whereType<Map<String, dynamic>>()
            .toList();
      })(),
      id: (() {
        final value = json['id']?.toString();
        if (value == null) {
          throw FormatException('AppApiKeyItem.id is required');
        }
        return value;
      })(),
      ipLimit: (() {
        final value = json['ipLimit']?.toString();
        if (value == null) {
          throw FormatException('AppApiKeyItem.ipLimit is required');
        }
        return value;
      })(),
      maskedKey: (() {
        final value = json['maskedKey']?.toString();
        if (value == null) {
          throw FormatException('AppApiKeyItem.maskedKey is required');
        }
        return value;
      })(),
      modalities: (() {
        final list = _sdkworkAsList(json['modalities']);
        if (list == null) {
          throw FormatException('AppApiKeyItem.modalities is required');
        }
        return list
            .map((item) => item?.toString())
            .whereType<String>()
            .toList();
      })(),
      name: (() {
        final value = json['name']?.toString();
        if (value == null) {
          throw FormatException('AppApiKeyItem.name is required');
        }
        return value;
      })(),
      quota: (() {
        final value = json['quota']?.toString();
        if (value == null) {
          throw FormatException('AppApiKeyItem.quota is required');
        }
        return value;
      })(),
      rate: json['rate']?.toString(),
      rawKey: json['rawKey']?.toString(),
      status: (() {
        final value = json['status']?.toString();
        if (value == null) {
          throw FormatException('AppApiKeyItem.status is required');
        }
        return value;
      })(),
      usedQuota: (() {
        final value = json['usedQuota']?.toString();
        if (value == null) {
          throw FormatException('AppApiKeyItem.usedQuota is required');
        }
        return value;
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'accountGroup': accountGroup,
      'accountGroupName': accountGroupName,
      'accountGroups': accountGroups.map((item) => item).toList(),
      'created': created,
      'defaultForRuntime': defaultForRuntime,
      'expires': expires,
      'groupBindings': groupBindings?.map((item) => item).toList(),
      'id': id,
      'ipLimit': ipLimit,
      'maskedKey': maskedKey,
      'modalities': modalities.map((item) => item).toList(),
      'name': name,
      'quota': quota,
      'rate': rate,
      'rawKey': rawKey,
      'status': status,
      'usedQuota': usedQuota,
    };
  }
}

class AppApiKeyListResponse {
  final List<AppApiKeyItem> items;
  final PageInfo pageInfo;

  AppApiKeyListResponse({
    required this.items,
    required this.pageInfo
  });

  factory AppApiKeyListResponse.fromJson(Map<String, dynamic> json) {
    return AppApiKeyListResponse(
      items: (() {
        final list = _sdkworkAsList(json['items']);
        if (list == null) {
          throw FormatException('AppApiKeyListResponse.items is required');
        }
        return list
            .map((item) => (() {
        final map = _sdkworkAsMap(item);
        return map == null ? null : AppApiKeyItem.fromJson(map);
      })())
            .whereType<AppApiKeyItem>()
            .toList();
      })(),
      pageInfo: (() {
        final map = _sdkworkAsMap(json['pageInfo']);
        if (map == null) {
          throw FormatException('AppApiKeyListResponse.pageInfo is required');
        }
        return PageInfo.fromJson(map);
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'items': items.map((item) => item.toJson()).toList(),
      'pageInfo': pageInfo.toJson(),
    };
  }
}

class AppAuthRuntimeSettingsResponse {
  final Map<String, dynamic> inviteCodePolicy;
  final String leftRailMode;
  final List<String> loginMethods;
  final bool oauthLoginEnabled;
  final List<String> oauthProviders;
  final String oauthRegion;
  final bool qrLoginEnabled;
  final String qrLoginType;
  final List<String> recoveryMethods;
  final List<String> registerMethods;
  final Map<String, dynamic> verificationPolicy;

  AppAuthRuntimeSettingsResponse({
    required this.inviteCodePolicy,
    required this.leftRailMode,
    required this.loginMethods,
    required this.oauthLoginEnabled,
    required this.oauthProviders,
    required this.oauthRegion,
    required this.qrLoginEnabled,
    required this.qrLoginType,
    required this.recoveryMethods,
    required this.registerMethods,
    required this.verificationPolicy
  });

  factory AppAuthRuntimeSettingsResponse.fromJson(Map<String, dynamic> json) {
    return AppAuthRuntimeSettingsResponse(
      inviteCodePolicy: (() {
        final map = _sdkworkAsMap(json['inviteCodePolicy']);
        if (map == null) {
          throw FormatException('AppAuthRuntimeSettingsResponse.inviteCodePolicy is required');
        }
        return map;
      })(),
      leftRailMode: (() {
        final value = json['leftRailMode']?.toString();
        if (value == null) {
          throw FormatException('AppAuthRuntimeSettingsResponse.leftRailMode is required');
        }
        return value;
      })(),
      loginMethods: (() {
        final list = _sdkworkAsList(json['loginMethods']);
        if (list == null) {
          throw FormatException('AppAuthRuntimeSettingsResponse.loginMethods is required');
        }
        return list
            .map((item) => item?.toString())
            .whereType<String>()
            .toList();
      })(),
      oauthLoginEnabled: (() {
        final value = json['oauthLoginEnabled'];
        if (value is! bool) {
          throw FormatException('AppAuthRuntimeSettingsResponse.oauthLoginEnabled is required');
        }
        return value;
      })(),
      oauthProviders: (() {
        final list = _sdkworkAsList(json['oauthProviders']);
        if (list == null) {
          throw FormatException('AppAuthRuntimeSettingsResponse.oauthProviders is required');
        }
        return list
            .map((item) => item?.toString())
            .whereType<String>()
            .toList();
      })(),
      oauthRegion: (() {
        final value = json['oauthRegion']?.toString();
        if (value == null) {
          throw FormatException('AppAuthRuntimeSettingsResponse.oauthRegion is required');
        }
        return value;
      })(),
      qrLoginEnabled: (() {
        final value = json['qrLoginEnabled'];
        if (value is! bool) {
          throw FormatException('AppAuthRuntimeSettingsResponse.qrLoginEnabled is required');
        }
        return value;
      })(),
      qrLoginType: (() {
        final value = json['qrLoginType']?.toString();
        if (value == null) {
          throw FormatException('AppAuthRuntimeSettingsResponse.qrLoginType is required');
        }
        return value;
      })(),
      recoveryMethods: (() {
        final list = _sdkworkAsList(json['recoveryMethods']);
        if (list == null) {
          throw FormatException('AppAuthRuntimeSettingsResponse.recoveryMethods is required');
        }
        return list
            .map((item) => item?.toString())
            .whereType<String>()
            .toList();
      })(),
      registerMethods: (() {
        final list = _sdkworkAsList(json['registerMethods']);
        if (list == null) {
          throw FormatException('AppAuthRuntimeSettingsResponse.registerMethods is required');
        }
        return list
            .map((item) => item?.toString())
            .whereType<String>()
            .toList();
      })(),
      verificationPolicy: (() {
        final map = _sdkworkAsMap(json['verificationPolicy']);
        if (map == null) {
          throw FormatException('AppAuthRuntimeSettingsResponse.verificationPolicy is required');
        }
        return map;
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'inviteCodePolicy': inviteCodePolicy,
      'leftRailMode': leftRailMode,
      'loginMethods': loginMethods.map((item) => item).toList(),
      'oauthLoginEnabled': oauthLoginEnabled,
      'oauthProviders': oauthProviders.map((item) => item).toList(),
      'oauthRegion': oauthRegion,
      'qrLoginEnabled': qrLoginEnabled,
      'qrLoginType': qrLoginType,
      'recoveryMethods': recoveryMethods.map((item) => item).toList(),
      'registerMethods': registerMethods.map((item) => item).toList(),
      'verificationPolicy': verificationPolicy,
    };
  }
}

class AppInviteClaimRequest {
  final String inviteCode;

  AppInviteClaimRequest({
    required this.inviteCode
  });

  factory AppInviteClaimRequest.fromJson(Map<String, dynamic> json) {
    return AppInviteClaimRequest(
      inviteCode: (() {
        final value = json['inviteCode']?.toString();
        if (value == null) {
          throw FormatException('AppInviteClaimRequest.inviteCode is required');
        }
        return value;
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'inviteCode': inviteCode,
    };
  }
}

class AppInviteClaimResponse {
  final String rewardStatus;

  AppInviteClaimResponse({
    required this.rewardStatus
  });

  factory AppInviteClaimResponse.fromJson(Map<String, dynamic> json) {
    return AppInviteClaimResponse(
      rewardStatus: (() {
        final value = json['rewardStatus']?.toString();
        if (value == null) {
          throw FormatException('AppInviteClaimResponse.rewardStatus is required');
        }
        return value;
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'rewardStatus': rewardStatus,
    };
  }
}

class AppInvitePolicyResponse {
  final bool loginRequired;
  final bool registerRequired;

  AppInvitePolicyResponse({
    required this.loginRequired,
    required this.registerRequired
  });

  factory AppInvitePolicyResponse.fromJson(Map<String, dynamic> json) {
    return AppInvitePolicyResponse(
      loginRequired: (() {
        final value = json['loginRequired'];
        if (value is! bool) {
          throw FormatException('AppInvitePolicyResponse.loginRequired is required');
        }
        return value;
      })(),
      registerRequired: (() {
        final value = json['registerRequired'];
        if (value is! bool) {
          throw FormatException('AppInvitePolicyResponse.registerRequired is required');
        }
        return value;
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'loginRequired': loginRequired,
      'registerRequired': registerRequired,
    };
  }
}

class AppInviteValidateRequest {
  final String inviteCode;

  AppInviteValidateRequest({
    required this.inviteCode
  });

  factory AppInviteValidateRequest.fromJson(Map<String, dynamic> json) {
    return AppInviteValidateRequest(
      inviteCode: (() {
        final value = json['inviteCode']?.toString();
        if (value == null) {
          throw FormatException('AppInviteValidateRequest.inviteCode is required');
        }
        return value;
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'inviteCode': inviteCode,
    };
  }
}

class AppInviteValidateResponse {
  final String message;
  final bool valid;

  AppInviteValidateResponse({
    required this.message,
    required this.valid
  });

  factory AppInviteValidateResponse.fromJson(Map<String, dynamic> json) {
    return AppInviteValidateResponse(
      message: (() {
        final value = json['message']?.toString();
        if (value == null) {
          throw FormatException('AppInviteValidateResponse.message is required');
        }
        return value;
      })(),
      valid: (() {
        final value = json['valid'];
        if (value is! bool) {
          throw FormatException('AppInviteValidateResponse.valid is required');
        }
        return value;
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'message': message,
      'valid': valid,
    };
  }
}

class AppRoutingAccountGroup {
  final bool authorized;
  final String availableAccountCount;
  final String description;
  final String fallbackMode;
  final String groupCode;
  final String groupName;
  final String id;
  final String memberAccountCount;
  final List<String>? modalities;
  final List<String> resourceCodes;
  final List<String> resourceGroupCodes;
  final String routingStrategy;
  final String saleMultiplier;
  final String status;
  final List<String>? tags;
  final String? vendorCode;

  AppRoutingAccountGroup({
    required this.authorized,
    required this.availableAccountCount,
    required this.description,
    required this.fallbackMode,
    required this.groupCode,
    required this.groupName,
    required this.id,
    required this.memberAccountCount,
    this.modalities,
    required this.resourceCodes,
    required this.resourceGroupCodes,
    required this.routingStrategy,
    required this.saleMultiplier,
    required this.status,
    this.tags,
    this.vendorCode
  });

  factory AppRoutingAccountGroup.fromJson(Map<String, dynamic> json) {
    return AppRoutingAccountGroup(
      authorized: (() {
        final value = json['authorized'];
        if (value is! bool) {
          throw FormatException('AppRoutingAccountGroup.authorized is required');
        }
        return value;
      })(),
      availableAccountCount: (() {
        final value = json['availableAccountCount']?.toString();
        if (value == null) {
          throw FormatException('AppRoutingAccountGroup.availableAccountCount is required');
        }
        return value;
      })(),
      description: (() {
        final value = json['description']?.toString();
        if (value == null) {
          throw FormatException('AppRoutingAccountGroup.description is required');
        }
        return value;
      })(),
      fallbackMode: (() {
        final value = json['fallbackMode']?.toString();
        if (value == null) {
          throw FormatException('AppRoutingAccountGroup.fallbackMode is required');
        }
        return value;
      })(),
      groupCode: (() {
        final value = json['groupCode']?.toString();
        if (value == null) {
          throw FormatException('AppRoutingAccountGroup.groupCode is required');
        }
        return value;
      })(),
      groupName: (() {
        final value = json['groupName']?.toString();
        if (value == null) {
          throw FormatException('AppRoutingAccountGroup.groupName is required');
        }
        return value;
      })(),
      id: (() {
        final value = json['id']?.toString();
        if (value == null) {
          throw FormatException('AppRoutingAccountGroup.id is required');
        }
        return value;
      })(),
      memberAccountCount: (() {
        final value = json['memberAccountCount']?.toString();
        if (value == null) {
          throw FormatException('AppRoutingAccountGroup.memberAccountCount is required');
        }
        return value;
      })(),
      modalities: (() {
        final list = _sdkworkAsList(json['modalities']);
        if (list == null) {
          return null;
        }
        return list
            .map((item) => item?.toString())
            .whereType<String>()
            .toList();
      })(),
      resourceCodes: (() {
        final list = _sdkworkAsList(json['resourceCodes']);
        if (list == null) {
          throw FormatException('AppRoutingAccountGroup.resourceCodes is required');
        }
        return list
            .map((item) => item?.toString())
            .whereType<String>()
            .toList();
      })(),
      resourceGroupCodes: (() {
        final list = _sdkworkAsList(json['resourceGroupCodes']);
        if (list == null) {
          throw FormatException('AppRoutingAccountGroup.resourceGroupCodes is required');
        }
        return list
            .map((item) => item?.toString())
            .whereType<String>()
            .toList();
      })(),
      routingStrategy: (() {
        final value = json['routingStrategy']?.toString();
        if (value == null) {
          throw FormatException('AppRoutingAccountGroup.routingStrategy is required');
        }
        return value;
      })(),
      saleMultiplier: (() {
        final value = json['saleMultiplier']?.toString();
        if (value == null) {
          throw FormatException('AppRoutingAccountGroup.saleMultiplier is required');
        }
        return value;
      })(),
      status: (() {
        final value = json['status']?.toString();
        if (value == null) {
          throw FormatException('AppRoutingAccountGroup.status is required');
        }
        return value;
      })(),
      tags: (() {
        final list = _sdkworkAsList(json['tags']);
        if (list == null) {
          return null;
        }
        return list
            .map((item) => item?.toString())
            .whereType<String>()
            .toList();
      })(),
      vendorCode: json['vendorCode']?.toString()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'authorized': authorized,
      'availableAccountCount': availableAccountCount,
      'description': description,
      'fallbackMode': fallbackMode,
      'groupCode': groupCode,
      'groupName': groupName,
      'id': id,
      'memberAccountCount': memberAccountCount,
      'modalities': modalities?.map((item) => item).toList(),
      'resourceCodes': resourceCodes.map((item) => item).toList(),
      'resourceGroupCodes': resourceGroupCodes.map((item) => item).toList(),
      'routingStrategy': routingStrategy,
      'saleMultiplier': saleMultiplier,
      'status': status,
      'tags': tags?.map((item) => item).toList(),
      'vendorCode': vendorCode,
    };
  }
}

class AppRoutingAccountGroupListResponse {
  final List<AppRoutingAccountGroup> items;
  final PageInfo pageInfo;

  AppRoutingAccountGroupListResponse({
    required this.items,
    required this.pageInfo
  });

  factory AppRoutingAccountGroupListResponse.fromJson(Map<String, dynamic> json) {
    return AppRoutingAccountGroupListResponse(
      items: (() {
        final list = _sdkworkAsList(json['items']);
        if (list == null) {
          throw FormatException('AppRoutingAccountGroupListResponse.items is required');
        }
        return list
            .map((item) => (() {
        final map = _sdkworkAsMap(item);
        return map == null ? null : AppRoutingAccountGroup.fromJson(map);
      })())
            .whereType<AppRoutingAccountGroup>()
            .toList();
      })(),
      pageInfo: (() {
        final map = _sdkworkAsMap(json['pageInfo']);
        if (map == null) {
          throw FormatException('AppRoutingAccountGroupListResponse.pageInfo is required');
        }
        return PageInfo.fromJson(map);
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'items': items.map((item) => item.toJson()).toList(),
      'pageInfo': pageInfo.toJson(),
    };
  }
}

class AppRoutingApiKey {
  final List<AppRoutingApiKeyAccountGroup> accountGroups;
  final String createdAt;
  final String displayKey;
  final String id;
  final String name;
  final String status;
  final String totalUsage;

  AppRoutingApiKey({
    required this.accountGroups,
    required this.createdAt,
    required this.displayKey,
    required this.id,
    required this.name,
    required this.status,
    required this.totalUsage
  });

  factory AppRoutingApiKey.fromJson(Map<String, dynamic> json) {
    return AppRoutingApiKey(
      accountGroups: (() {
        final list = _sdkworkAsList(json['accountGroups']);
        if (list == null) {
          throw FormatException('AppRoutingApiKey.accountGroups is required');
        }
        return list
            .map((item) => (() {
        final map = _sdkworkAsMap(item);
        return map == null ? null : AppRoutingApiKeyAccountGroup.fromJson(map);
      })())
            .whereType<AppRoutingApiKeyAccountGroup>()
            .toList();
      })(),
      createdAt: (() {
        final value = json['createdAt']?.toString();
        if (value == null) {
          throw FormatException('AppRoutingApiKey.createdAt is required');
        }
        return value;
      })(),
      displayKey: (() {
        final value = json['displayKey']?.toString();
        if (value == null) {
          throw FormatException('AppRoutingApiKey.displayKey is required');
        }
        return value;
      })(),
      id: (() {
        final value = json['id']?.toString();
        if (value == null) {
          throw FormatException('AppRoutingApiKey.id is required');
        }
        return value;
      })(),
      name: (() {
        final value = json['name']?.toString();
        if (value == null) {
          throw FormatException('AppRoutingApiKey.name is required');
        }
        return value;
      })(),
      status: (() {
        final value = json['status']?.toString();
        if (value == null) {
          throw FormatException('AppRoutingApiKey.status is required');
        }
        return value;
      })(),
      totalUsage: (() {
        final value = json['totalUsage']?.toString();
        if (value == null) {
          throw FormatException('AppRoutingApiKey.totalUsage is required');
        }
        return value;
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'accountGroups': accountGroups.map((item) => item.toJson()).toList(),
      'createdAt': createdAt,
      'displayKey': displayKey,
      'id': id,
      'name': name,
      'status': status,
      'totalUsage': totalUsage,
    };
  }
}

class AppRoutingApiKeyAccountGroup {
  final String code;
  final String id;
  final String name;

  AppRoutingApiKeyAccountGroup({
    required this.code,
    required this.id,
    required this.name
  });

  factory AppRoutingApiKeyAccountGroup.fromJson(Map<String, dynamic> json) {
    return AppRoutingApiKeyAccountGroup(
      code: (() {
        final value = json['code']?.toString();
        if (value == null) {
          throw FormatException('AppRoutingApiKeyAccountGroup.code is required');
        }
        return value;
      })(),
      id: (() {
        final value = json['id']?.toString();
        if (value == null) {
          throw FormatException('AppRoutingApiKeyAccountGroup.id is required');
        }
        return value;
      })(),
      name: (() {
        final value = json['name']?.toString();
        if (value == null) {
          throw FormatException('AppRoutingApiKeyAccountGroup.name is required');
        }
        return value;
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'code': code,
      'id': id,
      'name': name,
    };
  }
}

class AppRoutingApiKeyListResponse {
  final List<AppRoutingApiKey> items;
  final PageInfo pageInfo;

  AppRoutingApiKeyListResponse({
    required this.items,
    required this.pageInfo
  });

  factory AppRoutingApiKeyListResponse.fromJson(Map<String, dynamic> json) {
    return AppRoutingApiKeyListResponse(
      items: (() {
        final list = _sdkworkAsList(json['items']);
        if (list == null) {
          throw FormatException('AppRoutingApiKeyListResponse.items is required');
        }
        return list
            .map((item) => (() {
        final map = _sdkworkAsMap(item);
        return map == null ? null : AppRoutingApiKey.fromJson(map);
      })())
            .whereType<AppRoutingApiKey>()
            .toList();
      })(),
      pageInfo: (() {
        final map = _sdkworkAsMap(json['pageInfo']);
        if (map == null) {
          throw FormatException('AppRoutingApiKeyListResponse.pageInfo is required');
        }
        return PageInfo.fromJson(map);
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'items': items.map((item) => item.toJson()).toList(),
      'pageInfo': pageInfo.toJson(),
    };
  }
}

class AppRoutingModelGroupCatalog {
  final List<AppRoutingModelGroupCatalogModality> modalities;

  AppRoutingModelGroupCatalog({
    required this.modalities
  });

  factory AppRoutingModelGroupCatalog.fromJson(Map<String, dynamic> json) {
    return AppRoutingModelGroupCatalog(
      modalities: (() {
        final list = _sdkworkAsList(json['modalities']);
        if (list == null) {
          throw FormatException('AppRoutingModelGroupCatalog.modalities is required');
        }
        return list
            .map((item) => (() {
        final map = _sdkworkAsMap(item);
        return map == null ? null : AppRoutingModelGroupCatalogModality.fromJson(map);
      })())
            .whereType<AppRoutingModelGroupCatalogModality>()
            .toList();
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'modalities': modalities.map((item) => item.toJson()).toList(),
    };
  }
}

class AppRoutingModelGroupCatalogItemResponse {
  final AppRoutingModelGroupCatalog item;

  AppRoutingModelGroupCatalogItemResponse({
    required this.item
  });

  factory AppRoutingModelGroupCatalogItemResponse.fromJson(Map<String, dynamic> json) {
    return AppRoutingModelGroupCatalogItemResponse(
      item: (() {
        final map = _sdkworkAsMap(json['item']);
        if (map == null) {
          throw FormatException('AppRoutingModelGroupCatalogItemResponse.item is required');
        }
        return AppRoutingModelGroupCatalog.fromJson(map);
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'item': item.toJson(),
    };
  }
}

class AppRoutingModelGroupCatalogModality {
  final String modality;
  final List<AppRoutingModelGroupCatalogVendor> vendors;

  AppRoutingModelGroupCatalogModality({
    required this.modality,
    required this.vendors
  });

  factory AppRoutingModelGroupCatalogModality.fromJson(Map<String, dynamic> json) {
    return AppRoutingModelGroupCatalogModality(
      modality: (() {
        final value = json['modality']?.toString();
        if (value == null) {
          throw FormatException('AppRoutingModelGroupCatalogModality.modality is required');
        }
        return value;
      })(),
      vendors: (() {
        final list = _sdkworkAsList(json['vendors']);
        if (list == null) {
          throw FormatException('AppRoutingModelGroupCatalogModality.vendors is required');
        }
        return list
            .map((item) => (() {
        final map = _sdkworkAsMap(item);
        return map == null ? null : AppRoutingModelGroupCatalogVendor.fromJson(map);
      })())
            .whereType<AppRoutingModelGroupCatalogVendor>()
            .toList();
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'modality': modality,
      'vendors': vendors.map((item) => item.toJson()).toList(),
    };
  }
}

class AppRoutingModelGroupCatalogModel {
  final String catalogKey;
  final List<String> defaultGroupCodes;
  final String? defaultSource;
  final String displayName;
  final List<AppRoutingModelGroupOption> groups;
  final List<String> modalities;
  final String model;
  final String vendorCode;

  AppRoutingModelGroupCatalogModel({
    required this.catalogKey,
    required this.defaultGroupCodes,
    this.defaultSource,
    required this.displayName,
    required this.groups,
    required this.modalities,
    required this.model,
    required this.vendorCode
  });

  factory AppRoutingModelGroupCatalogModel.fromJson(Map<String, dynamic> json) {
    return AppRoutingModelGroupCatalogModel(
      catalogKey: (() {
        final value = json['catalogKey']?.toString();
        if (value == null) {
          throw FormatException('AppRoutingModelGroupCatalogModel.catalogKey is required');
        }
        return value;
      })(),
      defaultGroupCodes: (() {
        final list = _sdkworkAsList(json['defaultGroupCodes']);
        if (list == null) {
          throw FormatException('AppRoutingModelGroupCatalogModel.defaultGroupCodes is required');
        }
        return list
            .map((item) => item?.toString())
            .whereType<String>()
            .toList();
      })(),
      defaultSource: json['defaultSource']?.toString(),
      displayName: (() {
        final value = json['displayName']?.toString();
        if (value == null) {
          throw FormatException('AppRoutingModelGroupCatalogModel.displayName is required');
        }
        return value;
      })(),
      groups: (() {
        final list = _sdkworkAsList(json['groups']);
        if (list == null) {
          throw FormatException('AppRoutingModelGroupCatalogModel.groups is required');
        }
        return list
            .map((item) => (() {
        final map = _sdkworkAsMap(item);
        return map == null ? null : AppRoutingModelGroupOption.fromJson(map);
      })())
            .whereType<AppRoutingModelGroupOption>()
            .toList();
      })(),
      modalities: (() {
        final list = _sdkworkAsList(json['modalities']);
        if (list == null) {
          throw FormatException('AppRoutingModelGroupCatalogModel.modalities is required');
        }
        return list
            .map((item) => item?.toString())
            .whereType<String>()
            .toList();
      })(),
      model: (() {
        final value = json['model']?.toString();
        if (value == null) {
          throw FormatException('AppRoutingModelGroupCatalogModel.model is required');
        }
        return value;
      })(),
      vendorCode: (() {
        final value = json['vendorCode']?.toString();
        if (value == null) {
          throw FormatException('AppRoutingModelGroupCatalogModel.vendorCode is required');
        }
        return value;
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'catalogKey': catalogKey,
      'defaultGroupCodes': defaultGroupCodes.map((item) => item).toList(),
      'defaultSource': defaultSource,
      'displayName': displayName,
      'groups': groups.map((item) => item.toJson()).toList(),
      'modalities': modalities.map((item) => item).toList(),
      'model': model,
      'vendorCode': vendorCode,
    };
  }
}

class AppRoutingModelGroupCatalogVendor {
  final List<AppRoutingModelGroupCatalogModel> models;
  final String vendorCode;
  final String vendorName;

  AppRoutingModelGroupCatalogVendor({
    required this.models,
    required this.vendorCode,
    required this.vendorName
  });

  factory AppRoutingModelGroupCatalogVendor.fromJson(Map<String, dynamic> json) {
    return AppRoutingModelGroupCatalogVendor(
      models: (() {
        final list = _sdkworkAsList(json['models']);
        if (list == null) {
          throw FormatException('AppRoutingModelGroupCatalogVendor.models is required');
        }
        return list
            .map((item) => (() {
        final map = _sdkworkAsMap(item);
        return map == null ? null : AppRoutingModelGroupCatalogModel.fromJson(map);
      })())
            .whereType<AppRoutingModelGroupCatalogModel>()
            .toList();
      })(),
      vendorCode: (() {
        final value = json['vendorCode']?.toString();
        if (value == null) {
          throw FormatException('AppRoutingModelGroupCatalogVendor.vendorCode is required');
        }
        return value;
      })(),
      vendorName: (() {
        final value = json['vendorName']?.toString();
        if (value == null) {
          throw FormatException('AppRoutingModelGroupCatalogVendor.vendorName is required');
        }
        return value;
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'models': models.map((item) => item.toJson()).toList(),
      'vendorCode': vendorCode,
      'vendorName': vendorName,
    };
  }
}

class AppRoutingModelGroupDefault {
  final String accountGroupCode;
  final String accountGroupId;
  final String accountGroupName;
  final String modality;
  final String model;
  final int priority;
  final String scope;
  final String vendorCode;

  AppRoutingModelGroupDefault({
    required this.accountGroupCode,
    required this.accountGroupId,
    required this.accountGroupName,
    required this.modality,
    required this.model,
    required this.priority,
    required this.scope,
    required this.vendorCode
  });

  factory AppRoutingModelGroupDefault.fromJson(Map<String, dynamic> json) {
    return AppRoutingModelGroupDefault(
      accountGroupCode: (() {
        final value = json['accountGroupCode']?.toString();
        if (value == null) {
          throw FormatException('AppRoutingModelGroupDefault.accountGroupCode is required');
        }
        return value;
      })(),
      accountGroupId: (() {
        final value = json['accountGroupId']?.toString();
        if (value == null) {
          throw FormatException('AppRoutingModelGroupDefault.accountGroupId is required');
        }
        return value;
      })(),
      accountGroupName: (() {
        final value = json['accountGroupName']?.toString();
        if (value == null) {
          throw FormatException('AppRoutingModelGroupDefault.accountGroupName is required');
        }
        return value;
      })(),
      modality: (() {
        final value = json['modality']?.toString();
        if (value == null) {
          throw FormatException('AppRoutingModelGroupDefault.modality is required');
        }
        return value;
      })(),
      model: (() {
        final value = json['model']?.toString();
        if (value == null) {
          throw FormatException('AppRoutingModelGroupDefault.model is required');
        }
        return value;
      })(),
      priority: (() {
        final value = json['priority'];
        if (value is! int) {
          throw FormatException('AppRoutingModelGroupDefault.priority is required');
        }
        return value;
      })(),
      scope: (() {
        final value = json['scope']?.toString();
        if (value == null) {
          throw FormatException('AppRoutingModelGroupDefault.scope is required');
        }
        return value;
      })(),
      vendorCode: (() {
        final value = json['vendorCode']?.toString();
        if (value == null) {
          throw FormatException('AppRoutingModelGroupDefault.vendorCode is required');
        }
        return value;
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'accountGroupCode': accountGroupCode,
      'accountGroupId': accountGroupId,
      'accountGroupName': accountGroupName,
      'modality': modality,
      'model': model,
      'priority': priority,
      'scope': scope,
      'vendorCode': vendorCode,
    };
  }
}

class AppRoutingModelGroupDefaultRequest {
  final String? accountGroup;
  final List<String>? accountGroups;
  final String? modality;
  final String? model;
  final String scope;
  final String? vendorCode;

  AppRoutingModelGroupDefaultRequest({
    this.accountGroup,
    this.accountGroups,
    this.modality,
    this.model,
    required this.scope,
    this.vendorCode
  });

  factory AppRoutingModelGroupDefaultRequest.fromJson(Map<String, dynamic> json) {
    return AppRoutingModelGroupDefaultRequest(
      accountGroup: json['accountGroup']?.toString(),
      accountGroups: (() {
        final list = _sdkworkAsList(json['accountGroups']);
        if (list == null) {
          return null;
        }
        return list
            .map((item) => item?.toString())
            .whereType<String>()
            .toList();
      })(),
      modality: json['modality']?.toString(),
      model: json['model']?.toString(),
      scope: (() {
        final value = json['scope']?.toString();
        if (value == null) {
          throw FormatException('AppRoutingModelGroupDefaultRequest.scope is required');
        }
        return value;
      })(),
      vendorCode: json['vendorCode']?.toString()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'accountGroup': accountGroup,
      'accountGroups': accountGroups?.map((item) => item).toList(),
      'modality': modality,
      'model': model,
      'scope': scope,
      'vendorCode': vendorCode,
    };
  }
}

class AppRoutingModelGroupDefaultSetResponse {
  final bool accepted;

  AppRoutingModelGroupDefaultSetResponse({
    required this.accepted
  });

  factory AppRoutingModelGroupDefaultSetResponse.fromJson(Map<String, dynamic> json) {
    return AppRoutingModelGroupDefaultSetResponse(
      accepted: (() {
        final value = json['accepted'];
        if (value is! bool) {
          throw FormatException('AppRoutingModelGroupDefaultSetResponse.accepted is required');
        }
        return value;
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'accepted': accepted,
    };
  }
}

class AppRoutingModelGroupDefaults {
  final List<AppRoutingModelGroupDefault> defaults;

  AppRoutingModelGroupDefaults({
    required this.defaults
  });

  factory AppRoutingModelGroupDefaults.fromJson(Map<String, dynamic> json) {
    return AppRoutingModelGroupDefaults(
      defaults: (() {
        final list = _sdkworkAsList(json['defaults']);
        if (list == null) {
          throw FormatException('AppRoutingModelGroupDefaults.defaults is required');
        }
        return list
            .map((item) => (() {
        final map = _sdkworkAsMap(item);
        return map == null ? null : AppRoutingModelGroupDefault.fromJson(map);
      })())
            .whereType<AppRoutingModelGroupDefault>()
            .toList();
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'defaults': defaults.map((item) => item.toJson()).toList(),
    };
  }
}

class AppRoutingModelGroupDefaultsItemResponse {
  final AppRoutingModelGroupDefaults item;

  AppRoutingModelGroupDefaultsItemResponse({
    required this.item
  });

  factory AppRoutingModelGroupDefaultsItemResponse.fromJson(Map<String, dynamic> json) {
    return AppRoutingModelGroupDefaultsItemResponse(
      item: (() {
        final map = _sdkworkAsMap(json['item']);
        if (map == null) {
          throw FormatException('AppRoutingModelGroupDefaultsItemResponse.item is required');
        }
        return AppRoutingModelGroupDefaults.fromJson(map);
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'item': item.toJson(),
    };
  }
}

class AppRoutingModelGroupOption {
  final String groupCode;
  final String groupId;
  final String groupName;
  final bool isDefault;
  final bool selected;

  AppRoutingModelGroupOption({
    required this.groupCode,
    required this.groupId,
    required this.groupName,
    required this.isDefault,
    required this.selected
  });

  factory AppRoutingModelGroupOption.fromJson(Map<String, dynamic> json) {
    return AppRoutingModelGroupOption(
      groupCode: (() {
        final value = json['groupCode']?.toString();
        if (value == null) {
          throw FormatException('AppRoutingModelGroupOption.groupCode is required');
        }
        return value;
      })(),
      groupId: (() {
        final value = json['groupId']?.toString();
        if (value == null) {
          throw FormatException('AppRoutingModelGroupOption.groupId is required');
        }
        return value;
      })(),
      groupName: (() {
        final value = json['groupName']?.toString();
        if (value == null) {
          throw FormatException('AppRoutingModelGroupOption.groupName is required');
        }
        return value;
      })(),
      isDefault: (() {
        final value = json['isDefault'];
        if (value is! bool) {
          throw FormatException('AppRoutingModelGroupOption.isDefault is required');
        }
        return value;
      })(),
      selected: (() {
        final value = json['selected'];
        if (value is! bool) {
          throw FormatException('AppRoutingModelGroupOption.selected is required');
        }
        return value;
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'groupCode': groupCode,
      'groupId': groupId,
      'groupName': groupName,
      'isDefault': isDefault,
      'selected': selected,
    };
  }
}

class AppRoutingModelGroups {
  final List<AppRoutingModelGroupOption> groups;
  final String model;

  AppRoutingModelGroups({
    required this.groups,
    required this.model
  });

  factory AppRoutingModelGroups.fromJson(Map<String, dynamic> json) {
    return AppRoutingModelGroups(
      groups: (() {
        final list = _sdkworkAsList(json['groups']);
        if (list == null) {
          throw FormatException('AppRoutingModelGroups.groups is required');
        }
        return list
            .map((item) => (() {
        final map = _sdkworkAsMap(item);
        return map == null ? null : AppRoutingModelGroupOption.fromJson(map);
      })())
            .whereType<AppRoutingModelGroupOption>()
            .toList();
      })(),
      model: (() {
        final value = json['model']?.toString();
        if (value == null) {
          throw FormatException('AppRoutingModelGroups.model is required');
        }
        return value;
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'groups': groups.map((item) => item.toJson()).toList(),
      'model': model,
    };
  }
}

class AppRoutingModelGroupsItemResponse {
  final AppRoutingModelGroups item;

  AppRoutingModelGroupsItemResponse({
    required this.item
  });

  factory AppRoutingModelGroupsItemResponse.fromJson(Map<String, dynamic> json) {
    return AppRoutingModelGroupsItemResponse(
      item: (() {
        final map = _sdkworkAsMap(json['item']);
        if (map == null) {
          throw FormatException('AppRoutingModelGroupsItemResponse.item is required');
        }
        return AppRoutingModelGroups.fromJson(map);
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'item': item.toJson(),
    };
  }
}

class AppRoutingModelStats {
  final String lat;
  final String m;
  final String req;
  final String sr;
  final String tok;

  AppRoutingModelStats({
    required this.lat,
    required this.m,
    required this.req,
    required this.sr,
    required this.tok
  });

  factory AppRoutingModelStats.fromJson(Map<String, dynamic> json) {
    return AppRoutingModelStats(
      lat: (() {
        final value = json['lat']?.toString();
        if (value == null) {
          throw FormatException('AppRoutingModelStats.lat is required');
        }
        return value;
      })(),
      m: (() {
        final value = json['m']?.toString();
        if (value == null) {
          throw FormatException('AppRoutingModelStats.m is required');
        }
        return value;
      })(),
      req: (() {
        final value = json['req']?.toString();
        if (value == null) {
          throw FormatException('AppRoutingModelStats.req is required');
        }
        return value;
      })(),
      sr: (() {
        final value = json['sr']?.toString();
        if (value == null) {
          throw FormatException('AppRoutingModelStats.sr is required');
        }
        return value;
      })(),
      tok: (() {
        final value = json['tok']?.toString();
        if (value == null) {
          throw FormatException('AppRoutingModelStats.tok is required');
        }
        return value;
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'lat': lat,
      'm': m,
      'req': req,
      'sr': sr,
      'tok': tok,
    };
  }
}

class AppRoutingRequestTrace {
  final String duration;
  final String endedAt;
  final String errorMessageMasked;
  final String errorType;
  final String httpMethod;
  final String id;
  final String model;
  final String providerErrorCode;
  final String requestBytes;
  final String requestPath;
  final String requestPayloadHash;
  final String responseBytes;
  final String responsePayloadHash;
  final String startedAt;
  final String status;
  final bool streaming;
  final String time;
  final String tokens;
  final String traceId;
  final String upstreamAccountCode;
  final String upstreamAccountGroupCode;
  final String upstreamAccountGroupId;
  final String upstreamAccountGroupName;
  final String upstreamAccountId;
  final String upstreamAccountName;

  AppRoutingRequestTrace({
    required this.duration,
    required this.endedAt,
    required this.errorMessageMasked,
    required this.errorType,
    required this.httpMethod,
    required this.id,
    required this.model,
    required this.providerErrorCode,
    required this.requestBytes,
    required this.requestPath,
    required this.requestPayloadHash,
    required this.responseBytes,
    required this.responsePayloadHash,
    required this.startedAt,
    required this.status,
    required this.streaming,
    required this.time,
    required this.tokens,
    required this.traceId,
    required this.upstreamAccountCode,
    required this.upstreamAccountGroupCode,
    required this.upstreamAccountGroupId,
    required this.upstreamAccountGroupName,
    required this.upstreamAccountId,
    required this.upstreamAccountName
  });

  factory AppRoutingRequestTrace.fromJson(Map<String, dynamic> json) {
    return AppRoutingRequestTrace(
      duration: (() {
        final value = json['duration']?.toString();
        if (value == null) {
          throw FormatException('AppRoutingRequestTrace.duration is required');
        }
        return value;
      })(),
      endedAt: (() {
        final value = json['endedAt']?.toString();
        if (value == null) {
          throw FormatException('AppRoutingRequestTrace.endedAt is required');
        }
        return value;
      })(),
      errorMessageMasked: (() {
        final value = json['errorMessageMasked']?.toString();
        if (value == null) {
          throw FormatException('AppRoutingRequestTrace.errorMessageMasked is required');
        }
        return value;
      })(),
      errorType: (() {
        final value = json['errorType']?.toString();
        if (value == null) {
          throw FormatException('AppRoutingRequestTrace.errorType is required');
        }
        return value;
      })(),
      httpMethod: (() {
        final value = json['httpMethod']?.toString();
        if (value == null) {
          throw FormatException('AppRoutingRequestTrace.httpMethod is required');
        }
        return value;
      })(),
      id: (() {
        final value = json['id']?.toString();
        if (value == null) {
          throw FormatException('AppRoutingRequestTrace.id is required');
        }
        return value;
      })(),
      model: (() {
        final value = json['model']?.toString();
        if (value == null) {
          throw FormatException('AppRoutingRequestTrace.model is required');
        }
        return value;
      })(),
      providerErrorCode: (() {
        final value = json['providerErrorCode']?.toString();
        if (value == null) {
          throw FormatException('AppRoutingRequestTrace.providerErrorCode is required');
        }
        return value;
      })(),
      requestBytes: (() {
        final value = json['requestBytes']?.toString();
        if (value == null) {
          throw FormatException('AppRoutingRequestTrace.requestBytes is required');
        }
        return value;
      })(),
      requestPath: (() {
        final value = json['requestPath']?.toString();
        if (value == null) {
          throw FormatException('AppRoutingRequestTrace.requestPath is required');
        }
        return value;
      })(),
      requestPayloadHash: (() {
        final value = json['requestPayloadHash']?.toString();
        if (value == null) {
          throw FormatException('AppRoutingRequestTrace.requestPayloadHash is required');
        }
        return value;
      })(),
      responseBytes: (() {
        final value = json['responseBytes']?.toString();
        if (value == null) {
          throw FormatException('AppRoutingRequestTrace.responseBytes is required');
        }
        return value;
      })(),
      responsePayloadHash: (() {
        final value = json['responsePayloadHash']?.toString();
        if (value == null) {
          throw FormatException('AppRoutingRequestTrace.responsePayloadHash is required');
        }
        return value;
      })(),
      startedAt: (() {
        final value = json['startedAt']?.toString();
        if (value == null) {
          throw FormatException('AppRoutingRequestTrace.startedAt is required');
        }
        return value;
      })(),
      status: (() {
        final value = json['status']?.toString();
        if (value == null) {
          throw FormatException('AppRoutingRequestTrace.status is required');
        }
        return value;
      })(),
      streaming: (() {
        final value = json['streaming'];
        if (value is! bool) {
          throw FormatException('AppRoutingRequestTrace.streaming is required');
        }
        return value;
      })(),
      time: (() {
        final value = json['time']?.toString();
        if (value == null) {
          throw FormatException('AppRoutingRequestTrace.time is required');
        }
        return value;
      })(),
      tokens: (() {
        final value = json['tokens']?.toString();
        if (value == null) {
          throw FormatException('AppRoutingRequestTrace.tokens is required');
        }
        return value;
      })(),
      traceId: (() {
        final value = json['traceId']?.toString();
        if (value == null) {
          throw FormatException('AppRoutingRequestTrace.traceId is required');
        }
        return value;
      })(),
      upstreamAccountCode: (() {
        final value = json['upstreamAccountCode']?.toString();
        if (value == null) {
          throw FormatException('AppRoutingRequestTrace.upstreamAccountCode is required');
        }
        return value;
      })(),
      upstreamAccountGroupCode: (() {
        final value = json['upstreamAccountGroupCode']?.toString();
        if (value == null) {
          throw FormatException('AppRoutingRequestTrace.upstreamAccountGroupCode is required');
        }
        return value;
      })(),
      upstreamAccountGroupId: (() {
        final value = json['upstreamAccountGroupId']?.toString();
        if (value == null) {
          throw FormatException('AppRoutingRequestTrace.upstreamAccountGroupId is required');
        }
        return value;
      })(),
      upstreamAccountGroupName: (() {
        final value = json['upstreamAccountGroupName']?.toString();
        if (value == null) {
          throw FormatException('AppRoutingRequestTrace.upstreamAccountGroupName is required');
        }
        return value;
      })(),
      upstreamAccountId: (() {
        final value = json['upstreamAccountId']?.toString();
        if (value == null) {
          throw FormatException('AppRoutingRequestTrace.upstreamAccountId is required');
        }
        return value;
      })(),
      upstreamAccountName: (() {
        final value = json['upstreamAccountName']?.toString();
        if (value == null) {
          throw FormatException('AppRoutingRequestTrace.upstreamAccountName is required');
        }
        return value;
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'duration': duration,
      'endedAt': endedAt,
      'errorMessageMasked': errorMessageMasked,
      'errorType': errorType,
      'httpMethod': httpMethod,
      'id': id,
      'model': model,
      'providerErrorCode': providerErrorCode,
      'requestBytes': requestBytes,
      'requestPath': requestPath,
      'requestPayloadHash': requestPayloadHash,
      'responseBytes': responseBytes,
      'responsePayloadHash': responsePayloadHash,
      'startedAt': startedAt,
      'status': status,
      'streaming': streaming,
      'time': time,
      'tokens': tokens,
      'traceId': traceId,
      'upstreamAccountCode': upstreamAccountCode,
      'upstreamAccountGroupCode': upstreamAccountGroupCode,
      'upstreamAccountGroupId': upstreamAccountGroupId,
      'upstreamAccountGroupName': upstreamAccountGroupName,
      'upstreamAccountId': upstreamAccountId,
      'upstreamAccountName': upstreamAccountName,
    };
  }
}

class AppRoutingRequestTraceListResponse {
  final List<AppRoutingRequestTrace> items;
  final PageInfo pageInfo;

  AppRoutingRequestTraceListResponse({
    required this.items,
    required this.pageInfo
  });

  factory AppRoutingRequestTraceListResponse.fromJson(Map<String, dynamic> json) {
    return AppRoutingRequestTraceListResponse(
      items: (() {
        final list = _sdkworkAsList(json['items']);
        if (list == null) {
          throw FormatException('AppRoutingRequestTraceListResponse.items is required');
        }
        return list
            .map((item) => (() {
        final map = _sdkworkAsMap(item);
        return map == null ? null : AppRoutingRequestTrace.fromJson(map);
      })())
            .whereType<AppRoutingRequestTrace>()
            .toList();
      })(),
      pageInfo: (() {
        final map = _sdkworkAsMap(json['pageInfo']);
        if (map == null) {
          throw FormatException('AppRoutingRequestTraceListResponse.pageInfo is required');
        }
        return PageInfo.fromJson(map);
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'items': items.map((item) => item.toJson()).toList(),
      'pageInfo': pageInfo.toJson(),
    };
  }
}

class AppRoutingUsageData {
  final String latency;
  final String requests;
  final String time;

  AppRoutingUsageData({
    required this.latency,
    required this.requests,
    required this.time
  });

  factory AppRoutingUsageData.fromJson(Map<String, dynamic> json) {
    return AppRoutingUsageData(
      latency: (() {
        final value = json['latency']?.toString();
        if (value == null) {
          throw FormatException('AppRoutingUsageData.latency is required');
        }
        return value;
      })(),
      requests: (() {
        final value = json['requests']?.toString();
        if (value == null) {
          throw FormatException('AppRoutingUsageData.requests is required');
        }
        return value;
      })(),
      time: (() {
        final value = json['time']?.toString();
        if (value == null) {
          throw FormatException('AppRoutingUsageData.time is required');
        }
        return value;
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'latency': latency,
      'requests': requests,
      'time': time,
    };
  }
}

class AppRoutingUsageSnapshot {
  final List<AppRoutingUsageData> chartData;
  final List<AppRoutingModelStats> modelStats;

  AppRoutingUsageSnapshot({
    required this.chartData,
    required this.modelStats
  });

  factory AppRoutingUsageSnapshot.fromJson(Map<String, dynamic> json) {
    return AppRoutingUsageSnapshot(
      chartData: (() {
        final list = _sdkworkAsList(json['chartData']);
        if (list == null) {
          throw FormatException('AppRoutingUsageSnapshot.chartData is required');
        }
        return list
            .map((item) => (() {
        final map = _sdkworkAsMap(item);
        return map == null ? null : AppRoutingUsageData.fromJson(map);
      })())
            .whereType<AppRoutingUsageData>()
            .toList();
      })(),
      modelStats: (() {
        final list = _sdkworkAsList(json['modelStats']);
        if (list == null) {
          throw FormatException('AppRoutingUsageSnapshot.modelStats is required');
        }
        return list
            .map((item) => (() {
        final map = _sdkworkAsMap(item);
        return map == null ? null : AppRoutingModelStats.fromJson(map);
      })())
            .whereType<AppRoutingModelStats>()
            .toList();
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'chartData': chartData.map((item) => item.toJson()).toList(),
      'modelStats': modelStats.map((item) => item.toJson()).toList(),
    };
  }
}

class AuthRuntimeRetrieveResult {
  final int code;
  final dynamic data;
  final String traceId;

  AuthRuntimeRetrieveResult({
    required this.code,
    required this.data,
    required this.traceId
  });

  factory AuthRuntimeRetrieveResult.fromJson(Map<String, dynamic> json) {
    return AuthRuntimeRetrieveResult(
      code: (() {
        final value = json['code'];
        if (value is! int) {
          throw FormatException('AuthRuntimeRetrieveResult.code is required');
        }
        return value;
      })(),
      data: json['data'],
      traceId: (() {
        final value = json['traceId']?.toString();
        if (value == null) {
          throw FormatException('AuthRuntimeRetrieveResult.traceId is required');
        }
        return value;
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'code': code,
      'data': data,
      'traceId': traceId,
    };
  }
}

class CompleteRuntimeInvocationRequest {
  final String? errorCode;
  final String? errorMessageMasked;
  final String? errorType;
  final String? exitCode;
  final String? finishReason;
  final String? latencyMs;
  final Map<String, dynamic>? metadata;
  final String? providerConversationId;
  final String? providerResponseId;
  final String? providerSessionId;
  final String? providerStepId;
  final Map<String, dynamic>? responseJson;
  final String? status;
  final String? ttftMs;
  final Map<String, dynamic>? usageJson;

  CompleteRuntimeInvocationRequest({
    this.errorCode,
    this.errorMessageMasked,
    this.errorType,
    this.exitCode,
    this.finishReason,
    this.latencyMs,
    this.metadata,
    this.providerConversationId,
    this.providerResponseId,
    this.providerSessionId,
    this.providerStepId,
    this.responseJson,
    this.status,
    this.ttftMs,
    this.usageJson
  });

  factory CompleteRuntimeInvocationRequest.fromJson(Map<String, dynamic> json) {
    return CompleteRuntimeInvocationRequest(
      errorCode: json['errorCode']?.toString(),
      errorMessageMasked: json['errorMessageMasked']?.toString(),
      errorType: json['errorType']?.toString(),
      exitCode: json['exitCode']?.toString(),
      finishReason: json['finishReason']?.toString(),
      latencyMs: json['latencyMs']?.toString(),
      metadata: (() {
        final map = _sdkworkAsMap(json['metadata']);
        if (map == null) {
          return null;
        }
        final result = <String, String>{};
        map.forEach((key, item) {
          final deserialized = item?.toString();
          if (deserialized is String) {
            result[key] = deserialized;
          }
        });
        return result;
      })(),
      providerConversationId: json['providerConversationId']?.toString(),
      providerResponseId: json['providerResponseId']?.toString(),
      providerSessionId: json['providerSessionId']?.toString(),
      providerStepId: json['providerStepId']?.toString(),
      responseJson: (() {
        final map = _sdkworkAsMap(json['responseJson']);
        if (map == null) {
          return null;
        }
        final result = <String, String>{};
        map.forEach((key, item) {
          final deserialized = item?.toString();
          if (deserialized is String) {
            result[key] = deserialized;
          }
        });
        return result;
      })(),
      status: json['status']?.toString(),
      ttftMs: json['ttftMs']?.toString(),
      usageJson: (() {
        final map = _sdkworkAsMap(json['usageJson']);
        if (map == null) {
          return null;
        }
        final result = <String, String>{};
        map.forEach((key, item) {
          final deserialized = item?.toString();
          if (deserialized is String) {
            result[key] = deserialized;
          }
        });
        return result;
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'errorCode': errorCode,
      'errorMessageMasked': errorMessageMasked,
      'errorType': errorType,
      'exitCode': exitCode,
      'finishReason': finishReason,
      'latencyMs': latencyMs,
      'metadata': metadata?.map((key, item) => MapEntry(key, item)),
      'providerConversationId': providerConversationId,
      'providerResponseId': providerResponseId,
      'providerSessionId': providerSessionId,
      'providerStepId': providerStepId,
      'responseJson': responseJson?.map((key, item) => MapEntry(key, item)),
      'status': status,
      'ttftMs': ttftMs,
      'usageJson': usageJson?.map((key, item) => MapEntry(key, item)),
    };
  }
}

class CreateApiKeyRequest {
  final String? accountGroup;
  final List<String>? accountGroups;
  final Map<String, dynamic>? chain;
  final bool? defaultForRuntime;
  final String expires;
  final List<Map<String, dynamic>>? groupRoutingPolicies;
  final String ipLimit;
  final bool isUnlimitedQuota;
  final List<String> modalities;
  final String name;
  final String quota;

  CreateApiKeyRequest({
    this.accountGroup,
    this.accountGroups,
    this.chain,
    this.defaultForRuntime,
    required this.expires,
    this.groupRoutingPolicies,
    required this.ipLimit,
    required this.isUnlimitedQuota,
    required this.modalities,
    required this.name,
    required this.quota
  });

  factory CreateApiKeyRequest.fromJson(Map<String, dynamic> json) {
    return CreateApiKeyRequest(
      accountGroup: json['accountGroup']?.toString(),
      accountGroups: (() {
        final list = _sdkworkAsList(json['accountGroups']);
        if (list == null) {
          return null;
        }
        return list
            .map((item) => item?.toString())
            .whereType<String>()
            .toList();
      })(),
      chain: _sdkworkAsMap(json['chain']),
      defaultForRuntime: json['defaultForRuntime'] is bool ? json['defaultForRuntime'] : null,
      expires: (() {
        final value = json['expires']?.toString();
        if (value == null) {
          throw FormatException('CreateApiKeyRequest.expires is required');
        }
        return value;
      })(),
      groupRoutingPolicies: (() {
        final list = _sdkworkAsList(json['groupRoutingPolicies']);
        if (list == null) {
          return null;
        }
        return list
            .map((item) => _sdkworkAsMap(item))
            .whereType<Map<String, dynamic>>()
            .toList();
      })(),
      ipLimit: (() {
        final value = json['ipLimit']?.toString();
        if (value == null) {
          throw FormatException('CreateApiKeyRequest.ipLimit is required');
        }
        return value;
      })(),
      isUnlimitedQuota: (() {
        final value = json['isUnlimitedQuota'];
        if (value is! bool) {
          throw FormatException('CreateApiKeyRequest.isUnlimitedQuota is required');
        }
        return value;
      })(),
      modalities: (() {
        final list = _sdkworkAsList(json['modalities']);
        if (list == null) {
          throw FormatException('CreateApiKeyRequest.modalities is required');
        }
        return list
            .map((item) => item?.toString())
            .whereType<String>()
            .toList();
      })(),
      name: (() {
        final value = json['name']?.toString();
        if (value == null) {
          throw FormatException('CreateApiKeyRequest.name is required');
        }
        return value;
      })(),
      quota: (() {
        final value = json['quota']?.toString();
        if (value == null) {
          throw FormatException('CreateApiKeyRequest.quota is required');
        }
        return value;
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'accountGroup': accountGroup,
      'accountGroups': accountGroups?.map((item) => item).toList(),
      'chain': chain,
      'defaultForRuntime': defaultForRuntime,
      'expires': expires,
      'groupRoutingPolicies': groupRoutingPolicies?.map((item) => item).toList(),
      'ipLimit': ipLimit,
      'isUnlimitedQuota': isUnlimitedQuota,
      'modalities': modalities.map((item) => item).toList(),
      'name': name,
      'quota': quota,
    };
  }
}

class CreateApiKeyResponse {
  final AppApiKeyItem item;
  final String rawKey;

  CreateApiKeyResponse({
    required this.item,
    required this.rawKey
  });

  factory CreateApiKeyResponse.fromJson(Map<String, dynamic> json) {
    return CreateApiKeyResponse(
      item: (() {
        final map = _sdkworkAsMap(json['item']);
        if (map == null) {
          throw FormatException('CreateApiKeyResponse.item is required');
        }
        return AppApiKeyItem.fromJson(map);
      })(),
      rawKey: (() {
        final value = json['rawKey']?.toString();
        if (value == null) {
          throw FormatException('CreateApiKeyResponse.rawKey is required');
        }
        return value;
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'item': item.toJson(),
      'rawKey': rawKey,
    };
  }
}

class CreateRuntimeArtifactRequest {
  final String artifactType;
  final Map<String, dynamic>? contentJson;
  final String? contentText;
  final Map<String, dynamic>? metadata;
  final String? mimeType;
  final String? name;
  final MediaResource? resource;
  final String? sha256;
  final String? sizeBytes;
  final String? storageKey;

  CreateRuntimeArtifactRequest({
    required this.artifactType,
    this.contentJson,
    this.contentText,
    this.metadata,
    this.mimeType,
    this.name,
    this.resource,
    this.sha256,
    this.sizeBytes,
    this.storageKey
  });

  factory CreateRuntimeArtifactRequest.fromJson(Map<String, dynamic> json) {
    return CreateRuntimeArtifactRequest(
      artifactType: (() {
        final value = json['artifactType']?.toString();
        if (value == null) {
          throw FormatException('CreateRuntimeArtifactRequest.artifactType is required');
        }
        return value;
      })(),
      contentJson: (() {
        final map = _sdkworkAsMap(json['contentJson']);
        if (map == null) {
          return null;
        }
        final result = <String, String>{};
        map.forEach((key, item) {
          final deserialized = item?.toString();
          if (deserialized is String) {
            result[key] = deserialized;
          }
        });
        return result;
      })(),
      contentText: json['contentText']?.toString(),
      metadata: (() {
        final map = _sdkworkAsMap(json['metadata']);
        if (map == null) {
          return null;
        }
        final result = <String, String>{};
        map.forEach((key, item) {
          final deserialized = item?.toString();
          if (deserialized is String) {
            result[key] = deserialized;
          }
        });
        return result;
      })(),
      mimeType: json['mimeType']?.toString(),
      name: json['name']?.toString(),
      resource: (() {
        final map = _sdkworkAsMap(json['resource']);
        return map == null ? null : MediaResource.fromJson(map);
      })(),
      sha256: json['sha256']?.toString(),
      sizeBytes: json['sizeBytes']?.toString(),
      storageKey: json['storageKey']?.toString()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'artifactType': artifactType,
      'contentJson': contentJson?.map((key, item) => MapEntry(key, item)),
      'contentText': contentText,
      'metadata': metadata?.map((key, item) => MapEntry(key, item)),
      'mimeType': mimeType,
      'name': name,
      'resource': resource?.toJson(),
      'sha256': sha256,
      'sizeBytes': sizeBytes,
      'storageKey': storageKey,
    };
  }
}

class CreateRuntimeEventRequest {
  final String? eventSource;
  final String eventType;
  final Map<String, dynamic>? metadata;
  final Map<String, dynamic>? payloadJson;
  final String? textDelta;

  CreateRuntimeEventRequest({
    this.eventSource,
    required this.eventType,
    this.metadata,
    this.payloadJson,
    this.textDelta
  });

  factory CreateRuntimeEventRequest.fromJson(Map<String, dynamic> json) {
    return CreateRuntimeEventRequest(
      eventSource: json['eventSource']?.toString(),
      eventType: (() {
        final value = json['eventType']?.toString();
        if (value == null) {
          throw FormatException('CreateRuntimeEventRequest.eventType is required');
        }
        return value;
      })(),
      metadata: (() {
        final map = _sdkworkAsMap(json['metadata']);
        if (map == null) {
          return null;
        }
        final result = <String, String>{};
        map.forEach((key, item) {
          final deserialized = item?.toString();
          if (deserialized is String) {
            result[key] = deserialized;
          }
        });
        return result;
      })(),
      payloadJson: (() {
        final map = _sdkworkAsMap(json['payloadJson']);
        if (map == null) {
          return null;
        }
        final result = <String, String>{};
        map.forEach((key, item) {
          final deserialized = item?.toString();
          if (deserialized is String) {
            result[key] = deserialized;
          }
        });
        return result;
      })(),
      textDelta: json['textDelta']?.toString()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'eventSource': eventSource,
      'eventType': eventType,
      'metadata': metadata?.map((key, item) => MapEntry(key, item)),
      'payloadJson': payloadJson?.map((key, item) => MapEntry(key, item)),
      'textDelta': textDelta,
    };
  }
}

class CreateRuntimeInvocationRequest {
  final String? agentRunId;
  final String? agentRunStepId;
  final String? agentSessionId;
  final String? approvalPolicy;
  final String? chatItemId;
  final String? chatTurnId;
  final String? conversationId;
  final String? cwd;
  final String? endpoint;
  final String? invocationType;
  final Map<String, dynamic>? metadata;
  final String? model;
  final String? permissionMode;
  final String? provider;
  final Map<String, dynamic>? requestJson;
  final String runtime;
  final String? sandboxPolicy;
  final String? status;
  final bool? streaming;
  final String? toolCallId;
  final String? toolName;
  final String? traceId;

  CreateRuntimeInvocationRequest({
    this.agentRunId,
    this.agentRunStepId,
    this.agentSessionId,
    this.approvalPolicy,
    this.chatItemId,
    this.chatTurnId,
    this.conversationId,
    this.cwd,
    this.endpoint,
    this.invocationType,
    this.metadata,
    this.model,
    this.permissionMode,
    this.provider,
    this.requestJson,
    required this.runtime,
    this.sandboxPolicy,
    this.status,
    this.streaming,
    this.toolCallId,
    this.toolName,
    this.traceId
  });

  factory CreateRuntimeInvocationRequest.fromJson(Map<String, dynamic> json) {
    return CreateRuntimeInvocationRequest(
      agentRunId: json['agentRunId']?.toString(),
      agentRunStepId: json['agentRunStepId']?.toString(),
      agentSessionId: json['agentSessionId']?.toString(),
      approvalPolicy: json['approvalPolicy']?.toString(),
      chatItemId: json['chatItemId']?.toString(),
      chatTurnId: json['chatTurnId']?.toString(),
      conversationId: json['conversationId']?.toString(),
      cwd: json['cwd']?.toString(),
      endpoint: json['endpoint']?.toString(),
      invocationType: json['invocationType']?.toString(),
      metadata: (() {
        final map = _sdkworkAsMap(json['metadata']);
        if (map == null) {
          return null;
        }
        final result = <String, String>{};
        map.forEach((key, item) {
          final deserialized = item?.toString();
          if (deserialized is String) {
            result[key] = deserialized;
          }
        });
        return result;
      })(),
      model: json['model']?.toString(),
      permissionMode: json['permissionMode']?.toString(),
      provider: json['provider']?.toString(),
      requestJson: (() {
        final map = _sdkworkAsMap(json['requestJson']);
        if (map == null) {
          return null;
        }
        final result = <String, String>{};
        map.forEach((key, item) {
          final deserialized = item?.toString();
          if (deserialized is String) {
            result[key] = deserialized;
          }
        });
        return result;
      })(),
      runtime: (() {
        final value = json['runtime']?.toString();
        if (value == null) {
          throw FormatException('CreateRuntimeInvocationRequest.runtime is required');
        }
        return value;
      })(),
      sandboxPolicy: json['sandboxPolicy']?.toString(),
      status: json['status']?.toString(),
      streaming: json['streaming'] is bool ? json['streaming'] : null,
      toolCallId: json['toolCallId']?.toString(),
      toolName: json['toolName']?.toString(),
      traceId: json['traceId']?.toString()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'agentRunId': agentRunId,
      'agentRunStepId': agentRunStepId,
      'agentSessionId': agentSessionId,
      'approvalPolicy': approvalPolicy,
      'chatItemId': chatItemId,
      'chatTurnId': chatTurnId,
      'conversationId': conversationId,
      'cwd': cwd,
      'endpoint': endpoint,
      'invocationType': invocationType,
      'metadata': metadata?.map((key, item) => MapEntry(key, item)),
      'model': model,
      'permissionMode': permissionMode,
      'provider': provider,
      'requestJson': requestJson?.map((key, item) => MapEntry(key, item)),
      'runtime': runtime,
      'sandboxPolicy': sandboxPolicy,
      'status': status,
      'streaming': streaming,
      'toolCallId': toolCallId,
      'toolName': toolName,
      'traceId': traceId,
    };
  }
}

class DashboardAnnouncement {
  final String id;
  final String text;
  final String time;
  final String type;

  DashboardAnnouncement({
    required this.id,
    required this.text,
    required this.time,
    required this.type
  });

  factory DashboardAnnouncement.fromJson(Map<String, dynamic> json) {
    return DashboardAnnouncement(
      id: (() {
        final value = json['id']?.toString();
        if (value == null) {
          throw FormatException('DashboardAnnouncement.id is required');
        }
        return value;
      })(),
      text: (() {
        final value = json['text']?.toString();
        if (value == null) {
          throw FormatException('DashboardAnnouncement.text is required');
        }
        return value;
      })(),
      time: (() {
        final value = json['time']?.toString();
        if (value == null) {
          throw FormatException('DashboardAnnouncement.time is required');
        }
        return value;
      })(),
      type: (() {
        final value = json['type']?.toString();
        if (value == null) {
          throw FormatException('DashboardAnnouncement.type is required');
        }
        return value;
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'id': id,
      'text': text,
      'time': time,
      'type': type,
    };
  }
}

class DashboardChartPoint {
  final double audioWhisper;
  final double audioWhisperCost;
  final double imageMidjourneyDallE;
  final double imageMidjourneyDallECost;
  final double llmText;
  final double llmTextCost;
  final double musicSuno;
  final double musicSunoCost;
  final String time;
  final double videoRunwaySora;
  final double videoRunwaySoraCost;

  DashboardChartPoint({
    required this.audioWhisper,
    required this.audioWhisperCost,
    required this.imageMidjourneyDallE,
    required this.imageMidjourneyDallECost,
    required this.llmText,
    required this.llmTextCost,
    required this.musicSuno,
    required this.musicSunoCost,
    required this.time,
    required this.videoRunwaySora,
    required this.videoRunwaySoraCost
  });

  factory DashboardChartPoint.fromJson(Map<String, dynamic> json) {
    return DashboardChartPoint(
      audioWhisper: (() {
        final value = json['audio (Whisper)'];
        if (value is! num) {
          throw FormatException('DashboardChartPoint.audio (Whisper) is required');
        }
        return value.toDouble();
      })(),
      audioWhisperCost: (() {
        final value = json['audio (Whisper) cost'];
        if (value is! num) {
          throw FormatException('DashboardChartPoint.audio (Whisper) cost is required');
        }
        return value.toDouble();
      })(),
      imageMidjourneyDallE: (() {
        final value = json['image (Midjourney/DALL-E)'];
        if (value is! num) {
          throw FormatException('DashboardChartPoint.image (Midjourney/DALL-E) is required');
        }
        return value.toDouble();
      })(),
      imageMidjourneyDallECost: (() {
        final value = json['image (Midjourney/DALL-E) cost'];
        if (value is! num) {
          throw FormatException('DashboardChartPoint.image (Midjourney/DALL-E) cost is required');
        }
        return value.toDouble();
      })(),
      llmText: (() {
        final value = json['llm (Text)'];
        if (value is! num) {
          throw FormatException('DashboardChartPoint.llm (Text) is required');
        }
        return value.toDouble();
      })(),
      llmTextCost: (() {
        final value = json['llm (Text) cost'];
        if (value is! num) {
          throw FormatException('DashboardChartPoint.llm (Text) cost is required');
        }
        return value.toDouble();
      })(),
      musicSuno: (() {
        final value = json['music (Suno)'];
        if (value is! num) {
          throw FormatException('DashboardChartPoint.music (Suno) is required');
        }
        return value.toDouble();
      })(),
      musicSunoCost: (() {
        final value = json['music (Suno) cost'];
        if (value is! num) {
          throw FormatException('DashboardChartPoint.music (Suno) cost is required');
        }
        return value.toDouble();
      })(),
      time: (() {
        final value = json['time']?.toString();
        if (value == null) {
          throw FormatException('DashboardChartPoint.time is required');
        }
        return value;
      })(),
      videoRunwaySora: (() {
        final value = json['video (Runway/Sora)'];
        if (value is! num) {
          throw FormatException('DashboardChartPoint.video (Runway/Sora) is required');
        }
        return value.toDouble();
      })(),
      videoRunwaySoraCost: (() {
        final value = json['video (Runway/Sora) cost'];
        if (value is! num) {
          throw FormatException('DashboardChartPoint.video (Runway/Sora) cost is required');
        }
        return value.toDouble();
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'audio (Whisper)': audioWhisper,
      'audio (Whisper) cost': audioWhisperCost,
      'image (Midjourney/DALL-E)': imageMidjourneyDallE,
      'image (Midjourney/DALL-E) cost': imageMidjourneyDallECost,
      'llm (Text)': llmText,
      'llm (Text) cost': llmTextCost,
      'music (Suno)': musicSuno,
      'music (Suno) cost': musicSunoCost,
      'time': time,
      'video (Runway/Sora)': videoRunwaySora,
      'video (Runway/Sora) cost': videoRunwaySoraCost,
    };
  }
}

class DashboardConfigurationDomain {
  final String domain;
  final String id;
  final String ip;
  final String name;
  final String remark;
  final String status;

  DashboardConfigurationDomain({
    required this.domain,
    required this.id,
    required this.ip,
    required this.name,
    required this.remark,
    required this.status
  });

  factory DashboardConfigurationDomain.fromJson(Map<String, dynamic> json) {
    return DashboardConfigurationDomain(
      domain: (() {
        final value = json['domain']?.toString();
        if (value == null) {
          throw FormatException('DashboardConfigurationDomain.domain is required');
        }
        return value;
      })(),
      id: (() {
        final value = json['id']?.toString();
        if (value == null) {
          throw FormatException('DashboardConfigurationDomain.id is required');
        }
        return value;
      })(),
      ip: (() {
        final value = json['ip']?.toString();
        if (value == null) {
          throw FormatException('DashboardConfigurationDomain.ip is required');
        }
        return value;
      })(),
      name: (() {
        final value = json['name']?.toString();
        if (value == null) {
          throw FormatException('DashboardConfigurationDomain.name is required');
        }
        return value;
      })(),
      remark: (() {
        final value = json['remark']?.toString();
        if (value == null) {
          throw FormatException('DashboardConfigurationDomain.remark is required');
        }
        return value;
      })(),
      status: (() {
        final value = json['status']?.toString();
        if (value == null) {
          throw FormatException('DashboardConfigurationDomain.status is required');
        }
        return value;
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'domain': domain,
      'id': id,
      'ip': ip,
      'name': name,
      'remark': remark,
      'status': status,
    };
  }
}

class DashboardModalityDistribution {
  final String modality;
  final String requests;

  DashboardModalityDistribution({
    required this.modality,
    required this.requests
  });

  factory DashboardModalityDistribution.fromJson(Map<String, dynamic> json) {
    return DashboardModalityDistribution(
      modality: (() {
        final value = json['modality']?.toString();
        if (value == null) {
          throw FormatException('DashboardModalityDistribution.modality is required');
        }
        return value;
      })(),
      requests: (() {
        final value = json['requests']?.toString();
        if (value == null) {
          throw FormatException('DashboardModalityDistribution.requests is required');
        }
        return value;
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'modality': modality,
      'requests': requests,
    };
  }
}

class DashboardOverviewResponse {
  final List<DashboardAnnouncement> announcements;
  final List<DashboardChartPoint> chartData;
  final List<DashboardConfigurationDomain>? configurationDomains;
  final List<DashboardModalityDistribution> modalityDistribution;
  final List<DashboardSparklinePoint> multimodalSparkline;
  final List<DashboardSparklinePoint> performanceSparkline;
  final List<DashboardSparklinePoint> requestSparkline;
  final DashboardOverviewSummary summary;
  final List<DashboardTopModel> topModels;
  final List<String> warnings;

  DashboardOverviewResponse({
    required this.announcements,
    required this.chartData,
    this.configurationDomains,
    required this.modalityDistribution,
    required this.multimodalSparkline,
    required this.performanceSparkline,
    required this.requestSparkline,
    required this.summary,
    required this.topModels,
    required this.warnings
  });

  factory DashboardOverviewResponse.fromJson(Map<String, dynamic> json) {
    return DashboardOverviewResponse(
      announcements: (() {
        final list = _sdkworkAsList(json['announcements']);
        if (list == null) {
          throw FormatException('DashboardOverviewResponse.announcements is required');
        }
        return list
            .map((item) => (() {
        final map = _sdkworkAsMap(item);
        return map == null ? null : DashboardAnnouncement.fromJson(map);
      })())
            .whereType<DashboardAnnouncement>()
            .toList();
      })(),
      chartData: (() {
        final list = _sdkworkAsList(json['chartData']);
        if (list == null) {
          throw FormatException('DashboardOverviewResponse.chartData is required');
        }
        return list
            .map((item) => (() {
        final map = _sdkworkAsMap(item);
        return map == null ? null : DashboardChartPoint.fromJson(map);
      })())
            .whereType<DashboardChartPoint>()
            .toList();
      })(),
      configurationDomains: (() {
        final list = _sdkworkAsList(json['configurationDomains']);
        if (list == null) {
          return null;
        }
        return list
            .map((item) => (() {
        final map = _sdkworkAsMap(item);
        return map == null ? null : DashboardConfigurationDomain.fromJson(map);
      })())
            .whereType<DashboardConfigurationDomain>()
            .toList();
      })(),
      modalityDistribution: (() {
        final list = _sdkworkAsList(json['modalityDistribution']);
        if (list == null) {
          throw FormatException('DashboardOverviewResponse.modalityDistribution is required');
        }
        return list
            .map((item) => (() {
        final map = _sdkworkAsMap(item);
        return map == null ? null : DashboardModalityDistribution.fromJson(map);
      })())
            .whereType<DashboardModalityDistribution>()
            .toList();
      })(),
      multimodalSparkline: (() {
        final list = _sdkworkAsList(json['multimodalSparkline']);
        if (list == null) {
          throw FormatException('DashboardOverviewResponse.multimodalSparkline is required');
        }
        return list
            .map((item) => (() {
        final map = _sdkworkAsMap(item);
        return map == null ? null : DashboardSparklinePoint.fromJson(map);
      })())
            .whereType<DashboardSparklinePoint>()
            .toList();
      })(),
      performanceSparkline: (() {
        final list = _sdkworkAsList(json['performanceSparkline']);
        if (list == null) {
          throw FormatException('DashboardOverviewResponse.performanceSparkline is required');
        }
        return list
            .map((item) => (() {
        final map = _sdkworkAsMap(item);
        return map == null ? null : DashboardSparklinePoint.fromJson(map);
      })())
            .whereType<DashboardSparklinePoint>()
            .toList();
      })(),
      requestSparkline: (() {
        final list = _sdkworkAsList(json['requestSparkline']);
        if (list == null) {
          throw FormatException('DashboardOverviewResponse.requestSparkline is required');
        }
        return list
            .map((item) => (() {
        final map = _sdkworkAsMap(item);
        return map == null ? null : DashboardSparklinePoint.fromJson(map);
      })())
            .whereType<DashboardSparklinePoint>()
            .toList();
      })(),
      summary: (() {
        final map = _sdkworkAsMap(json['summary']);
        if (map == null) {
          throw FormatException('DashboardOverviewResponse.summary is required');
        }
        return DashboardOverviewSummary.fromJson(map);
      })(),
      topModels: (() {
        final list = _sdkworkAsList(json['topModels']);
        if (list == null) {
          throw FormatException('DashboardOverviewResponse.topModels is required');
        }
        return list
            .map((item) => (() {
        final map = _sdkworkAsMap(item);
        return map == null ? null : DashboardTopModel.fromJson(map);
      })())
            .whereType<DashboardTopModel>()
            .toList();
      })(),
      warnings: (() {
        final list = _sdkworkAsList(json['warnings']);
        if (list == null) {
          throw FormatException('DashboardOverviewResponse.warnings is required');
        }
        return list
            .map((item) => item?.toString())
            .whereType<String>()
            .toList();
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'announcements': announcements.map((item) => item.toJson()).toList(),
      'chartData': chartData.map((item) => item.toJson()).toList(),
      'configurationDomains': configurationDomains?.map((item) => item.toJson()).toList(),
      'modalityDistribution': modalityDistribution.map((item) => item.toJson()).toList(),
      'multimodalSparkline': multimodalSparkline.map((item) => item.toJson()).toList(),
      'performanceSparkline': performanceSparkline.map((item) => item.toJson()).toList(),
      'requestSparkline': requestSparkline.map((item) => item.toJson()).toList(),
      'summary': summary.toJson(),
      'topModels': topModels.map((item) => item.toJson()).toList(),
      'warnings': warnings.map((item) => item).toList(),
    };
  }
}

class DashboardOverviewRetrieveResult {
  final int code;
  final dynamic data;
  final String traceId;

  DashboardOverviewRetrieveResult({
    required this.code,
    required this.data,
    required this.traceId
  });

  factory DashboardOverviewRetrieveResult.fromJson(Map<String, dynamic> json) {
    return DashboardOverviewRetrieveResult(
      code: (() {
        final value = json['code'];
        if (value is! int) {
          throw FormatException('DashboardOverviewRetrieveResult.code is required');
        }
        return value;
      })(),
      data: json['data'],
      traceId: (() {
        final value = json['traceId']?.toString();
        if (value == null) {
          throw FormatException('DashboardOverviewRetrieveResult.traceId is required');
        }
        return value;
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'code': code,
      'data': data,
      'traceId': traceId,
    };
  }
}

class DashboardOverviewSummary {
  final String audioRequests;
  final double availableCredits;
  final String errorCount;
  final String imageRequests;
  final String musicRequests;
  final String requestCount;
  final double rpm;
  final String totalRequestCount;
  final double totalUsedCredits;
  final double tpm;
  final double usedCredits;
  final String videoRequests;

  DashboardOverviewSummary({
    required this.audioRequests,
    required this.availableCredits,
    required this.errorCount,
    required this.imageRequests,
    required this.musicRequests,
    required this.requestCount,
    required this.rpm,
    required this.totalRequestCount,
    required this.totalUsedCredits,
    required this.tpm,
    required this.usedCredits,
    required this.videoRequests
  });

  factory DashboardOverviewSummary.fromJson(Map<String, dynamic> json) {
    return DashboardOverviewSummary(
      audioRequests: (() {
        final value = json['audioRequests']?.toString();
        if (value == null) {
          throw FormatException('DashboardOverviewSummary.audioRequests is required');
        }
        return value;
      })(),
      availableCredits: (() {
        final value = json['availableCredits'];
        if (value is! num) {
          throw FormatException('DashboardOverviewSummary.availableCredits is required');
        }
        return value.toDouble();
      })(),
      errorCount: (() {
        final value = json['errorCount']?.toString();
        if (value == null) {
          throw FormatException('DashboardOverviewSummary.errorCount is required');
        }
        return value;
      })(),
      imageRequests: (() {
        final value = json['imageRequests']?.toString();
        if (value == null) {
          throw FormatException('DashboardOverviewSummary.imageRequests is required');
        }
        return value;
      })(),
      musicRequests: (() {
        final value = json['musicRequests']?.toString();
        if (value == null) {
          throw FormatException('DashboardOverviewSummary.musicRequests is required');
        }
        return value;
      })(),
      requestCount: (() {
        final value = json['requestCount']?.toString();
        if (value == null) {
          throw FormatException('DashboardOverviewSummary.requestCount is required');
        }
        return value;
      })(),
      rpm: (() {
        final value = json['rpm'];
        if (value is! num) {
          throw FormatException('DashboardOverviewSummary.rpm is required');
        }
        return value.toDouble();
      })(),
      totalRequestCount: (() {
        final value = json['totalRequestCount']?.toString();
        if (value == null) {
          throw FormatException('DashboardOverviewSummary.totalRequestCount is required');
        }
        return value;
      })(),
      totalUsedCredits: (() {
        final value = json['totalUsedCredits'];
        if (value is! num) {
          throw FormatException('DashboardOverviewSummary.totalUsedCredits is required');
        }
        return value.toDouble();
      })(),
      tpm: (() {
        final value = json['tpm'];
        if (value is! num) {
          throw FormatException('DashboardOverviewSummary.tpm is required');
        }
        return value.toDouble();
      })(),
      usedCredits: (() {
        final value = json['usedCredits'];
        if (value is! num) {
          throw FormatException('DashboardOverviewSummary.usedCredits is required');
        }
        return value.toDouble();
      })(),
      videoRequests: (() {
        final value = json['videoRequests']?.toString();
        if (value == null) {
          throw FormatException('DashboardOverviewSummary.videoRequests is required');
        }
        return value;
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'audioRequests': audioRequests,
      'availableCredits': availableCredits,
      'errorCount': errorCount,
      'imageRequests': imageRequests,
      'musicRequests': musicRequests,
      'requestCount': requestCount,
      'rpm': rpm,
      'totalRequestCount': totalRequestCount,
      'totalUsedCredits': totalUsedCredits,
      'tpm': tpm,
      'usedCredits': usedCredits,
      'videoRequests': videoRequests,
    };
  }
}

class DashboardSparklinePoint {
  final double value;

  DashboardSparklinePoint({
    required this.value
  });

  factory DashboardSparklinePoint.fromJson(Map<String, dynamic> json) {
    return DashboardSparklinePoint(
      value: (() {
        final value = json['value'];
        if (value is! num) {
          throw FormatException('DashboardSparklinePoint.value is required');
        }
        return value.toDouble();
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'value': value,
    };
  }
}

class DashboardTopModel {
  final double cost;
  final bool isUp;
  final String modality;
  final String name;
  final String rank;
  final String requests;
  final String supplier;
  final String trend;

  DashboardTopModel({
    required this.cost,
    required this.isUp,
    required this.modality,
    required this.name,
    required this.rank,
    required this.requests,
    required this.supplier,
    required this.trend
  });

  factory DashboardTopModel.fromJson(Map<String, dynamic> json) {
    return DashboardTopModel(
      cost: (() {
        final value = json['cost'];
        if (value is! num) {
          throw FormatException('DashboardTopModel.cost is required');
        }
        return value.toDouble();
      })(),
      isUp: (() {
        final value = json['isUp'];
        if (value is! bool) {
          throw FormatException('DashboardTopModel.isUp is required');
        }
        return value;
      })(),
      modality: (() {
        final value = json['modality']?.toString();
        if (value == null) {
          throw FormatException('DashboardTopModel.modality is required');
        }
        return value;
      })(),
      name: (() {
        final value = json['name']?.toString();
        if (value == null) {
          throw FormatException('DashboardTopModel.name is required');
        }
        return value;
      })(),
      rank: (() {
        final value = json['rank']?.toString();
        if (value == null) {
          throw FormatException('DashboardTopModel.rank is required');
        }
        return value;
      })(),
      requests: (() {
        final value = json['requests']?.toString();
        if (value == null) {
          throw FormatException('DashboardTopModel.requests is required');
        }
        return value;
      })(),
      supplier: (() {
        final value = json['supplier']?.toString();
        if (value == null) {
          throw FormatException('DashboardTopModel.supplier is required');
        }
        return value;
      })(),
      trend: (() {
        final value = json['trend']?.toString();
        if (value == null) {
          throw FormatException('DashboardTopModel.trend is required');
        }
        return value;
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'cost': cost,
      'isUp': isUp,
      'modality': modality,
      'name': name,
      'rank': rank,
      'requests': requests,
      'supplier': supplier,
      'trend': trend,
    };
  }
}

class FieldError {
  final int? code;
  final String field;
  final String? i18nKey;
  final String message;
  final Map<String, dynamic>? params;

  FieldError({
    this.code,
    required this.field,
    this.i18nKey,
    required this.message,
    this.params
  });

  factory FieldError.fromJson(Map<String, dynamic> json) {
    return FieldError(
      code: json['code'] is int ? json['code'] : null,
      field: (() {
        final value = json['field']?.toString();
        if (value == null) {
          throw FormatException('FieldError.field is required');
        }
        return value;
      })(),
      i18nKey: json['i18nKey']?.toString(),
      message: (() {
        final value = json['message']?.toString();
        if (value == null) {
          throw FormatException('FieldError.message is required');
        }
        return value;
      })(),
      params: (() {
        final map = _sdkworkAsMap(json['params']);
        if (map == null) {
          return null;
        }
        final result = <String, String>{};
        map.forEach((key, item) {
          final deserialized = item?.toString();
          if (deserialized is String) {
            result[key] = deserialized;
          }
        });
        return result;
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'code': code,
      'field': field,
      'i18nKey': i18nKey,
      'message': message,
      'params': params?.map((key, item) => MapEntry(key, item)),
    };
  }
}

class GatewayTrace {
  final String duration;
  final String endpoint;
  final String id;
  final String ip;
  final String method;
  final int status;
  final String time;
  final String upstreamAccount;

  GatewayTrace({
    required this.duration,
    required this.endpoint,
    required this.id,
    required this.ip,
    required this.method,
    required this.status,
    required this.time,
    required this.upstreamAccount
  });

  factory GatewayTrace.fromJson(Map<String, dynamic> json) {
    return GatewayTrace(
      duration: (() {
        final value = json['duration']?.toString();
        if (value == null) {
          throw FormatException('GatewayTrace.duration is required');
        }
        return value;
      })(),
      endpoint: (() {
        final value = json['endpoint']?.toString();
        if (value == null) {
          throw FormatException('GatewayTrace.endpoint is required');
        }
        return value;
      })(),
      id: (() {
        final value = json['id']?.toString();
        if (value == null) {
          throw FormatException('GatewayTrace.id is required');
        }
        return value;
      })(),
      ip: (() {
        final value = json['ip']?.toString();
        if (value == null) {
          throw FormatException('GatewayTrace.ip is required');
        }
        return value;
      })(),
      method: (() {
        final value = json['method']?.toString();
        if (value == null) {
          throw FormatException('GatewayTrace.method is required');
        }
        return value;
      })(),
      status: (() {
        final value = json['status'];
        if (value is! int) {
          throw FormatException('GatewayTrace.status is required');
        }
        return value;
      })(),
      time: (() {
        final value = json['time']?.toString();
        if (value == null) {
          throw FormatException('GatewayTrace.time is required');
        }
        return value;
      })(),
      upstreamAccount: (() {
        final value = json['upstreamAccount']?.toString();
        if (value == null) {
          throw FormatException('GatewayTrace.upstreamAccount is required');
        }
        return value;
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'duration': duration,
      'endpoint': endpoint,
      'id': id,
      'ip': ip,
      'method': method,
      'status': status,
      'time': time,
      'upstreamAccount': upstreamAccount,
    };
  }
}

class GatewayTracesListResult {
  final int code;
  final dynamic data;
  final String traceId;

  GatewayTracesListResult({
    required this.code,
    required this.data,
    required this.traceId
  });

  factory GatewayTracesListResult.fromJson(Map<String, dynamic> json) {
    return GatewayTracesListResult(
      code: (() {
        final value = json['code'];
        if (value is! int) {
          throw FormatException('GatewayTracesListResult.code is required');
        }
        return value;
      })(),
      data: json['data'],
      traceId: (() {
        final value = json['traceId']?.toString();
        if (value == null) {
          throw FormatException('GatewayTracesListResult.traceId is required');
        }
        return value;
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'code': code,
      'data': data,
      'traceId': traceId,
    };
  }
}

class GatewayTracesPage {
  final List<GatewayTrace> items;
  final PageInfo pageInfo;

  GatewayTracesPage({
    required this.items,
    required this.pageInfo
  });

  factory GatewayTracesPage.fromJson(Map<String, dynamic> json) {
    return GatewayTracesPage(
      items: (() {
        final list = _sdkworkAsList(json['items']);
        if (list == null) {
          throw FormatException('GatewayTracesPage.items is required');
        }
        return list
            .map((item) => (() {
        final map = _sdkworkAsMap(item);
        return map == null ? null : GatewayTrace.fromJson(map);
      })())
            .whereType<GatewayTrace>()
            .toList();
      })(),
      pageInfo: (() {
        final map = _sdkworkAsMap(json['pageInfo']);
        if (map == null) {
          throw FormatException('GatewayTracesPage.pageInfo is required');
        }
        return PageInfo.fromJson(map);
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'items': items.map((item) => item.toJson()).toList(),
      'pageInfo': pageInfo.toJson(),
    };
  }
}

class InvitePolicyRetrieveResult {
  final int code;
  final dynamic data;
  final String traceId;

  InvitePolicyRetrieveResult({
    required this.code,
    required this.data,
    required this.traceId
  });

  factory InvitePolicyRetrieveResult.fromJson(Map<String, dynamic> json) {
    return InvitePolicyRetrieveResult(
      code: (() {
        final value = json['code'];
        if (value is! int) {
          throw FormatException('InvitePolicyRetrieveResult.code is required');
        }
        return value;
      })(),
      data: json['data'],
      traceId: (() {
        final value = json['traceId']?.toString();
        if (value == null) {
          throw FormatException('InvitePolicyRetrieveResult.traceId is required');
        }
        return value;
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'code': code,
      'data': data,
      'traceId': traceId,
    };
  }
}

class InvitesClaimCreateResult {
  final int code;
  final dynamic data;
  final String traceId;

  InvitesClaimCreateResult({
    required this.code,
    required this.data,
    required this.traceId
  });

  factory InvitesClaimCreateResult.fromJson(Map<String, dynamic> json) {
    return InvitesClaimCreateResult(
      code: (() {
        final value = json['code'];
        if (value is! int) {
          throw FormatException('InvitesClaimCreateResult.code is required');
        }
        return value;
      })(),
      data: json['data'],
      traceId: (() {
        final value = json['traceId']?.toString();
        if (value == null) {
          throw FormatException('InvitesClaimCreateResult.traceId is required');
        }
        return value;
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'code': code,
      'data': data,
      'traceId': traceId,
    };
  }
}

class InvitesValidateCreateResult {
  final int code;
  final dynamic data;
  final String traceId;

  InvitesValidateCreateResult({
    required this.code,
    required this.data,
    required this.traceId
  });

  factory InvitesValidateCreateResult.fromJson(Map<String, dynamic> json) {
    return InvitesValidateCreateResult(
      code: (() {
        final value = json['code'];
        if (value is! int) {
          throw FormatException('InvitesValidateCreateResult.code is required');
        }
        return value;
      })(),
      data: json['data'],
      traceId: (() {
        final value = json['traceId']?.toString();
        if (value == null) {
          throw FormatException('InvitesValidateCreateResult.traceId is required');
        }
        return value;
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'code': code,
      'data': data,
      'traceId': traceId,
    };
  }
}

class InvocationsArtifactsCreateResult {
  final int code;
  final dynamic data;
  final String traceId;

  InvocationsArtifactsCreateResult({
    required this.code,
    required this.data,
    required this.traceId
  });

  factory InvocationsArtifactsCreateResult.fromJson(Map<String, dynamic> json) {
    return InvocationsArtifactsCreateResult(
      code: (() {
        final value = json['code'];
        if (value is! int) {
          throw FormatException('InvocationsArtifactsCreateResult.code is required');
        }
        return value;
      })(),
      data: json['data'],
      traceId: (() {
        final value = json['traceId']?.toString();
        if (value == null) {
          throw FormatException('InvocationsArtifactsCreateResult.traceId is required');
        }
        return value;
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'code': code,
      'data': data,
      'traceId': traceId,
    };
  }
}

class InvocationsArtifactsListResult {
  final int code;
  final dynamic data;
  final String traceId;

  InvocationsArtifactsListResult({
    required this.code,
    required this.data,
    required this.traceId
  });

  factory InvocationsArtifactsListResult.fromJson(Map<String, dynamic> json) {
    return InvocationsArtifactsListResult(
      code: (() {
        final value = json['code'];
        if (value is! int) {
          throw FormatException('InvocationsArtifactsListResult.code is required');
        }
        return value;
      })(),
      data: json['data'],
      traceId: (() {
        final value = json['traceId']?.toString();
        if (value == null) {
          throw FormatException('InvocationsArtifactsListResult.traceId is required');
        }
        return value;
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'code': code,
      'data': data,
      'traceId': traceId,
    };
  }
}

class InvocationsCompletionsCreateResult {
  final int code;
  final dynamic data;
  final String traceId;

  InvocationsCompletionsCreateResult({
    required this.code,
    required this.data,
    required this.traceId
  });

  factory InvocationsCompletionsCreateResult.fromJson(Map<String, dynamic> json) {
    return InvocationsCompletionsCreateResult(
      code: (() {
        final value = json['code'];
        if (value is! int) {
          throw FormatException('InvocationsCompletionsCreateResult.code is required');
        }
        return value;
      })(),
      data: json['data'],
      traceId: (() {
        final value = json['traceId']?.toString();
        if (value == null) {
          throw FormatException('InvocationsCompletionsCreateResult.traceId is required');
        }
        return value;
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'code': code,
      'data': data,
      'traceId': traceId,
    };
  }
}

class InvocationsCreateResult {
  final int code;
  final dynamic data;
  final String traceId;

  InvocationsCreateResult({
    required this.code,
    required this.data,
    required this.traceId
  });

  factory InvocationsCreateResult.fromJson(Map<String, dynamic> json) {
    return InvocationsCreateResult(
      code: (() {
        final value = json['code'];
        if (value is! int) {
          throw FormatException('InvocationsCreateResult.code is required');
        }
        return value;
      })(),
      data: json['data'],
      traceId: (() {
        final value = json['traceId']?.toString();
        if (value == null) {
          throw FormatException('InvocationsCreateResult.traceId is required');
        }
        return value;
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'code': code,
      'data': data,
      'traceId': traceId,
    };
  }
}

class InvocationsEventsCreateResult {
  final int code;
  final dynamic data;
  final String traceId;

  InvocationsEventsCreateResult({
    required this.code,
    required this.data,
    required this.traceId
  });

  factory InvocationsEventsCreateResult.fromJson(Map<String, dynamic> json) {
    return InvocationsEventsCreateResult(
      code: (() {
        final value = json['code'];
        if (value is! int) {
          throw FormatException('InvocationsEventsCreateResult.code is required');
        }
        return value;
      })(),
      data: json['data'],
      traceId: (() {
        final value = json['traceId']?.toString();
        if (value == null) {
          throw FormatException('InvocationsEventsCreateResult.traceId is required');
        }
        return value;
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'code': code,
      'data': data,
      'traceId': traceId,
    };
  }
}

class InvocationsEventsListResult {
  final int code;
  final dynamic data;
  final String traceId;

  InvocationsEventsListResult({
    required this.code,
    required this.data,
    required this.traceId
  });

  factory InvocationsEventsListResult.fromJson(Map<String, dynamic> json) {
    return InvocationsEventsListResult(
      code: (() {
        final value = json['code'];
        if (value is! int) {
          throw FormatException('InvocationsEventsListResult.code is required');
        }
        return value;
      })(),
      data: json['data'],
      traceId: (() {
        final value = json['traceId']?.toString();
        if (value == null) {
          throw FormatException('InvocationsEventsListResult.traceId is required');
        }
        return value;
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'code': code,
      'data': data,
      'traceId': traceId,
    };
  }
}

class InvocationsEventsStreamRetrieveResult {
  final int code;
  final dynamic data;
  final String traceId;

  InvocationsEventsStreamRetrieveResult({
    required this.code,
    required this.data,
    required this.traceId
  });

  factory InvocationsEventsStreamRetrieveResult.fromJson(Map<String, dynamic> json) {
    return InvocationsEventsStreamRetrieveResult(
      code: (() {
        final value = json['code'];
        if (value is! int) {
          throw FormatException('InvocationsEventsStreamRetrieveResult.code is required');
        }
        return value;
      })(),
      data: json['data'],
      traceId: (() {
        final value = json['traceId']?.toString();
        if (value == null) {
          throw FormatException('InvocationsEventsStreamRetrieveResult.traceId is required');
        }
        return value;
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'code': code,
      'data': data,
      'traceId': traceId,
    };
  }
}

class InvocationsListResult {
  final int code;
  final dynamic data;
  final String traceId;

  InvocationsListResult({
    required this.code,
    required this.data,
    required this.traceId
  });

  factory InvocationsListResult.fromJson(Map<String, dynamic> json) {
    return InvocationsListResult(
      code: (() {
        final value = json['code'];
        if (value is! int) {
          throw FormatException('InvocationsListResult.code is required');
        }
        return value;
      })(),
      data: json['data'],
      traceId: (() {
        final value = json['traceId']?.toString();
        if (value == null) {
          throw FormatException('InvocationsListResult.traceId is required');
        }
        return value;
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'code': code,
      'data': data,
      'traceId': traceId,
    };
  }
}

class InvocationsRetrieveResult {
  final int code;
  final dynamic data;
  final String traceId;

  InvocationsRetrieveResult({
    required this.code,
    required this.data,
    required this.traceId
  });

  factory InvocationsRetrieveResult.fromJson(Map<String, dynamic> json) {
    return InvocationsRetrieveResult(
      code: (() {
        final value = json['code'];
        if (value is! int) {
          throw FormatException('InvocationsRetrieveResult.code is required');
        }
        return value;
      })(),
      data: json['data'],
      traceId: (() {
        final value = json['traceId']?.toString();
        if (value == null) {
          throw FormatException('InvocationsRetrieveResult.traceId is required');
        }
        return value;
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'code': code,
      'data': data,
      'traceId': traceId,
    };
  }
}

class IotDevicesListResult {
  final int code;
  final dynamic data;
  final String traceId;

  IotDevicesListResult({
    required this.code,
    required this.data,
    required this.traceId
  });

  factory IotDevicesListResult.fromJson(Map<String, dynamic> json) {
    return IotDevicesListResult(
      code: (() {
        final value = json['code'];
        if (value is! int) {
          throw FormatException('IotDevicesListResult.code is required');
        }
        return value;
      })(),
      data: json['data'],
      traceId: (() {
        final value = json['traceId']?.toString();
        if (value == null) {
          throw FormatException('IotDevicesListResult.traceId is required');
        }
        return value;
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'code': code,
      'data': data,
      'traceId': traceId,
    };
  }
}

class IotFirmwareListResult {
  final int code;
  final dynamic data;
  final String traceId;

  IotFirmwareListResult({
    required this.code,
    required this.data,
    required this.traceId
  });

  factory IotFirmwareListResult.fromJson(Map<String, dynamic> json) {
    return IotFirmwareListResult(
      code: (() {
        final value = json['code'];
        if (value is! int) {
          throw FormatException('IotFirmwareListResult.code is required');
        }
        return value;
      })(),
      data: json['data'],
      traceId: (() {
        final value = json['traceId']?.toString();
        if (value == null) {
          throw FormatException('IotFirmwareListResult.traceId is required');
        }
        return value;
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'code': code,
      'data': data,
      'traceId': traceId,
    };
  }
}

class MarkNotificationPopupSeenResponse {
  final String state;
  final bool updated;

  MarkNotificationPopupSeenResponse({
    required this.state,
    required this.updated
  });

  factory MarkNotificationPopupSeenResponse.fromJson(Map<String, dynamic> json) {
    return MarkNotificationPopupSeenResponse(
      state: (() {
        final value = json['state']?.toString();
        if (value == null) {
          throw FormatException('MarkNotificationPopupSeenResponse.state is required');
        }
        return value;
      })(),
      updated: (() {
        final value = json['updated'];
        if (value is! bool) {
          throw FormatException('MarkNotificationPopupSeenResponse.updated is required');
        }
        return value;
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'state': state,
      'updated': updated,
    };
  }
}

class MediaAccess {
  final String? expiresAt;
  final String visibility;

  MediaAccess({
    this.expiresAt,
    required this.visibility
  });

  factory MediaAccess.fromJson(Map<String, dynamic> json) {
    return MediaAccess(
      expiresAt: json['expiresAt']?.toString(),
      visibility: (() {
        final value = json['visibility']?.toString();
        if (value == null) {
          throw FormatException('MediaAccess.visibility is required');
        }
        return value;
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'expiresAt': expiresAt,
      'visibility': visibility,
    };
  }
}

class MediaAiProvenance {
  final String? generationTaskId;
  final String? model;
  final String? moderationStatus;
  final String? promptId;
  final String? provenance;
  final String? provider;
  final List<String>? safetyLabels;
  final String? seed;
  final List<String>? sourceMediaIds;

  MediaAiProvenance({
    this.generationTaskId,
    this.model,
    this.moderationStatus,
    this.promptId,
    this.provenance,
    this.provider,
    this.safetyLabels,
    this.seed,
    this.sourceMediaIds
  });

  factory MediaAiProvenance.fromJson(Map<String, dynamic> json) {
    return MediaAiProvenance(
      generationTaskId: json['generationTaskId']?.toString(),
      model: json['model']?.toString(),
      moderationStatus: json['moderationStatus']?.toString(),
      promptId: json['promptId']?.toString(),
      provenance: json['provenance']?.toString(),
      provider: json['provider']?.toString(),
      safetyLabels: (() {
        final list = _sdkworkAsList(json['safetyLabels']);
        if (list == null) {
          return null;
        }
        return list
            .map((item) => item?.toString())
            .whereType<String>()
            .toList();
      })(),
      seed: json['seed']?.toString(),
      sourceMediaIds: (() {
        final list = _sdkworkAsList(json['sourceMediaIds']);
        if (list == null) {
          return null;
        }
        return list
            .map((item) => item?.toString())
            .whereType<String>()
            .toList();
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'generationTaskId': generationTaskId,
      'model': model,
      'moderationStatus': moderationStatus,
      'promptId': promptId,
      'provenance': provenance,
      'provider': provider,
      'safetyLabels': safetyLabels?.map((item) => item).toList(),
      'seed': seed,
      'sourceMediaIds': sourceMediaIds?.map((item) => item).toList(),
    };
  }
}

class MediaChecksum {
  final String algorithm;
  final String value;

  MediaChecksum({
    required this.algorithm,
    required this.value
  });

  factory MediaChecksum.fromJson(Map<String, dynamic> json) {
    return MediaChecksum(
      algorithm: (() {
        final value = json['algorithm']?.toString();
        if (value == null) {
          throw FormatException('MediaChecksum.algorithm is required');
        }
        return value;
      })(),
      value: (() {
        final value = json['value']?.toString();
        if (value == null) {
          throw FormatException('MediaChecksum.value is required');
        }
        return value;
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'algorithm': algorithm,
      'value': value,
    };
  }
}

class MediaResource {
  final MediaAccess? access;
  final MediaAiProvenance? ai;
  final String? altText;
  final String? bucketId;
  final MediaChecksum? checksum;
  final double? durationSeconds;
  final String? fileName;
  final int? height;
  final String? id;
  final String kind;
  final Map<String, dynamic>? metadata;
  final String? mimeType;
  final String? objectBlobId;
  final String? objectKey;
  final String? objectVersion;
  final MediaResource? poster;
  final String? publicUrl;
  final String? sizeBytes;
  final String source;
  final List<MediaResource>? thumbnails;
  final String? title;
  final String? uri;
  final String? url;
  final List<MediaResource>? variants;
  final int? width;

  MediaResource({
    this.access,
    this.ai,
    this.altText,
    this.bucketId,
    this.checksum,
    this.durationSeconds,
    this.fileName,
    this.height,
    this.id,
    required this.kind,
    this.metadata,
    this.mimeType,
    this.objectBlobId,
    this.objectKey,
    this.objectVersion,
    this.poster,
    this.publicUrl,
    this.sizeBytes,
    required this.source,
    this.thumbnails,
    this.title,
    this.uri,
    this.url,
    this.variants,
    this.width
  });

  factory MediaResource.fromJson(Map<String, dynamic> json) {
    return MediaResource(
      access: (() {
        final map = _sdkworkAsMap(json['access']);
        return map == null ? null : MediaAccess.fromJson(map);
      })(),
      ai: (() {
        final map = _sdkworkAsMap(json['ai']);
        return map == null ? null : MediaAiProvenance.fromJson(map);
      })(),
      altText: json['altText']?.toString(),
      bucketId: json['bucketId']?.toString(),
      checksum: (() {
        final map = _sdkworkAsMap(json['checksum']);
        return map == null ? null : MediaChecksum.fromJson(map);
      })(),
      durationSeconds: json['durationSeconds'] is num ? json['durationSeconds'].toDouble() : null,
      fileName: json['fileName']?.toString(),
      height: json['height'] is int ? json['height'] : null,
      id: json['id']?.toString(),
      kind: (() {
        final value = json['kind']?.toString();
        if (value == null) {
          throw FormatException('MediaResource.kind is required');
        }
        return value;
      })(),
      metadata: (() {
        final map = _sdkworkAsMap(json['metadata']);
        if (map == null) {
          return null;
        }
        final result = <String, String>{};
        map.forEach((key, item) {
          final deserialized = item?.toString();
          if (deserialized is String) {
            result[key] = deserialized;
          }
        });
        return result;
      })(),
      mimeType: json['mimeType']?.toString(),
      objectBlobId: json['objectBlobId']?.toString(),
      objectKey: json['objectKey']?.toString(),
      objectVersion: json['objectVersion']?.toString(),
      poster: (() {
        final map = _sdkworkAsMap(json['poster']);
        return map == null ? null : MediaResource.fromJson(map);
      })(),
      publicUrl: json['publicUrl']?.toString(),
      sizeBytes: json['sizeBytes']?.toString(),
      source: (() {
        final value = json['source']?.toString();
        if (value == null) {
          throw FormatException('MediaResource.source is required');
        }
        return value;
      })(),
      thumbnails: (() {
        final list = _sdkworkAsList(json['thumbnails']);
        if (list == null) {
          return null;
        }
        return list
            .map((item) => (() {
        final map = _sdkworkAsMap(item);
        return map == null ? null : MediaResource.fromJson(map);
      })())
            .whereType<MediaResource>()
            .toList();
      })(),
      title: json['title']?.toString(),
      uri: json['uri']?.toString(),
      url: json['url']?.toString(),
      variants: (() {
        final list = _sdkworkAsList(json['variants']);
        if (list == null) {
          return null;
        }
        return list
            .map((item) => (() {
        final map = _sdkworkAsMap(item);
        return map == null ? null : MediaResource.fromJson(map);
      })())
            .whereType<MediaResource>()
            .toList();
      })(),
      width: json['width'] is int ? json['width'] : null
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'access': access?.toJson(),
      'ai': ai?.toJson(),
      'altText': altText,
      'bucketId': bucketId,
      'checksum': checksum?.toJson(),
      'durationSeconds': durationSeconds,
      'fileName': fileName,
      'height': height,
      'id': id,
      'kind': kind,
      'metadata': metadata?.map((key, item) => MapEntry(key, item)),
      'mimeType': mimeType,
      'objectBlobId': objectBlobId,
      'objectKey': objectKey,
      'objectVersion': objectVersion,
      'poster': poster?.toJson(),
      'publicUrl': publicUrl,
      'sizeBytes': sizeBytes,
      'source': source,
      'thumbnails': thumbnails?.map((item) => item.toJson()).toList(),
      'title': title,
      'uri': uri,
      'url': url,
      'variants': variants?.map((item) => item.toJson()).toList(),
      'width': width,
    };
  }
}

class NoData {


  NoData();

  factory NoData.fromJson(Map<String, dynamic> json) {
    return NoData();
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{};
  }
}

class NotificationItem {
  final String? actionUrl;
  final String appId;
  final bool archived;
  final String content;
  final String desc;
  final String id;
  final bool popupSeen;
  final bool read;
  final bool showAsPopup;
  final String time;
  final String title;
  final String type;

  NotificationItem({
    this.actionUrl,
    required this.appId,
    required this.archived,
    required this.content,
    required this.desc,
    required this.id,
    required this.popupSeen,
    required this.read,
    required this.showAsPopup,
    required this.time,
    required this.title,
    required this.type
  });

  factory NotificationItem.fromJson(Map<String, dynamic> json) {
    return NotificationItem(
      actionUrl: json['actionUrl']?.toString(),
      appId: (() {
        final value = json['appId']?.toString();
        if (value == null) {
          throw FormatException('NotificationItem.appId is required');
        }
        return value;
      })(),
      archived: (() {
        final value = json['archived'];
        if (value is! bool) {
          throw FormatException('NotificationItem.archived is required');
        }
        return value;
      })(),
      content: (() {
        final value = json['content']?.toString();
        if (value == null) {
          throw FormatException('NotificationItem.content is required');
        }
        return value;
      })(),
      desc: (() {
        final value = json['desc']?.toString();
        if (value == null) {
          throw FormatException('NotificationItem.desc is required');
        }
        return value;
      })(),
      id: (() {
        final value = json['id']?.toString();
        if (value == null) {
          throw FormatException('NotificationItem.id is required');
        }
        return value;
      })(),
      popupSeen: (() {
        final value = json['popupSeen'];
        if (value is! bool) {
          throw FormatException('NotificationItem.popupSeen is required');
        }
        return value;
      })(),
      read: (() {
        final value = json['read'];
        if (value is! bool) {
          throw FormatException('NotificationItem.read is required');
        }
        return value;
      })(),
      showAsPopup: (() {
        final value = json['showAsPopup'];
        if (value is! bool) {
          throw FormatException('NotificationItem.showAsPopup is required');
        }
        return value;
      })(),
      time: (() {
        final value = json['time']?.toString();
        if (value == null) {
          throw FormatException('NotificationItem.time is required');
        }
        return value;
      })(),
      title: (() {
        final value = json['title']?.toString();
        if (value == null) {
          throw FormatException('NotificationItem.title is required');
        }
        return value;
      })(),
      type: (() {
        final value = json['type']?.toString();
        if (value == null) {
          throw FormatException('NotificationItem.type is required');
        }
        return value;
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'actionUrl': actionUrl,
      'appId': appId,
      'archived': archived,
      'content': content,
      'desc': desc,
      'id': id,
      'popupSeen': popupSeen,
      'read': read,
      'showAsPopup': showAsPopup,
      'time': time,
      'title': title,
      'type': type,
    };
  }
}

class NotificationListResponse {
  final List<NotificationItem> items;
  final PageInfo pageInfo;

  NotificationListResponse({
    required this.items,
    required this.pageInfo
  });

  factory NotificationListResponse.fromJson(Map<String, dynamic> json) {
    return NotificationListResponse(
      items: (() {
        final list = _sdkworkAsList(json['items']);
        if (list == null) {
          throw FormatException('NotificationListResponse.items is required');
        }
        return list
            .map((item) => (() {
        final map = _sdkworkAsMap(item);
        return map == null ? null : NotificationItem.fromJson(map);
      })())
            .whereType<NotificationItem>()
            .toList();
      })(),
      pageInfo: (() {
        final map = _sdkworkAsMap(json['pageInfo']);
        if (map == null) {
          throw FormatException('NotificationListResponse.pageInfo is required');
        }
        return PageInfo.fromJson(map);
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'items': items.map((item) => item.toJson()).toList(),
      'pageInfo': pageInfo.toJson(),
    };
  }
}

class NotificationsAcknowledgeCreateResult {
  final int code;
  final dynamic data;
  final String traceId;

  NotificationsAcknowledgeCreateResult({
    required this.code,
    required this.data,
    required this.traceId
  });

  factory NotificationsAcknowledgeCreateResult.fromJson(Map<String, dynamic> json) {
    return NotificationsAcknowledgeCreateResult(
      code: (() {
        final value = json['code'];
        if (value is! int) {
          throw FormatException('NotificationsAcknowledgeCreateResult.code is required');
        }
        return value;
      })(),
      data: json['data'],
      traceId: (() {
        final value = json['traceId']?.toString();
        if (value == null) {
          throw FormatException('NotificationsAcknowledgeCreateResult.traceId is required');
        }
        return value;
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'code': code,
      'data': data,
      'traceId': traceId,
    };
  }
}

class NotificationsListResult {
  final int code;
  final dynamic data;
  final String traceId;

  NotificationsListResult({
    required this.code,
    required this.data,
    required this.traceId
  });

  factory NotificationsListResult.fromJson(Map<String, dynamic> json) {
    return NotificationsListResult(
      code: (() {
        final value = json['code'];
        if (value is! int) {
          throw FormatException('NotificationsListResult.code is required');
        }
        return value;
      })(),
      data: json['data'],
      traceId: (() {
        final value = json['traceId']?.toString();
        if (value == null) {
          throw FormatException('NotificationsListResult.traceId is required');
        }
        return value;
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'code': code,
      'data': data,
      'traceId': traceId,
    };
  }
}

class NotificationsPopupSeenCreateResult {
  final int code;
  final dynamic data;
  final String traceId;

  NotificationsPopupSeenCreateResult({
    required this.code,
    required this.data,
    required this.traceId
  });

  factory NotificationsPopupSeenCreateResult.fromJson(Map<String, dynamic> json) {
    return NotificationsPopupSeenCreateResult(
      code: (() {
        final value = json['code'];
        if (value is! int) {
          throw FormatException('NotificationsPopupSeenCreateResult.code is required');
        }
        return value;
      })(),
      data: json['data'],
      traceId: (() {
        final value = json['traceId']?.toString();
        if (value == null) {
          throw FormatException('NotificationsPopupSeenCreateResult.traceId is required');
        }
        return value;
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'code': code,
      'data': data,
      'traceId': traceId,
    };
  }
}

class OfficialPricingCatalogResponse {
  final List<OfficialPricingValueFacet> currencies;
  final List<OfficialPricingGroupFacet> groups;
  final List<OfficialPricingRate> items;
  final List<OfficialPricingMeterFacet> meters;
  final PageInfo pageInfo;
  final List<OfficialPricingRegionFacet> regions;
  final List<OfficialPricingValueFacet> vendors;

  OfficialPricingCatalogResponse({
    required this.currencies,
    required this.groups,
    required this.items,
    required this.meters,
    required this.pageInfo,
    required this.regions,
    required this.vendors
  });

  factory OfficialPricingCatalogResponse.fromJson(Map<String, dynamic> json) {
    return OfficialPricingCatalogResponse(
      currencies: (() {
        final list = _sdkworkAsList(json['currencies']);
        if (list == null) {
          throw FormatException('OfficialPricingCatalogResponse.currencies is required');
        }
        return list
            .map((item) => (() {
        final map = _sdkworkAsMap(item);
        return map == null ? null : OfficialPricingValueFacet.fromJson(map);
      })())
            .whereType<OfficialPricingValueFacet>()
            .toList();
      })(),
      groups: (() {
        final list = _sdkworkAsList(json['groups']);
        if (list == null) {
          throw FormatException('OfficialPricingCatalogResponse.groups is required');
        }
        return list
            .map((item) => (() {
        final map = _sdkworkAsMap(item);
        return map == null ? null : OfficialPricingGroupFacet.fromJson(map);
      })())
            .whereType<OfficialPricingGroupFacet>()
            .toList();
      })(),
      items: (() {
        final list = _sdkworkAsList(json['items']);
        if (list == null) {
          throw FormatException('OfficialPricingCatalogResponse.items is required');
        }
        return list
            .map((item) => (() {
        final map = _sdkworkAsMap(item);
        return map == null ? null : OfficialPricingRate.fromJson(map);
      })())
            .whereType<OfficialPricingRate>()
            .toList();
      })(),
      meters: (() {
        final list = _sdkworkAsList(json['meters']);
        if (list == null) {
          throw FormatException('OfficialPricingCatalogResponse.meters is required');
        }
        return list
            .map((item) => (() {
        final map = _sdkworkAsMap(item);
        return map == null ? null : OfficialPricingMeterFacet.fromJson(map);
      })())
            .whereType<OfficialPricingMeterFacet>()
            .toList();
      })(),
      pageInfo: (() {
        final map = _sdkworkAsMap(json['pageInfo']);
        if (map == null) {
          throw FormatException('OfficialPricingCatalogResponse.pageInfo is required');
        }
        return PageInfo.fromJson(map);
      })(),
      regions: (() {
        final list = _sdkworkAsList(json['regions']);
        if (list == null) {
          throw FormatException('OfficialPricingCatalogResponse.regions is required');
        }
        return list
            .map((item) => (() {
        final map = _sdkworkAsMap(item);
        return map == null ? null : OfficialPricingRegionFacet.fromJson(map);
      })())
            .whereType<OfficialPricingRegionFacet>()
            .toList();
      })(),
      vendors: (() {
        final list = _sdkworkAsList(json['vendors']);
        if (list == null) {
          throw FormatException('OfficialPricingCatalogResponse.vendors is required');
        }
        return list
            .map((item) => (() {
        final map = _sdkworkAsMap(item);
        return map == null ? null : OfficialPricingValueFacet.fromJson(map);
      })())
            .whereType<OfficialPricingValueFacet>()
            .toList();
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'currencies': currencies.map((item) => item.toJson()).toList(),
      'groups': groups.map((item) => item.toJson()).toList(),
      'items': items.map((item) => item.toJson()).toList(),
      'meters': meters.map((item) => item.toJson()).toList(),
      'pageInfo': pageInfo.toJson(),
      'regions': regions.map((item) => item.toJson()).toList(),
      'vendors': vendors.map((item) => item.toJson()).toList(),
    };
  }
}

class OfficialPricingFormula {
  final String constantUnits;
  final String formulaCode;
  final String formulaVersion;
  final String? maximumUnits;
  final String? minimumUnits;
  final String quantityCoefficient;
  final List<OfficialPricingFormulaTerm> terms;

  OfficialPricingFormula({
    required this.constantUnits,
    required this.formulaCode,
    required this.formulaVersion,
    this.maximumUnits,
    this.minimumUnits,
    required this.quantityCoefficient,
    required this.terms
  });

  factory OfficialPricingFormula.fromJson(Map<String, dynamic> json) {
    return OfficialPricingFormula(
      constantUnits: (() {
        final value = json['constantUnits']?.toString();
        if (value == null) {
          throw FormatException('OfficialPricingFormula.constantUnits is required');
        }
        return value;
      })(),
      formulaCode: (() {
        final value = json['formulaCode']?.toString();
        if (value == null) {
          throw FormatException('OfficialPricingFormula.formulaCode is required');
        }
        return value;
      })(),
      formulaVersion: (() {
        final value = json['formulaVersion']?.toString();
        if (value == null) {
          throw FormatException('OfficialPricingFormula.formulaVersion is required');
        }
        return value;
      })(),
      maximumUnits: json['maximumUnits']?.toString(),
      minimumUnits: json['minimumUnits']?.toString(),
      quantityCoefficient: (() {
        final value = json['quantityCoefficient']?.toString();
        if (value == null) {
          throw FormatException('OfficialPricingFormula.quantityCoefficient is required');
        }
        return value;
      })(),
      terms: (() {
        final list = _sdkworkAsList(json['terms']);
        if (list == null) {
          throw FormatException('OfficialPricingFormula.terms is required');
        }
        return list
            .map((item) => (() {
        final map = _sdkworkAsMap(item);
        return map == null ? null : OfficialPricingFormulaTerm.fromJson(map);
      })())
            .whereType<OfficialPricingFormulaTerm>()
            .toList();
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'constantUnits': constantUnits,
      'formulaCode': formulaCode,
      'formulaVersion': formulaVersion,
      'maximumUnits': maximumUnits,
      'minimumUnits': minimumUnits,
      'quantityCoefficient': quantityCoefficient,
      'terms': terms.map((item) => item.toJson()).toList(),
    };
  }
}

class OfficialPricingFormulaTerm {
  final String coefficient;
  final String dimensionCode;
  final String termCode;

  OfficialPricingFormulaTerm({
    required this.coefficient,
    required this.dimensionCode,
    required this.termCode
  });

  factory OfficialPricingFormulaTerm.fromJson(Map<String, dynamic> json) {
    return OfficialPricingFormulaTerm(
      coefficient: (() {
        final value = json['coefficient']?.toString();
        if (value == null) {
          throw FormatException('OfficialPricingFormulaTerm.coefficient is required');
        }
        return value;
      })(),
      dimensionCode: (() {
        final value = json['dimensionCode']?.toString();
        if (value == null) {
          throw FormatException('OfficialPricingFormulaTerm.dimensionCode is required');
        }
        return value;
      })(),
      termCode: (() {
        final value = json['termCode']?.toString();
        if (value == null) {
          throw FormatException('OfficialPricingFormulaTerm.termCode is required');
        }
        return value;
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'coefficient': coefficient,
      'dimensionCode': dimensionCode,
      'termCode': termCode,
    };
  }
}

class OfficialPricingGroupFacet {
  final String code;
  final String count;
  final String id;

  OfficialPricingGroupFacet({
    required this.code,
    required this.count,
    required this.id
  });

  factory OfficialPricingGroupFacet.fromJson(Map<String, dynamic> json) {
    return OfficialPricingGroupFacet(
      code: (() {
        final value = json['code']?.toString();
        if (value == null) {
          throw FormatException('OfficialPricingGroupFacet.code is required');
        }
        return value;
      })(),
      count: (() {
        final value = json['count']?.toString();
        if (value == null) {
          throw FormatException('OfficialPricingGroupFacet.count is required');
        }
        return value;
      })(),
      id: (() {
        final value = json['id']?.toString();
        if (value == null) {
          throw FormatException('OfficialPricingGroupFacet.id is required');
        }
        return value;
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'code': code,
      'count': count,
      'id': id,
    };
  }
}

class OfficialPricingMeterFacet {
  final String code;
  final String count;
  final String displayName;
  final String id;
  final String unitCode;

  OfficialPricingMeterFacet({
    required this.code,
    required this.count,
    required this.displayName,
    required this.id,
    required this.unitCode
  });

  factory OfficialPricingMeterFacet.fromJson(Map<String, dynamic> json) {
    return OfficialPricingMeterFacet(
      code: (() {
        final value = json['code']?.toString();
        if (value == null) {
          throw FormatException('OfficialPricingMeterFacet.code is required');
        }
        return value;
      })(),
      count: (() {
        final value = json['count']?.toString();
        if (value == null) {
          throw FormatException('OfficialPricingMeterFacet.count is required');
        }
        return value;
      })(),
      displayName: (() {
        final value = json['displayName']?.toString();
        if (value == null) {
          throw FormatException('OfficialPricingMeterFacet.displayName is required');
        }
        return value;
      })(),
      id: (() {
        final value = json['id']?.toString();
        if (value == null) {
          throw FormatException('OfficialPricingMeterFacet.id is required');
        }
        return value;
      })(),
      unitCode: (() {
        final value = json['unitCode']?.toString();
        if (value == null) {
          throw FormatException('OfficialPricingMeterFacet.unitCode is required');
        }
        return value;
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'code': code,
      'count': count,
      'displayName': displayName,
      'id': id,
      'unitCode': unitCode,
    };
  }
}

class OfficialPricingRate {
  final String? apiFormat;
  final String billability;
  final String calculationMode;
  final List<String>? capabilities;
  final String? catalogKey;
  final String chargeTiming;
  final List<OfficialPricingRateCondition> conditions;
  final String? contextTokens;
  final String currencyCode;
  final String effectiveFrom;
  final String? effectiveTo;
  final String? endpointCode;
  final OfficialPricingFormula? formula;
  final List<String> groupCodes;
  final List<String>? inputModalities;
  final String? maxInputTokens;
  final String? maxOutputTokens;
  final String meterCode;
  final String meterDisplayName;
  final String minimumQuantity;
  final String operationCode;
  final String operationDisplayName;
  final String operationKind;
  final List<String>? outputModalities;
  final String priceBookCode;
  final String priceBookVersion;
  final int? priority;
  final String productCode;
  final String productDisplayName;
  final String productKind;
  final String providerCode;
  final String quantityAggregation;
  final String quantityKind;
  final String? quantityStep;
  final String rateCode;
  final String rateHash;
  final String? rateVariant;
  final String regionCode;
  final String resourceCode;
  final String resourceType;
  final Map<String, dynamic>? schedule;
  final String sourceObservedAt;
  final String sourceUrl;
  final bool? supportsJsonSchema;
  final bool? supportsStreaming;
  final bool? supportsTools;
  final List<OfficialPricingRateTier> tiers;
  final String unitCode;
  final String unitPrice;
  final String unitSize;
  final List<String>? usageScopes;
  final String vendorCode;

  OfficialPricingRate({
    this.apiFormat,
    required this.billability,
    required this.calculationMode,
    this.capabilities,
    this.catalogKey,
    required this.chargeTiming,
    required this.conditions,
    this.contextTokens,
    required this.currencyCode,
    required this.effectiveFrom,
    this.effectiveTo,
    this.endpointCode,
    this.formula,
    required this.groupCodes,
    this.inputModalities,
    this.maxInputTokens,
    this.maxOutputTokens,
    required this.meterCode,
    required this.meterDisplayName,
    required this.minimumQuantity,
    required this.operationCode,
    required this.operationDisplayName,
    required this.operationKind,
    this.outputModalities,
    required this.priceBookCode,
    required this.priceBookVersion,
    this.priority,
    required this.productCode,
    required this.productDisplayName,
    required this.productKind,
    required this.providerCode,
    required this.quantityAggregation,
    required this.quantityKind,
    this.quantityStep,
    required this.rateCode,
    required this.rateHash,
    this.rateVariant,
    required this.regionCode,
    required this.resourceCode,
    required this.resourceType,
    this.schedule,
    required this.sourceObservedAt,
    required this.sourceUrl,
    this.supportsJsonSchema,
    this.supportsStreaming,
    this.supportsTools,
    required this.tiers,
    required this.unitCode,
    required this.unitPrice,
    required this.unitSize,
    this.usageScopes,
    required this.vendorCode
  });

  factory OfficialPricingRate.fromJson(Map<String, dynamic> json) {
    return OfficialPricingRate(
      apiFormat: json['apiFormat']?.toString(),
      billability: (() {
        final value = json['billability']?.toString();
        if (value == null) {
          throw FormatException('OfficialPricingRate.billability is required');
        }
        return value;
      })(),
      calculationMode: (() {
        final value = json['calculationMode']?.toString();
        if (value == null) {
          throw FormatException('OfficialPricingRate.calculationMode is required');
        }
        return value;
      })(),
      capabilities: (() {
        final list = _sdkworkAsList(json['capabilities']);
        if (list == null) {
          return null;
        }
        return list
            .map((item) => item?.toString())
            .whereType<String>()
            .toList();
      })(),
      catalogKey: json['catalogKey']?.toString(),
      chargeTiming: (() {
        final value = json['chargeTiming']?.toString();
        if (value == null) {
          throw FormatException('OfficialPricingRate.chargeTiming is required');
        }
        return value;
      })(),
      conditions: (() {
        final list = _sdkworkAsList(json['conditions']);
        if (list == null) {
          throw FormatException('OfficialPricingRate.conditions is required');
        }
        return list
            .map((item) => (() {
        final map = _sdkworkAsMap(item);
        return map == null ? null : OfficialPricingRateCondition.fromJson(map);
      })())
            .whereType<OfficialPricingRateCondition>()
            .toList();
      })(),
      contextTokens: json['contextTokens']?.toString(),
      currencyCode: (() {
        final value = json['currencyCode']?.toString();
        if (value == null) {
          throw FormatException('OfficialPricingRate.currencyCode is required');
        }
        return value;
      })(),
      effectiveFrom: (() {
        final value = json['effectiveFrom']?.toString();
        if (value == null) {
          throw FormatException('OfficialPricingRate.effectiveFrom is required');
        }
        return value;
      })(),
      effectiveTo: json['effectiveTo']?.toString(),
      endpointCode: json['endpointCode']?.toString(),
      formula: (() {
        final map = _sdkworkAsMap(json['formula']);
        return map == null ? null : OfficialPricingFormula.fromJson(map);
      })(),
      groupCodes: (() {
        final list = _sdkworkAsList(json['groupCodes']);
        if (list == null) {
          throw FormatException('OfficialPricingRate.groupCodes is required');
        }
        return list
            .map((item) => item?.toString())
            .whereType<String>()
            .toList();
      })(),
      inputModalities: (() {
        final list = _sdkworkAsList(json['inputModalities']);
        if (list == null) {
          return null;
        }
        return list
            .map((item) => item?.toString())
            .whereType<String>()
            .toList();
      })(),
      maxInputTokens: json['maxInputTokens']?.toString(),
      maxOutputTokens: json['maxOutputTokens']?.toString(),
      meterCode: (() {
        final value = json['meterCode']?.toString();
        if (value == null) {
          throw FormatException('OfficialPricingRate.meterCode is required');
        }
        return value;
      })(),
      meterDisplayName: (() {
        final value = json['meterDisplayName']?.toString();
        if (value == null) {
          throw FormatException('OfficialPricingRate.meterDisplayName is required');
        }
        return value;
      })(),
      minimumQuantity: (() {
        final value = json['minimumQuantity']?.toString();
        if (value == null) {
          throw FormatException('OfficialPricingRate.minimumQuantity is required');
        }
        return value;
      })(),
      operationCode: (() {
        final value = json['operationCode']?.toString();
        if (value == null) {
          throw FormatException('OfficialPricingRate.operationCode is required');
        }
        return value;
      })(),
      operationDisplayName: (() {
        final value = json['operationDisplayName']?.toString();
        if (value == null) {
          throw FormatException('OfficialPricingRate.operationDisplayName is required');
        }
        return value;
      })(),
      operationKind: (() {
        final value = json['operationKind']?.toString();
        if (value == null) {
          throw FormatException('OfficialPricingRate.operationKind is required');
        }
        return value;
      })(),
      outputModalities: (() {
        final list = _sdkworkAsList(json['outputModalities']);
        if (list == null) {
          return null;
        }
        return list
            .map((item) => item?.toString())
            .whereType<String>()
            .toList();
      })(),
      priceBookCode: (() {
        final value = json['priceBookCode']?.toString();
        if (value == null) {
          throw FormatException('OfficialPricingRate.priceBookCode is required');
        }
        return value;
      })(),
      priceBookVersion: (() {
        final value = json['priceBookVersion']?.toString();
        if (value == null) {
          throw FormatException('OfficialPricingRate.priceBookVersion is required');
        }
        return value;
      })(),
      priority: json['priority'] is int ? json['priority'] : null,
      productCode: (() {
        final value = json['productCode']?.toString();
        if (value == null) {
          throw FormatException('OfficialPricingRate.productCode is required');
        }
        return value;
      })(),
      productDisplayName: (() {
        final value = json['productDisplayName']?.toString();
        if (value == null) {
          throw FormatException('OfficialPricingRate.productDisplayName is required');
        }
        return value;
      })(),
      productKind: (() {
        final value = json['productKind']?.toString();
        if (value == null) {
          throw FormatException('OfficialPricingRate.productKind is required');
        }
        return value;
      })(),
      providerCode: (() {
        final value = json['providerCode']?.toString();
        if (value == null) {
          throw FormatException('OfficialPricingRate.providerCode is required');
        }
        return value;
      })(),
      quantityAggregation: (() {
        final value = json['quantityAggregation']?.toString();
        if (value == null) {
          throw FormatException('OfficialPricingRate.quantityAggregation is required');
        }
        return value;
      })(),
      quantityKind: (() {
        final value = json['quantityKind']?.toString();
        if (value == null) {
          throw FormatException('OfficialPricingRate.quantityKind is required');
        }
        return value;
      })(),
      quantityStep: json['quantityStep']?.toString(),
      rateCode: (() {
        final value = json['rateCode']?.toString();
        if (value == null) {
          throw FormatException('OfficialPricingRate.rateCode is required');
        }
        return value;
      })(),
      rateHash: (() {
        final value = json['rateHash']?.toString();
        if (value == null) {
          throw FormatException('OfficialPricingRate.rateHash is required');
        }
        return value;
      })(),
      rateVariant: json['rateVariant']?.toString(),
      regionCode: (() {
        final value = json['regionCode']?.toString();
        if (value == null) {
          throw FormatException('OfficialPricingRate.regionCode is required');
        }
        return value;
      })(),
      resourceCode: (() {
        final value = json['resourceCode']?.toString();
        if (value == null) {
          throw FormatException('OfficialPricingRate.resourceCode is required');
        }
        return value;
      })(),
      resourceType: (() {
        final value = json['resourceType']?.toString();
        if (value == null) {
          throw FormatException('OfficialPricingRate.resourceType is required');
        }
        return value;
      })(),
      schedule: _sdkworkAsMap(json['schedule']),
      sourceObservedAt: (() {
        final value = json['sourceObservedAt']?.toString();
        if (value == null) {
          throw FormatException('OfficialPricingRate.sourceObservedAt is required');
        }
        return value;
      })(),
      sourceUrl: (() {
        final value = json['sourceUrl']?.toString();
        if (value == null) {
          throw FormatException('OfficialPricingRate.sourceUrl is required');
        }
        return value;
      })(),
      supportsJsonSchema: json['supportsJsonSchema'] is bool ? json['supportsJsonSchema'] : null,
      supportsStreaming: json['supportsStreaming'] is bool ? json['supportsStreaming'] : null,
      supportsTools: json['supportsTools'] is bool ? json['supportsTools'] : null,
      tiers: (() {
        final list = _sdkworkAsList(json['tiers']);
        if (list == null) {
          throw FormatException('OfficialPricingRate.tiers is required');
        }
        return list
            .map((item) => (() {
        final map = _sdkworkAsMap(item);
        return map == null ? null : OfficialPricingRateTier.fromJson(map);
      })())
            .whereType<OfficialPricingRateTier>()
            .toList();
      })(),
      unitCode: (() {
        final value = json['unitCode']?.toString();
        if (value == null) {
          throw FormatException('OfficialPricingRate.unitCode is required');
        }
        return value;
      })(),
      unitPrice: (() {
        final value = json['unitPrice']?.toString();
        if (value == null) {
          throw FormatException('OfficialPricingRate.unitPrice is required');
        }
        return value;
      })(),
      unitSize: (() {
        final value = json['unitSize']?.toString();
        if (value == null) {
          throw FormatException('OfficialPricingRate.unitSize is required');
        }
        return value;
      })(),
      usageScopes: (() {
        final list = _sdkworkAsList(json['usageScopes']);
        if (list == null) {
          return null;
        }
        return list
            .map((item) => item?.toString())
            .whereType<String>()
            .toList();
      })(),
      vendorCode: (() {
        final value = json['vendorCode']?.toString();
        if (value == null) {
          throw FormatException('OfficialPricingRate.vendorCode is required');
        }
        return value;
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'apiFormat': apiFormat,
      'billability': billability,
      'calculationMode': calculationMode,
      'capabilities': capabilities?.map((item) => item).toList(),
      'catalogKey': catalogKey,
      'chargeTiming': chargeTiming,
      'conditions': conditions.map((item) => item.toJson()).toList(),
      'contextTokens': contextTokens,
      'currencyCode': currencyCode,
      'effectiveFrom': effectiveFrom,
      'effectiveTo': effectiveTo,
      'endpointCode': endpointCode,
      'formula': formula?.toJson(),
      'groupCodes': groupCodes.map((item) => item).toList(),
      'inputModalities': inputModalities?.map((item) => item).toList(),
      'maxInputTokens': maxInputTokens,
      'maxOutputTokens': maxOutputTokens,
      'meterCode': meterCode,
      'meterDisplayName': meterDisplayName,
      'minimumQuantity': minimumQuantity,
      'operationCode': operationCode,
      'operationDisplayName': operationDisplayName,
      'operationKind': operationKind,
      'outputModalities': outputModalities?.map((item) => item).toList(),
      'priceBookCode': priceBookCode,
      'priceBookVersion': priceBookVersion,
      'priority': priority,
      'productCode': productCode,
      'productDisplayName': productDisplayName,
      'productKind': productKind,
      'providerCode': providerCode,
      'quantityAggregation': quantityAggregation,
      'quantityKind': quantityKind,
      'quantityStep': quantityStep,
      'rateCode': rateCode,
      'rateHash': rateHash,
      'rateVariant': rateVariant,
      'regionCode': regionCode,
      'resourceCode': resourceCode,
      'resourceType': resourceType,
      'schedule': schedule,
      'sourceObservedAt': sourceObservedAt,
      'sourceUrl': sourceUrl,
      'supportsJsonSchema': supportsJsonSchema,
      'supportsStreaming': supportsStreaming,
      'supportsTools': supportsTools,
      'tiers': tiers.map((item) => item.toJson()).toList(),
      'unitCode': unitCode,
      'unitPrice': unitPrice,
      'unitSize': unitSize,
      'usageScopes': usageScopes?.map((item) => item).toList(),
      'vendorCode': vendorCode,
    };
  }
}

class OfficialPricingRateCondition {
  final String dimensionCode;
  final String operatorCode;
  final dynamic value;

  OfficialPricingRateCondition({
    required this.dimensionCode,
    required this.operatorCode,
    required this.value
  });

  factory OfficialPricingRateCondition.fromJson(Map<String, dynamic> json) {
    return OfficialPricingRateCondition(
      dimensionCode: (() {
        final value = json['dimensionCode']?.toString();
        if (value == null) {
          throw FormatException('OfficialPricingRateCondition.dimensionCode is required');
        }
        return value;
      })(),
      operatorCode: (() {
        final value = json['operatorCode']?.toString();
        if (value == null) {
          throw FormatException('OfficialPricingRateCondition.operatorCode is required');
        }
        return value;
      })(),
      value: (() {
        final value = json['value']?.toString();
        if (value == null) {
          throw FormatException('OfficialPricingRateCondition.value is required');
        }
        return value;
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'dimensionCode': dimensionCode,
      'operatorCode': operatorCode,
      'value': value,
    };
  }
}

class OfficialPricingRateTier {
  final String currencyCode;
  final String flatAmount;
  final String lowerBound;
  final String tierCode;
  final String unitPrice;
  final String unitSize;
  final String? upperBound;

  OfficialPricingRateTier({
    required this.currencyCode,
    required this.flatAmount,
    required this.lowerBound,
    required this.tierCode,
    required this.unitPrice,
    required this.unitSize,
    this.upperBound
  });

  factory OfficialPricingRateTier.fromJson(Map<String, dynamic> json) {
    return OfficialPricingRateTier(
      currencyCode: (() {
        final value = json['currencyCode']?.toString();
        if (value == null) {
          throw FormatException('OfficialPricingRateTier.currencyCode is required');
        }
        return value;
      })(),
      flatAmount: (() {
        final value = json['flatAmount']?.toString();
        if (value == null) {
          throw FormatException('OfficialPricingRateTier.flatAmount is required');
        }
        return value;
      })(),
      lowerBound: (() {
        final value = json['lowerBound']?.toString();
        if (value == null) {
          throw FormatException('OfficialPricingRateTier.lowerBound is required');
        }
        return value;
      })(),
      tierCode: (() {
        final value = json['tierCode']?.toString();
        if (value == null) {
          throw FormatException('OfficialPricingRateTier.tierCode is required');
        }
        return value;
      })(),
      unitPrice: (() {
        final value = json['unitPrice']?.toString();
        if (value == null) {
          throw FormatException('OfficialPricingRateTier.unitPrice is required');
        }
        return value;
      })(),
      unitSize: (() {
        final value = json['unitSize']?.toString();
        if (value == null) {
          throw FormatException('OfficialPricingRateTier.unitSize is required');
        }
        return value;
      })(),
      upperBound: json['upperBound']?.toString()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'currencyCode': currencyCode,
      'flatAmount': flatAmount,
      'lowerBound': lowerBound,
      'tierCode': tierCode,
      'unitPrice': unitPrice,
      'unitSize': unitSize,
      'upperBound': upperBound,
    };
  }
}

class OfficialPricingRegionFacet {
  final String code;
  final String count;
  final String id;

  OfficialPricingRegionFacet({
    required this.code,
    required this.count,
    required this.id
  });

  factory OfficialPricingRegionFacet.fromJson(Map<String, dynamic> json) {
    return OfficialPricingRegionFacet(
      code: (() {
        final value = json['code']?.toString();
        if (value == null) {
          throw FormatException('OfficialPricingRegionFacet.code is required');
        }
        return value;
      })(),
      count: (() {
        final value = json['count']?.toString();
        if (value == null) {
          throw FormatException('OfficialPricingRegionFacet.count is required');
        }
        return value;
      })(),
      id: (() {
        final value = json['id']?.toString();
        if (value == null) {
          throw FormatException('OfficialPricingRegionFacet.id is required');
        }
        return value;
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'code': code,
      'count': count,
      'id': id,
    };
  }
}

class OfficialPricingValueFacet {
  final String code;
  final String count;
  final String id;

  OfficialPricingValueFacet({
    required this.code,
    required this.count,
    required this.id
  });

  factory OfficialPricingValueFacet.fromJson(Map<String, dynamic> json) {
    return OfficialPricingValueFacet(
      code: (() {
        final value = json['code']?.toString();
        if (value == null) {
          throw FormatException('OfficialPricingValueFacet.code is required');
        }
        return value;
      })(),
      count: (() {
        final value = json['count']?.toString();
        if (value == null) {
          throw FormatException('OfficialPricingValueFacet.count is required');
        }
        return value;
      })(),
      id: (() {
        final value = json['id']?.toString();
        if (value == null) {
          throw FormatException('OfficialPricingValueFacet.id is required');
        }
        return value;
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'code': code,
      'count': count,
      'id': id,
    };
  }
}

class PageInfo {
  final bool? hasMore;
  final String mode;
  final String? nextCursor;
  final int? page;
  final int? pageSize;
  final String? totalItems;
  final int? totalPages;

  PageInfo({
    this.hasMore,
    required this.mode,
    this.nextCursor,
    this.page,
    this.pageSize,
    this.totalItems,
    this.totalPages
  });

  factory PageInfo.fromJson(Map<String, dynamic> json) {
    return PageInfo(
      hasMore: json['hasMore'] is bool ? json['hasMore'] : null,
      mode: (() {
        final value = json['mode']?.toString();
        if (value == null) {
          throw FormatException('PageInfo.mode is required');
        }
        return value;
      })(),
      nextCursor: json['nextCursor']?.toString(),
      page: json['page'] is int ? json['page'] : null,
      pageSize: json['pageSize'] is int ? json['pageSize'] : null,
      totalItems: json['totalItems']?.toString(),
      totalPages: json['totalPages'] is int ? json['totalPages'] : null
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'hasMore': hasMore,
      'mode': mode,
      'nextCursor': nextCursor,
      'page': page,
      'pageSize': pageSize,
      'totalItems': totalItems,
      'totalPages': totalPages,
    };
  }
}

class PricingRatesListResult {
  final int code;
  final dynamic data;
  final String traceId;

  PricingRatesListResult({
    required this.code,
    required this.data,
    required this.traceId
  });

  factory PricingRatesListResult.fromJson(Map<String, dynamic> json) {
    return PricingRatesListResult(
      code: (() {
        final value = json['code'];
        if (value is! int) {
          throw FormatException('PricingRatesListResult.code is required');
        }
        return value;
      })(),
      data: json['data'],
      traceId: (() {
        final value = json['traceId']?.toString();
        if (value == null) {
          throw FormatException('PricingRatesListResult.traceId is required');
        }
        return value;
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'code': code,
      'data': data,
      'traceId': traceId,
    };
  }
}

class ProblemDetail {
  final int code;
  final String? detail;
  final List<FieldError>? errors;
  final String? i18nKey;
  final String? instance;
  final String? locale;
  final int status;
  final String title;
  final String traceId;
  final String type;

  ProblemDetail({
    required this.code,
    this.detail,
    this.errors,
    this.i18nKey,
    this.instance,
    this.locale,
    required this.status,
    required this.title,
    required this.traceId,
    required this.type
  });

  factory ProblemDetail.fromJson(Map<String, dynamic> json) {
    return ProblemDetail(
      code: (() {
        final value = json['code'];
        if (value is! int) {
          throw FormatException('ProblemDetail.code is required');
        }
        return value;
      })(),
      detail: json['detail']?.toString(),
      errors: (() {
        final list = _sdkworkAsList(json['errors']);
        if (list == null) {
          return null;
        }
        return list
            .map((item) => (() {
        final map = _sdkworkAsMap(item);
        return map == null ? null : FieldError.fromJson(map);
      })())
            .whereType<FieldError>()
            .toList();
      })(),
      i18nKey: json['i18nKey']?.toString(),
      instance: json['instance']?.toString(),
      locale: json['locale']?.toString(),
      status: (() {
        final value = json['status'];
        if (value is! int) {
          throw FormatException('ProblemDetail.status is required');
        }
        return value;
      })(),
      title: (() {
        final value = json['title']?.toString();
        if (value == null) {
          throw FormatException('ProblemDetail.title is required');
        }
        return value;
      })(),
      traceId: (() {
        final value = json['traceId']?.toString();
        if (value == null) {
          throw FormatException('ProblemDetail.traceId is required');
        }
        return value;
      })(),
      type: (() {
        final value = json['type']?.toString();
        if (value == null) {
          throw FormatException('ProblemDetail.type is required');
        }
        return value;
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'code': code,
      'detail': detail,
      'errors': errors?.map((item) => item.toJson()).toList(),
      'i18nKey': i18nKey,
      'instance': instance,
      'locale': locale,
      'status': status,
      'title': title,
      'traceId': traceId,
      'type': type,
    };
  }
}

class RoutingAccountGroupsListResult {
  final int code;
  final dynamic data;
  final String traceId;

  RoutingAccountGroupsListResult({
    required this.code,
    required this.data,
    required this.traceId
  });

  factory RoutingAccountGroupsListResult.fromJson(Map<String, dynamic> json) {
    return RoutingAccountGroupsListResult(
      code: (() {
        final value = json['code'];
        if (value is! int) {
          throw FormatException('RoutingAccountGroupsListResult.code is required');
        }
        return value;
      })(),
      data: json['data'],
      traceId: (() {
        final value = json['traceId']?.toString();
        if (value == null) {
          throw FormatException('RoutingAccountGroupsListResult.traceId is required');
        }
        return value;
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'code': code,
      'data': data,
      'traceId': traceId,
    };
  }
}

class RoutingApiKeysListResult {
  final int code;
  final dynamic data;
  final String traceId;

  RoutingApiKeysListResult({
    required this.code,
    required this.data,
    required this.traceId
  });

  factory RoutingApiKeysListResult.fromJson(Map<String, dynamic> json) {
    return RoutingApiKeysListResult(
      code: (() {
        final value = json['code'];
        if (value is! int) {
          throw FormatException('RoutingApiKeysListResult.code is required');
        }
        return value;
      })(),
      data: json['data'],
      traceId: (() {
        final value = json['traceId']?.toString();
        if (value == null) {
          throw FormatException('RoutingApiKeysListResult.traceId is required');
        }
        return value;
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'code': code,
      'data': data,
      'traceId': traceId,
    };
  }
}

class RoutingModelGroupCatalogRetrieveResult {
  final int code;
  final dynamic data;
  final String traceId;

  RoutingModelGroupCatalogRetrieveResult({
    required this.code,
    required this.data,
    required this.traceId
  });

  factory RoutingModelGroupCatalogRetrieveResult.fromJson(Map<String, dynamic> json) {
    return RoutingModelGroupCatalogRetrieveResult(
      code: (() {
        final value = json['code'];
        if (value is! int) {
          throw FormatException('RoutingModelGroupCatalogRetrieveResult.code is required');
        }
        return value;
      })(),
      data: json['data'],
      traceId: (() {
        final value = json['traceId']?.toString();
        if (value == null) {
          throw FormatException('RoutingModelGroupCatalogRetrieveResult.traceId is required');
        }
        return value;
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'code': code,
      'data': data,
      'traceId': traceId,
    };
  }
}

class RoutingModelGroupDefaultsRetrieveResult {
  final int code;
  final dynamic data;
  final String traceId;

  RoutingModelGroupDefaultsRetrieveResult({
    required this.code,
    required this.data,
    required this.traceId
  });

  factory RoutingModelGroupDefaultsRetrieveResult.fromJson(Map<String, dynamic> json) {
    return RoutingModelGroupDefaultsRetrieveResult(
      code: (() {
        final value = json['code'];
        if (value is! int) {
          throw FormatException('RoutingModelGroupDefaultsRetrieveResult.code is required');
        }
        return value;
      })(),
      data: json['data'],
      traceId: (() {
        final value = json['traceId']?.toString();
        if (value == null) {
          throw FormatException('RoutingModelGroupDefaultsRetrieveResult.traceId is required');
        }
        return value;
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'code': code,
      'data': data,
      'traceId': traceId,
    };
  }
}

class RoutingModelGroupDefaultsUpdateResult {
  final int code;
  final dynamic data;
  final String traceId;

  RoutingModelGroupDefaultsUpdateResult({
    required this.code,
    required this.data,
    required this.traceId
  });

  factory RoutingModelGroupDefaultsUpdateResult.fromJson(Map<String, dynamic> json) {
    return RoutingModelGroupDefaultsUpdateResult(
      code: (() {
        final value = json['code'];
        if (value is! int) {
          throw FormatException('RoutingModelGroupDefaultsUpdateResult.code is required');
        }
        return value;
      })(),
      data: json['data'],
      traceId: (() {
        final value = json['traceId']?.toString();
        if (value == null) {
          throw FormatException('RoutingModelGroupDefaultsUpdateResult.traceId is required');
        }
        return value;
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'code': code,
      'data': data,
      'traceId': traceId,
    };
  }
}

class RoutingModelGroupsRetrieveResult {
  final int code;
  final dynamic data;
  final String traceId;

  RoutingModelGroupsRetrieveResult({
    required this.code,
    required this.data,
    required this.traceId
  });

  factory RoutingModelGroupsRetrieveResult.fromJson(Map<String, dynamic> json) {
    return RoutingModelGroupsRetrieveResult(
      code: (() {
        final value = json['code'];
        if (value is! int) {
          throw FormatException('RoutingModelGroupsRetrieveResult.code is required');
        }
        return value;
      })(),
      data: json['data'],
      traceId: (() {
        final value = json['traceId']?.toString();
        if (value == null) {
          throw FormatException('RoutingModelGroupsRetrieveResult.traceId is required');
        }
        return value;
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'code': code,
      'data': data,
      'traceId': traceId,
    };
  }
}

class RoutingRequestTracesListResult {
  final int code;
  final dynamic data;
  final String traceId;

  RoutingRequestTracesListResult({
    required this.code,
    required this.data,
    required this.traceId
  });

  factory RoutingRequestTracesListResult.fromJson(Map<String, dynamic> json) {
    return RoutingRequestTracesListResult(
      code: (() {
        final value = json['code'];
        if (value is! int) {
          throw FormatException('RoutingRequestTracesListResult.code is required');
        }
        return value;
      })(),
      data: json['data'],
      traceId: (() {
        final value = json['traceId']?.toString();
        if (value == null) {
          throw FormatException('RoutingRequestTracesListResult.traceId is required');
        }
        return value;
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'code': code,
      'data': data,
      'traceId': traceId,
    };
  }
}

class RoutingUsageRetrieveResult {
  final int code;
  final dynamic data;
  final String traceId;

  RoutingUsageRetrieveResult({
    required this.code,
    required this.data,
    required this.traceId
  });

  factory RoutingUsageRetrieveResult.fromJson(Map<String, dynamic> json) {
    return RoutingUsageRetrieveResult(
      code: (() {
        final value = json['code'];
        if (value is! int) {
          throw FormatException('RoutingUsageRetrieveResult.code is required');
        }
        return value;
      })(),
      data: json['data'],
      traceId: (() {
        final value = json['traceId']?.toString();
        if (value == null) {
          throw FormatException('RoutingUsageRetrieveResult.traceId is required');
        }
        return value;
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'code': code,
      'data': data,
      'traceId': traceId,
    };
  }
}

class RuntimeArtifactItem {
  final String artifactType;
  final String? contentText;
  final String createdAt;
  final String id;
  final String invocationId;
  final String? mimeType;
  final String? name;
  final MediaResource resource;
  final String? sha256;
  final String? sizeBytes;
  final String? storageKey;

  RuntimeArtifactItem({
    required this.artifactType,
    required this.contentText,
    required this.createdAt,
    required this.id,
    required this.invocationId,
    required this.mimeType,
    required this.name,
    required this.resource,
    required this.sha256,
    required this.sizeBytes,
    required this.storageKey
  });

  factory RuntimeArtifactItem.fromJson(Map<String, dynamic> json) {
    return RuntimeArtifactItem(
      artifactType: (() {
        final value = json['artifactType']?.toString();
        if (value == null) {
          throw FormatException('RuntimeArtifactItem.artifactType is required');
        }
        return value;
      })(),
      contentText: (() {
        if (!json.containsKey('contentText')) {
          throw FormatException('RuntimeArtifactItem.contentText is required');
        }
        final _sdkworkRequiredValue = json['contentText'];
        if (_sdkworkRequiredValue == null) {
          return null;
        }
        return (() {
        final value = _sdkworkRequiredValue?.toString();
        if (value == null) {
          throw FormatException('RuntimeArtifactItem.contentText is required');
        }
        return value;
      })();
      })(),
      createdAt: (() {
        final value = json['createdAt']?.toString();
        if (value == null) {
          throw FormatException('RuntimeArtifactItem.createdAt is required');
        }
        return value;
      })(),
      id: (() {
        final value = json['id']?.toString();
        if (value == null) {
          throw FormatException('RuntimeArtifactItem.id is required');
        }
        return value;
      })(),
      invocationId: (() {
        final value = json['invocationId']?.toString();
        if (value == null) {
          throw FormatException('RuntimeArtifactItem.invocationId is required');
        }
        return value;
      })(),
      mimeType: (() {
        if (!json.containsKey('mimeType')) {
          throw FormatException('RuntimeArtifactItem.mimeType is required');
        }
        final _sdkworkRequiredValue = json['mimeType'];
        if (_sdkworkRequiredValue == null) {
          return null;
        }
        return (() {
        final value = _sdkworkRequiredValue?.toString();
        if (value == null) {
          throw FormatException('RuntimeArtifactItem.mimeType is required');
        }
        return value;
      })();
      })(),
      name: (() {
        if (!json.containsKey('name')) {
          throw FormatException('RuntimeArtifactItem.name is required');
        }
        final _sdkworkRequiredValue = json['name'];
        if (_sdkworkRequiredValue == null) {
          return null;
        }
        return (() {
        final value = _sdkworkRequiredValue?.toString();
        if (value == null) {
          throw FormatException('RuntimeArtifactItem.name is required');
        }
        return value;
      })();
      })(),
      resource: (() {
        final map = _sdkworkAsMap(json['resource']);
        if (map == null) {
          throw FormatException('RuntimeArtifactItem.resource is required');
        }
        return MediaResource.fromJson(map);
      })(),
      sha256: (() {
        if (!json.containsKey('sha256')) {
          throw FormatException('RuntimeArtifactItem.sha256 is required');
        }
        final _sdkworkRequiredValue = json['sha256'];
        if (_sdkworkRequiredValue == null) {
          return null;
        }
        return (() {
        final value = _sdkworkRequiredValue?.toString();
        if (value == null) {
          throw FormatException('RuntimeArtifactItem.sha256 is required');
        }
        return value;
      })();
      })(),
      sizeBytes: (() {
        if (!json.containsKey('sizeBytes')) {
          throw FormatException('RuntimeArtifactItem.sizeBytes is required');
        }
        final _sdkworkRequiredValue = json['sizeBytes'];
        if (_sdkworkRequiredValue == null) {
          return null;
        }
        return (() {
        final value = _sdkworkRequiredValue?.toString();
        if (value == null) {
          throw FormatException('RuntimeArtifactItem.sizeBytes is required');
        }
        return value;
      })();
      })(),
      storageKey: (() {
        if (!json.containsKey('storageKey')) {
          throw FormatException('RuntimeArtifactItem.storageKey is required');
        }
        final _sdkworkRequiredValue = json['storageKey'];
        if (_sdkworkRequiredValue == null) {
          return null;
        }
        return (() {
        final value = _sdkworkRequiredValue?.toString();
        if (value == null) {
          throw FormatException('RuntimeArtifactItem.storageKey is required');
        }
        return value;
      })();
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'artifactType': artifactType,
      'contentText': contentText,
      'createdAt': createdAt,
      'id': id,
      'invocationId': invocationId,
      'mimeType': mimeType,
      'name': name,
      'resource': resource.toJson(),
      'sha256': sha256,
      'sizeBytes': sizeBytes,
      'storageKey': storageKey,
    };
  }
}

class RuntimeArtifactListResponse {
  final List<RuntimeArtifactItem> items;
  final PageInfo pageInfo;

  RuntimeArtifactListResponse({
    required this.items,
    required this.pageInfo
  });

  factory RuntimeArtifactListResponse.fromJson(Map<String, dynamic> json) {
    return RuntimeArtifactListResponse(
      items: (() {
        final list = _sdkworkAsList(json['items']);
        if (list == null) {
          throw FormatException('RuntimeArtifactListResponse.items is required');
        }
        return list
            .map((item) => (() {
        final map = _sdkworkAsMap(item);
        return map == null ? null : RuntimeArtifactItem.fromJson(map);
      })())
            .whereType<RuntimeArtifactItem>()
            .toList();
      })(),
      pageInfo: (() {
        final map = _sdkworkAsMap(json['pageInfo']);
        if (map == null) {
          throw FormatException('RuntimeArtifactListResponse.pageInfo is required');
        }
        return PageInfo.fromJson(map);
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'items': items.map((item) => item.toJson()).toList(),
      'pageInfo': pageInfo.toJson(),
    };
  }
}

class RuntimeArtifactResponse {
  final RuntimeArtifactItem item;

  RuntimeArtifactResponse({
    required this.item
  });

  factory RuntimeArtifactResponse.fromJson(Map<String, dynamic> json) {
    return RuntimeArtifactResponse(
      item: (() {
        final map = _sdkworkAsMap(json['item']);
        if (map == null) {
          throw FormatException('RuntimeArtifactResponse.item is required');
        }
        return RuntimeArtifactItem.fromJson(map);
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'item': item.toJson(),
    };
  }
}

class RuntimeEventItem {
  final String createdAt;
  final String eventNo;
  final String eventSource;
  final String eventType;
  final String id;
  final String invocationId;
  final Map<String, dynamic> payloadJson;
  final String? textDelta;

  RuntimeEventItem({
    required this.createdAt,
    required this.eventNo,
    required this.eventSource,
    required this.eventType,
    required this.id,
    required this.invocationId,
    required this.payloadJson,
    required this.textDelta
  });

  factory RuntimeEventItem.fromJson(Map<String, dynamic> json) {
    return RuntimeEventItem(
      createdAt: (() {
        final value = json['createdAt']?.toString();
        if (value == null) {
          throw FormatException('RuntimeEventItem.createdAt is required');
        }
        return value;
      })(),
      eventNo: (() {
        final value = json['eventNo']?.toString();
        if (value == null) {
          throw FormatException('RuntimeEventItem.eventNo is required');
        }
        return value;
      })(),
      eventSource: (() {
        final value = json['eventSource']?.toString();
        if (value == null) {
          throw FormatException('RuntimeEventItem.eventSource is required');
        }
        return value;
      })(),
      eventType: (() {
        final value = json['eventType']?.toString();
        if (value == null) {
          throw FormatException('RuntimeEventItem.eventType is required');
        }
        return value;
      })(),
      id: (() {
        final value = json['id']?.toString();
        if (value == null) {
          throw FormatException('RuntimeEventItem.id is required');
        }
        return value;
      })(),
      invocationId: (() {
        final value = json['invocationId']?.toString();
        if (value == null) {
          throw FormatException('RuntimeEventItem.invocationId is required');
        }
        return value;
      })(),
      payloadJson: (() {
        final map = _sdkworkAsMap(json['payloadJson']);
        if (map == null) {
          throw FormatException('RuntimeEventItem.payloadJson is required');
        }
        final result = <String, String>{};
        map.forEach((key, item) {
          final deserialized = item?.toString();
          if (deserialized is String) {
            result[key] = deserialized;
          }
        });
        return result;
      })(),
      textDelta: (() {
        if (!json.containsKey('textDelta')) {
          throw FormatException('RuntimeEventItem.textDelta is required');
        }
        final _sdkworkRequiredValue = json['textDelta'];
        if (_sdkworkRequiredValue == null) {
          return null;
        }
        return (() {
        final value = _sdkworkRequiredValue?.toString();
        if (value == null) {
          throw FormatException('RuntimeEventItem.textDelta is required');
        }
        return value;
      })();
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'createdAt': createdAt,
      'eventNo': eventNo,
      'eventSource': eventSource,
      'eventType': eventType,
      'id': id,
      'invocationId': invocationId,
      'payloadJson': payloadJson.map((key, item) => MapEntry(key, item)),
      'textDelta': textDelta,
    };
  }
}

class RuntimeEventListResponse {
  final List<RuntimeEventItem> items;
  final PageInfo pageInfo;

  RuntimeEventListResponse({
    required this.items,
    required this.pageInfo
  });

  factory RuntimeEventListResponse.fromJson(Map<String, dynamic> json) {
    return RuntimeEventListResponse(
      items: (() {
        final list = _sdkworkAsList(json['items']);
        if (list == null) {
          throw FormatException('RuntimeEventListResponse.items is required');
        }
        return list
            .map((item) => (() {
        final map = _sdkworkAsMap(item);
        return map == null ? null : RuntimeEventItem.fromJson(map);
      })())
            .whereType<RuntimeEventItem>()
            .toList();
      })(),
      pageInfo: (() {
        final map = _sdkworkAsMap(json['pageInfo']);
        if (map == null) {
          throw FormatException('RuntimeEventListResponse.pageInfo is required');
        }
        return PageInfo.fromJson(map);
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'items': items.map((item) => item.toJson()).toList(),
      'pageInfo': pageInfo.toJson(),
    };
  }
}

class RuntimeEventResponse {
  final RuntimeEventItem item;

  RuntimeEventResponse({
    required this.item
  });

  factory RuntimeEventResponse.fromJson(Map<String, dynamic> json) {
    return RuntimeEventResponse(
      item: (() {
        final map = _sdkworkAsMap(json['item']);
        if (map == null) {
          throw FormatException('RuntimeEventResponse.item is required');
        }
        return RuntimeEventItem.fromJson(map);
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'item': item.toJson(),
    };
  }
}

class RuntimeInvocationItem {
  final String? agentRunId;
  final String? agentRunStepId;
  final String? agentSessionId;
  final String? approvalPolicy;
  final String attemptNo;
  final String? chatItemId;
  final String? chatTurnId;
  final String? completedAt;
  final String? conversationId;
  final String createdAt;
  final String? cwd;
  final String? endpoint;
  final String? errorCode;
  final String? errorMessageMasked;
  final String? errorType;
  final String? exitCode;
  final String? finishReason;
  final String id;
  final String invocationNo;
  final String invocationType;
  final String? latencyMs;
  final String? model;
  final String? permissionMode;
  final String? provider;
  final String? providerConversationId;
  final String? providerResponseId;
  final String? providerSessionId;
  final String? providerStepId;
  final String runtime;
  final String? sandboxPolicy;
  final String? startedAt;
  final String status;
  final bool streaming;
  final String? toolCallId;
  final String? toolName;
  final String? traceId;
  final String? ttftMs;

  RuntimeInvocationItem({
    required this.agentRunId,
    required this.agentRunStepId,
    required this.agentSessionId,
    required this.approvalPolicy,
    required this.attemptNo,
    required this.chatItemId,
    required this.chatTurnId,
    required this.completedAt,
    required this.conversationId,
    required this.createdAt,
    required this.cwd,
    required this.endpoint,
    required this.errorCode,
    required this.errorMessageMasked,
    required this.errorType,
    required this.exitCode,
    required this.finishReason,
    required this.id,
    required this.invocationNo,
    required this.invocationType,
    required this.latencyMs,
    required this.model,
    required this.permissionMode,
    required this.provider,
    required this.providerConversationId,
    required this.providerResponseId,
    required this.providerSessionId,
    required this.providerStepId,
    required this.runtime,
    required this.sandboxPolicy,
    required this.startedAt,
    required this.status,
    required this.streaming,
    required this.toolCallId,
    required this.toolName,
    required this.traceId,
    required this.ttftMs
  });

  factory RuntimeInvocationItem.fromJson(Map<String, dynamic> json) {
    return RuntimeInvocationItem(
      agentRunId: (() {
        if (!json.containsKey('agentRunId')) {
          throw FormatException('RuntimeInvocationItem.agentRunId is required');
        }
        final _sdkworkRequiredValue = json['agentRunId'];
        if (_sdkworkRequiredValue == null) {
          return null;
        }
        return (() {
        final value = _sdkworkRequiredValue?.toString();
        if (value == null) {
          throw FormatException('RuntimeInvocationItem.agentRunId is required');
        }
        return value;
      })();
      })(),
      agentRunStepId: (() {
        if (!json.containsKey('agentRunStepId')) {
          throw FormatException('RuntimeInvocationItem.agentRunStepId is required');
        }
        final _sdkworkRequiredValue = json['agentRunStepId'];
        if (_sdkworkRequiredValue == null) {
          return null;
        }
        return (() {
        final value = _sdkworkRequiredValue?.toString();
        if (value == null) {
          throw FormatException('RuntimeInvocationItem.agentRunStepId is required');
        }
        return value;
      })();
      })(),
      agentSessionId: (() {
        if (!json.containsKey('agentSessionId')) {
          throw FormatException('RuntimeInvocationItem.agentSessionId is required');
        }
        final _sdkworkRequiredValue = json['agentSessionId'];
        if (_sdkworkRequiredValue == null) {
          return null;
        }
        return (() {
        final value = _sdkworkRequiredValue?.toString();
        if (value == null) {
          throw FormatException('RuntimeInvocationItem.agentSessionId is required');
        }
        return value;
      })();
      })(),
      approvalPolicy: (() {
        if (!json.containsKey('approvalPolicy')) {
          throw FormatException('RuntimeInvocationItem.approvalPolicy is required');
        }
        final _sdkworkRequiredValue = json['approvalPolicy'];
        if (_sdkworkRequiredValue == null) {
          return null;
        }
        return (() {
        final value = _sdkworkRequiredValue?.toString();
        if (value == null) {
          throw FormatException('RuntimeInvocationItem.approvalPolicy is required');
        }
        return value;
      })();
      })(),
      attemptNo: (() {
        final value = json['attemptNo']?.toString();
        if (value == null) {
          throw FormatException('RuntimeInvocationItem.attemptNo is required');
        }
        return value;
      })(),
      chatItemId: (() {
        if (!json.containsKey('chatItemId')) {
          throw FormatException('RuntimeInvocationItem.chatItemId is required');
        }
        final _sdkworkRequiredValue = json['chatItemId'];
        if (_sdkworkRequiredValue == null) {
          return null;
        }
        return (() {
        final value = _sdkworkRequiredValue?.toString();
        if (value == null) {
          throw FormatException('RuntimeInvocationItem.chatItemId is required');
        }
        return value;
      })();
      })(),
      chatTurnId: (() {
        if (!json.containsKey('chatTurnId')) {
          throw FormatException('RuntimeInvocationItem.chatTurnId is required');
        }
        final _sdkworkRequiredValue = json['chatTurnId'];
        if (_sdkworkRequiredValue == null) {
          return null;
        }
        return (() {
        final value = _sdkworkRequiredValue?.toString();
        if (value == null) {
          throw FormatException('RuntimeInvocationItem.chatTurnId is required');
        }
        return value;
      })();
      })(),
      completedAt: (() {
        if (!json.containsKey('completedAt')) {
          throw FormatException('RuntimeInvocationItem.completedAt is required');
        }
        final _sdkworkRequiredValue = json['completedAt'];
        if (_sdkworkRequiredValue == null) {
          return null;
        }
        return (() {
        final value = _sdkworkRequiredValue?.toString();
        if (value == null) {
          throw FormatException('RuntimeInvocationItem.completedAt is required');
        }
        return value;
      })();
      })(),
      conversationId: (() {
        if (!json.containsKey('conversationId')) {
          throw FormatException('RuntimeInvocationItem.conversationId is required');
        }
        final _sdkworkRequiredValue = json['conversationId'];
        if (_sdkworkRequiredValue == null) {
          return null;
        }
        return (() {
        final value = _sdkworkRequiredValue?.toString();
        if (value == null) {
          throw FormatException('RuntimeInvocationItem.conversationId is required');
        }
        return value;
      })();
      })(),
      createdAt: (() {
        final value = json['createdAt']?.toString();
        if (value == null) {
          throw FormatException('RuntimeInvocationItem.createdAt is required');
        }
        return value;
      })(),
      cwd: (() {
        if (!json.containsKey('cwd')) {
          throw FormatException('RuntimeInvocationItem.cwd is required');
        }
        final _sdkworkRequiredValue = json['cwd'];
        if (_sdkworkRequiredValue == null) {
          return null;
        }
        return (() {
        final value = _sdkworkRequiredValue?.toString();
        if (value == null) {
          throw FormatException('RuntimeInvocationItem.cwd is required');
        }
        return value;
      })();
      })(),
      endpoint: (() {
        if (!json.containsKey('endpoint')) {
          throw FormatException('RuntimeInvocationItem.endpoint is required');
        }
        final _sdkworkRequiredValue = json['endpoint'];
        if (_sdkworkRequiredValue == null) {
          return null;
        }
        return (() {
        final value = _sdkworkRequiredValue?.toString();
        if (value == null) {
          throw FormatException('RuntimeInvocationItem.endpoint is required');
        }
        return value;
      })();
      })(),
      errorCode: (() {
        if (!json.containsKey('errorCode')) {
          throw FormatException('RuntimeInvocationItem.errorCode is required');
        }
        final _sdkworkRequiredValue = json['errorCode'];
        if (_sdkworkRequiredValue == null) {
          return null;
        }
        return (() {
        final value = _sdkworkRequiredValue?.toString();
        if (value == null) {
          throw FormatException('RuntimeInvocationItem.errorCode is required');
        }
        return value;
      })();
      })(),
      errorMessageMasked: (() {
        if (!json.containsKey('errorMessageMasked')) {
          throw FormatException('RuntimeInvocationItem.errorMessageMasked is required');
        }
        final _sdkworkRequiredValue = json['errorMessageMasked'];
        if (_sdkworkRequiredValue == null) {
          return null;
        }
        return (() {
        final value = _sdkworkRequiredValue?.toString();
        if (value == null) {
          throw FormatException('RuntimeInvocationItem.errorMessageMasked is required');
        }
        return value;
      })();
      })(),
      errorType: (() {
        if (!json.containsKey('errorType')) {
          throw FormatException('RuntimeInvocationItem.errorType is required');
        }
        final _sdkworkRequiredValue = json['errorType'];
        if (_sdkworkRequiredValue == null) {
          return null;
        }
        return (() {
        final value = _sdkworkRequiredValue?.toString();
        if (value == null) {
          throw FormatException('RuntimeInvocationItem.errorType is required');
        }
        return value;
      })();
      })(),
      exitCode: (() {
        if (!json.containsKey('exitCode')) {
          throw FormatException('RuntimeInvocationItem.exitCode is required');
        }
        final _sdkworkRequiredValue = json['exitCode'];
        if (_sdkworkRequiredValue == null) {
          return null;
        }
        return (() {
        final value = _sdkworkRequiredValue?.toString();
        if (value == null) {
          throw FormatException('RuntimeInvocationItem.exitCode is required');
        }
        return value;
      })();
      })(),
      finishReason: (() {
        if (!json.containsKey('finishReason')) {
          throw FormatException('RuntimeInvocationItem.finishReason is required');
        }
        final _sdkworkRequiredValue = json['finishReason'];
        if (_sdkworkRequiredValue == null) {
          return null;
        }
        return (() {
        final value = _sdkworkRequiredValue?.toString();
        if (value == null) {
          throw FormatException('RuntimeInvocationItem.finishReason is required');
        }
        return value;
      })();
      })(),
      id: (() {
        final value = json['id']?.toString();
        if (value == null) {
          throw FormatException('RuntimeInvocationItem.id is required');
        }
        return value;
      })(),
      invocationNo: (() {
        final value = json['invocationNo']?.toString();
        if (value == null) {
          throw FormatException('RuntimeInvocationItem.invocationNo is required');
        }
        return value;
      })(),
      invocationType: (() {
        final value = json['invocationType']?.toString();
        if (value == null) {
          throw FormatException('RuntimeInvocationItem.invocationType is required');
        }
        return value;
      })(),
      latencyMs: (() {
        if (!json.containsKey('latencyMs')) {
          throw FormatException('RuntimeInvocationItem.latencyMs is required');
        }
        final _sdkworkRequiredValue = json['latencyMs'];
        if (_sdkworkRequiredValue == null) {
          return null;
        }
        return (() {
        final value = _sdkworkRequiredValue?.toString();
        if (value == null) {
          throw FormatException('RuntimeInvocationItem.latencyMs is required');
        }
        return value;
      })();
      })(),
      model: (() {
        if (!json.containsKey('model')) {
          throw FormatException('RuntimeInvocationItem.model is required');
        }
        final _sdkworkRequiredValue = json['model'];
        if (_sdkworkRequiredValue == null) {
          return null;
        }
        return (() {
        final value = _sdkworkRequiredValue?.toString();
        if (value == null) {
          throw FormatException('RuntimeInvocationItem.model is required');
        }
        return value;
      })();
      })(),
      permissionMode: (() {
        if (!json.containsKey('permissionMode')) {
          throw FormatException('RuntimeInvocationItem.permissionMode is required');
        }
        final _sdkworkRequiredValue = json['permissionMode'];
        if (_sdkworkRequiredValue == null) {
          return null;
        }
        return (() {
        final value = _sdkworkRequiredValue?.toString();
        if (value == null) {
          throw FormatException('RuntimeInvocationItem.permissionMode is required');
        }
        return value;
      })();
      })(),
      provider: (() {
        if (!json.containsKey('provider')) {
          throw FormatException('RuntimeInvocationItem.provider is required');
        }
        final _sdkworkRequiredValue = json['provider'];
        if (_sdkworkRequiredValue == null) {
          return null;
        }
        return (() {
        final value = _sdkworkRequiredValue?.toString();
        if (value == null) {
          throw FormatException('RuntimeInvocationItem.provider is required');
        }
        return value;
      })();
      })(),
      providerConversationId: (() {
        if (!json.containsKey('providerConversationId')) {
          throw FormatException('RuntimeInvocationItem.providerConversationId is required');
        }
        final _sdkworkRequiredValue = json['providerConversationId'];
        if (_sdkworkRequiredValue == null) {
          return null;
        }
        return (() {
        final value = _sdkworkRequiredValue?.toString();
        if (value == null) {
          throw FormatException('RuntimeInvocationItem.providerConversationId is required');
        }
        return value;
      })();
      })(),
      providerResponseId: (() {
        if (!json.containsKey('providerResponseId')) {
          throw FormatException('RuntimeInvocationItem.providerResponseId is required');
        }
        final _sdkworkRequiredValue = json['providerResponseId'];
        if (_sdkworkRequiredValue == null) {
          return null;
        }
        return (() {
        final value = _sdkworkRequiredValue?.toString();
        if (value == null) {
          throw FormatException('RuntimeInvocationItem.providerResponseId is required');
        }
        return value;
      })();
      })(),
      providerSessionId: (() {
        if (!json.containsKey('providerSessionId')) {
          throw FormatException('RuntimeInvocationItem.providerSessionId is required');
        }
        final _sdkworkRequiredValue = json['providerSessionId'];
        if (_sdkworkRequiredValue == null) {
          return null;
        }
        return (() {
        final value = _sdkworkRequiredValue?.toString();
        if (value == null) {
          throw FormatException('RuntimeInvocationItem.providerSessionId is required');
        }
        return value;
      })();
      })(),
      providerStepId: (() {
        if (!json.containsKey('providerStepId')) {
          throw FormatException('RuntimeInvocationItem.providerStepId is required');
        }
        final _sdkworkRequiredValue = json['providerStepId'];
        if (_sdkworkRequiredValue == null) {
          return null;
        }
        return (() {
        final value = _sdkworkRequiredValue?.toString();
        if (value == null) {
          throw FormatException('RuntimeInvocationItem.providerStepId is required');
        }
        return value;
      })();
      })(),
      runtime: (() {
        final value = json['runtime']?.toString();
        if (value == null) {
          throw FormatException('RuntimeInvocationItem.runtime is required');
        }
        return value;
      })(),
      sandboxPolicy: (() {
        if (!json.containsKey('sandboxPolicy')) {
          throw FormatException('RuntimeInvocationItem.sandboxPolicy is required');
        }
        final _sdkworkRequiredValue = json['sandboxPolicy'];
        if (_sdkworkRequiredValue == null) {
          return null;
        }
        return (() {
        final value = _sdkworkRequiredValue?.toString();
        if (value == null) {
          throw FormatException('RuntimeInvocationItem.sandboxPolicy is required');
        }
        return value;
      })();
      })(),
      startedAt: (() {
        if (!json.containsKey('startedAt')) {
          throw FormatException('RuntimeInvocationItem.startedAt is required');
        }
        final _sdkworkRequiredValue = json['startedAt'];
        if (_sdkworkRequiredValue == null) {
          return null;
        }
        return (() {
        final value = _sdkworkRequiredValue?.toString();
        if (value == null) {
          throw FormatException('RuntimeInvocationItem.startedAt is required');
        }
        return value;
      })();
      })(),
      status: (() {
        final value = json['status']?.toString();
        if (value == null) {
          throw FormatException('RuntimeInvocationItem.status is required');
        }
        return value;
      })(),
      streaming: (() {
        final value = json['streaming'];
        if (value is! bool) {
          throw FormatException('RuntimeInvocationItem.streaming is required');
        }
        return value;
      })(),
      toolCallId: (() {
        if (!json.containsKey('toolCallId')) {
          throw FormatException('RuntimeInvocationItem.toolCallId is required');
        }
        final _sdkworkRequiredValue = json['toolCallId'];
        if (_sdkworkRequiredValue == null) {
          return null;
        }
        return (() {
        final value = _sdkworkRequiredValue?.toString();
        if (value == null) {
          throw FormatException('RuntimeInvocationItem.toolCallId is required');
        }
        return value;
      })();
      })(),
      toolName: (() {
        if (!json.containsKey('toolName')) {
          throw FormatException('RuntimeInvocationItem.toolName is required');
        }
        final _sdkworkRequiredValue = json['toolName'];
        if (_sdkworkRequiredValue == null) {
          return null;
        }
        return (() {
        final value = _sdkworkRequiredValue?.toString();
        if (value == null) {
          throw FormatException('RuntimeInvocationItem.toolName is required');
        }
        return value;
      })();
      })(),
      traceId: (() {
        if (!json.containsKey('traceId')) {
          throw FormatException('RuntimeInvocationItem.traceId is required');
        }
        final _sdkworkRequiredValue = json['traceId'];
        if (_sdkworkRequiredValue == null) {
          return null;
        }
        return (() {
        final value = _sdkworkRequiredValue?.toString();
        if (value == null) {
          throw FormatException('RuntimeInvocationItem.traceId is required');
        }
        return value;
      })();
      })(),
      ttftMs: (() {
        if (!json.containsKey('ttftMs')) {
          throw FormatException('RuntimeInvocationItem.ttftMs is required');
        }
        final _sdkworkRequiredValue = json['ttftMs'];
        if (_sdkworkRequiredValue == null) {
          return null;
        }
        return (() {
        final value = _sdkworkRequiredValue?.toString();
        if (value == null) {
          throw FormatException('RuntimeInvocationItem.ttftMs is required');
        }
        return value;
      })();
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'agentRunId': agentRunId,
      'agentRunStepId': agentRunStepId,
      'agentSessionId': agentSessionId,
      'approvalPolicy': approvalPolicy,
      'attemptNo': attemptNo,
      'chatItemId': chatItemId,
      'chatTurnId': chatTurnId,
      'completedAt': completedAt,
      'conversationId': conversationId,
      'createdAt': createdAt,
      'cwd': cwd,
      'endpoint': endpoint,
      'errorCode': errorCode,
      'errorMessageMasked': errorMessageMasked,
      'errorType': errorType,
      'exitCode': exitCode,
      'finishReason': finishReason,
      'id': id,
      'invocationNo': invocationNo,
      'invocationType': invocationType,
      'latencyMs': latencyMs,
      'model': model,
      'permissionMode': permissionMode,
      'provider': provider,
      'providerConversationId': providerConversationId,
      'providerResponseId': providerResponseId,
      'providerSessionId': providerSessionId,
      'providerStepId': providerStepId,
      'runtime': runtime,
      'sandboxPolicy': sandboxPolicy,
      'startedAt': startedAt,
      'status': status,
      'streaming': streaming,
      'toolCallId': toolCallId,
      'toolName': toolName,
      'traceId': traceId,
      'ttftMs': ttftMs,
    };
  }
}

class RuntimeInvocationListResponse {
  final List<RuntimeInvocationItem> items;
  final PageInfo pageInfo;

  RuntimeInvocationListResponse({
    required this.items,
    required this.pageInfo
  });

  factory RuntimeInvocationListResponse.fromJson(Map<String, dynamic> json) {
    return RuntimeInvocationListResponse(
      items: (() {
        final list = _sdkworkAsList(json['items']);
        if (list == null) {
          throw FormatException('RuntimeInvocationListResponse.items is required');
        }
        return list
            .map((item) => (() {
        final map = _sdkworkAsMap(item);
        return map == null ? null : RuntimeInvocationItem.fromJson(map);
      })())
            .whereType<RuntimeInvocationItem>()
            .toList();
      })(),
      pageInfo: (() {
        final map = _sdkworkAsMap(json['pageInfo']);
        if (map == null) {
          throw FormatException('RuntimeInvocationListResponse.pageInfo is required');
        }
        return PageInfo.fromJson(map);
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'items': items.map((item) => item.toJson()).toList(),
      'pageInfo': pageInfo.toJson(),
    };
  }
}

class RuntimeInvocationResponse {
  final RuntimeInvocationItem item;

  RuntimeInvocationResponse({
    required this.item
  });

  factory RuntimeInvocationResponse.fromJson(Map<String, dynamic> json) {
    return RuntimeInvocationResponse(
      item: (() {
        final map = _sdkworkAsMap(json['item']);
        if (map == null) {
          throw FormatException('RuntimeInvocationResponse.item is required');
        }
        return RuntimeInvocationItem.fromJson(map);
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'item': item.toJson(),
    };
  }
}

class SdkWorkApiResponse {
  final int code;
  final dynamic data;
  final String traceId;

  SdkWorkApiResponse({
    required this.code,
    required this.data,
    required this.traceId
  });

  factory SdkWorkApiResponse.fromJson(Map<String, dynamic> json) {
    return SdkWorkApiResponse(
      code: (() {
        final value = json['code'];
        if (value is! int) {
          throw FormatException('SdkWorkApiResponse.code is required');
        }
        return value;
      })(),
      data: json['data'],
      traceId: (() {
        final value = json['traceId']?.toString();
        if (value == null) {
          throw FormatException('SdkWorkApiResponse.traceId is required');
        }
        return value;
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'code': code,
      'data': data,
      'traceId': traceId,
    };
  }
}

class SdkWorkCommandData {
  final bool accepted;
  final String? resourceId;
  final String? status;

  SdkWorkCommandData({
    required this.accepted,
    this.resourceId,
    this.status
  });

  factory SdkWorkCommandData.fromJson(Map<String, dynamic> json) {
    return SdkWorkCommandData(
      accepted: (() {
        final value = json['accepted'];
        if (value is! bool) {
          throw FormatException('SdkWorkCommandData.accepted is required');
        }
        return value;
      })(),
      resourceId: json['resourceId']?.toString(),
      status: json['status']?.toString()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'accepted': accepted,
      'resourceId': resourceId,
      'status': status,
    };
  }
}

class SdkWorkCommandResponse {
  final int code;
  final dynamic data;
  final String traceId;

  SdkWorkCommandResponse({
    required this.code,
    required this.data,
    required this.traceId
  });

  factory SdkWorkCommandResponse.fromJson(Map<String, dynamic> json) {
    return SdkWorkCommandResponse(
      code: (() {
        final value = json['code'];
        if (value is! int) {
          throw FormatException('SdkWorkCommandResponse.code is required');
        }
        return value;
      })(),
      data: json['data'],
      traceId: (() {
        final value = json['traceId']?.toString();
        if (value == null) {
          throw FormatException('SdkWorkCommandResponse.traceId is required');
        }
        return value;
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'code': code,
      'data': data,
      'traceId': traceId,
    };
  }
}

class SdkWorkListResponse {
  final int code;
  final dynamic data;
  final String traceId;

  SdkWorkListResponse({
    required this.code,
    required this.data,
    required this.traceId
  });

  factory SdkWorkListResponse.fromJson(Map<String, dynamic> json) {
    return SdkWorkListResponse(
      code: (() {
        final value = json['code'];
        if (value is! int) {
          throw FormatException('SdkWorkListResponse.code is required');
        }
        return value;
      })(),
      data: json['data'],
      traceId: (() {
        final value = json['traceId']?.toString();
        if (value == null) {
          throw FormatException('SdkWorkListResponse.traceId is required');
        }
        return value;
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'code': code,
      'data': data,
      'traceId': traceId,
    };
  }
}

class SdkWorkPageData {
  final List<Map<String, dynamic>> items;
  final PageInfo pageInfo;

  SdkWorkPageData({
    required this.items,
    required this.pageInfo
  });

  factory SdkWorkPageData.fromJson(Map<String, dynamic> json) {
    return SdkWorkPageData(
      items: (() {
        final list = _sdkworkAsList(json['items']);
        if (list == null) {
          throw FormatException('SdkWorkPageData.items is required');
        }
        return list
            .map((item) => _sdkworkAsMap(item))
            .whereType<Map<String, dynamic>>()
            .toList();
      })(),
      pageInfo: (() {
        final map = _sdkworkAsMap(json['pageInfo']);
        if (map == null) {
          throw FormatException('SdkWorkPageData.pageInfo is required');
        }
        return PageInfo.fromJson(map);
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'items': items.map((item) => item).toList(),
      'pageInfo': pageInfo.toJson(),
    };
  }
}

class SdkWorkResourceData {
  final Map<String, dynamic> item;

  SdkWorkResourceData({
    required this.item
  });

  factory SdkWorkResourceData.fromJson(Map<String, dynamic> json) {
    return SdkWorkResourceData(
      item: (() {
        final map = _sdkworkAsMap(json['item']);
        if (map == null) {
          throw FormatException('SdkWorkResourceData.item is required');
        }
        return map;
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'item': item,
    };
  }
}

class SdkWorkResourceResponse {
  final int code;
  final dynamic data;
  final String traceId;

  SdkWorkResourceResponse({
    required this.code,
    required this.data,
    required this.traceId
  });

  factory SdkWorkResourceResponse.fromJson(Map<String, dynamic> json) {
    return SdkWorkResourceResponse(
      code: (() {
        final value = json['code'];
        if (value is! int) {
          throw FormatException('SdkWorkResourceResponse.code is required');
        }
        return value;
      })(),
      data: json['data'],
      traceId: (() {
        final value = json['traceId']?.toString();
        if (value == null) {
          throw FormatException('SdkWorkResourceResponse.traceId is required');
        }
        return value;
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'code': code,
      'data': data,
      'traceId': traceId,
    };
  }
}

class SettingsDataResponse {
  final String language;
  final SettingsNotifications notifications;
  final String timezone;
  final String webhookUrl;

  SettingsDataResponse({
    required this.language,
    required this.notifications,
    required this.timezone,
    required this.webhookUrl
  });

  factory SettingsDataResponse.fromJson(Map<String, dynamic> json) {
    return SettingsDataResponse(
      language: (() {
        final value = json['language']?.toString();
        if (value == null) {
          throw FormatException('SettingsDataResponse.language is required');
        }
        return value;
      })(),
      notifications: (() {
        final map = _sdkworkAsMap(json['notifications']);
        if (map == null) {
          throw FormatException('SettingsDataResponse.notifications is required');
        }
        return SettingsNotifications.fromJson(map);
      })(),
      timezone: (() {
        final value = json['timezone']?.toString();
        if (value == null) {
          throw FormatException('SettingsDataResponse.timezone is required');
        }
        return value;
      })(),
      webhookUrl: (() {
        final value = json['webhookUrl']?.toString();
        if (value == null) {
          throw FormatException('SettingsDataResponse.webhookUrl is required');
        }
        return value;
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'language': language,
      'notifications': notifications.toJson(),
      'timezone': timezone,
      'webhookUrl': webhookUrl,
    };
  }
}

class SettingsNotifications {
  final bool apiMonitor;
  final bool billReminder;
  final bool quotaWarning;

  SettingsNotifications({
    required this.apiMonitor,
    required this.billReminder,
    required this.quotaWarning
  });

  factory SettingsNotifications.fromJson(Map<String, dynamic> json) {
    return SettingsNotifications(
      apiMonitor: (() {
        final value = json['apiMonitor'];
        if (value is! bool) {
          throw FormatException('SettingsNotifications.apiMonitor is required');
        }
        return value;
      })(),
      billReminder: (() {
        final value = json['billReminder'];
        if (value is! bool) {
          throw FormatException('SettingsNotifications.billReminder is required');
        }
        return value;
      })(),
      quotaWarning: (() {
        final value = json['quotaWarning'];
        if (value is! bool) {
          throw FormatException('SettingsNotifications.quotaWarning is required');
        }
        return value;
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'apiMonitor': apiMonitor,
      'billReminder': billReminder,
      'quotaWarning': quotaWarning,
    };
  }
}

class SettlementBill {
  final String endDate;
  final String id;
  final String period;
  final String startDate;
  final String status;
  final String totalCost;
  final String totalTokens;

  SettlementBill({
    required this.endDate,
    required this.id,
    required this.period,
    required this.startDate,
    required this.status,
    required this.totalCost,
    required this.totalTokens
  });

  factory SettlementBill.fromJson(Map<String, dynamic> json) {
    return SettlementBill(
      endDate: (() {
        final value = json['endDate']?.toString();
        if (value == null) {
          throw FormatException('SettlementBill.endDate is required');
        }
        return value;
      })(),
      id: (() {
        final value = json['id']?.toString();
        if (value == null) {
          throw FormatException('SettlementBill.id is required');
        }
        return value;
      })(),
      period: (() {
        final value = json['period']?.toString();
        if (value == null) {
          throw FormatException('SettlementBill.period is required');
        }
        return value;
      })(),
      startDate: (() {
        final value = json['startDate']?.toString();
        if (value == null) {
          throw FormatException('SettlementBill.startDate is required');
        }
        return value;
      })(),
      status: (() {
        final value = json['status']?.toString();
        if (value == null) {
          throw FormatException('SettlementBill.status is required');
        }
        return value;
      })(),
      totalCost: (() {
        final value = json['totalCost']?.toString();
        if (value == null) {
          throw FormatException('SettlementBill.totalCost is required');
        }
        return value;
      })(),
      totalTokens: (() {
        final value = json['totalTokens']?.toString();
        if (value == null) {
          throw FormatException('SettlementBill.totalTokens is required');
        }
        return value;
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'endDate': endDate,
      'id': id,
      'period': period,
      'startDate': startDate,
      'status': status,
      'totalCost': totalCost,
      'totalTokens': totalTokens,
    };
  }
}

class SettlementChartPoint {
  final MediaResource audio;
  final String day;
  final MediaResource image;
  final MediaResource music;
  final String text;
  final MediaResource video;

  SettlementChartPoint({
    required this.audio,
    required this.day,
    required this.image,
    required this.music,
    required this.text,
    required this.video
  });

  factory SettlementChartPoint.fromJson(Map<String, dynamic> json) {
    return SettlementChartPoint(
      audio: (() {
        final map = _sdkworkAsMap(json['audio']);
        if (map == null) {
          throw FormatException('SettlementChartPoint.audio is required');
        }
        return MediaResource.fromJson(map);
      })(),
      day: (() {
        final value = json['day']?.toString();
        if (value == null) {
          throw FormatException('SettlementChartPoint.day is required');
        }
        return value;
      })(),
      image: (() {
        final map = _sdkworkAsMap(json['image']);
        if (map == null) {
          throw FormatException('SettlementChartPoint.image is required');
        }
        return MediaResource.fromJson(map);
      })(),
      music: (() {
        final map = _sdkworkAsMap(json['music']);
        if (map == null) {
          throw FormatException('SettlementChartPoint.music is required');
        }
        return MediaResource.fromJson(map);
      })(),
      text: (() {
        final value = json['text']?.toString();
        if (value == null) {
          throw FormatException('SettlementChartPoint.text is required');
        }
        return value;
      })(),
      video: (() {
        final map = _sdkworkAsMap(json['video']);
        if (map == null) {
          throw FormatException('SettlementChartPoint.video is required');
        }
        return MediaResource.fromJson(map);
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'audio': audio.toJson(),
      'day': day,
      'image': image.toJson(),
      'music': music.toJson(),
      'text': text,
      'video': video.toJson(),
    };
  }
}

class SettlementsDashboardRetrieveResult {
  final int code;
  final dynamic data;
  final String traceId;

  SettlementsDashboardRetrieveResult({
    required this.code,
    required this.data,
    required this.traceId
  });

  factory SettlementsDashboardRetrieveResult.fromJson(Map<String, dynamic> json) {
    return SettlementsDashboardRetrieveResult(
      code: (() {
        final value = json['code'];
        if (value is! int) {
          throw FormatException('SettlementsDashboardRetrieveResult.code is required');
        }
        return value;
      })(),
      data: json['data'],
      traceId: (() {
        final value = json['traceId']?.toString();
        if (value == null) {
          throw FormatException('SettlementsDashboardRetrieveResult.traceId is required');
        }
        return value;
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'code': code,
      'data': data,
      'traceId': traceId,
    };
  }
}

class SettlementsDashboardSnapshot {
  final List<SettlementBill> bills;
  final List<SettlementChartPoint> chartData;

  SettlementsDashboardSnapshot({
    required this.bills,
    required this.chartData
  });

  factory SettlementsDashboardSnapshot.fromJson(Map<String, dynamic> json) {
    return SettlementsDashboardSnapshot(
      bills: (() {
        final list = _sdkworkAsList(json['bills']);
        if (list == null) {
          throw FormatException('SettlementsDashboardSnapshot.bills is required');
        }
        return list
            .map((item) => (() {
        final map = _sdkworkAsMap(item);
        return map == null ? null : SettlementBill.fromJson(map);
      })())
            .whereType<SettlementBill>()
            .toList();
      })(),
      chartData: (() {
        final list = _sdkworkAsList(json['chartData']);
        if (list == null) {
          throw FormatException('SettlementsDashboardSnapshot.chartData is required');
        }
        return list
            .map((item) => (() {
        final map = _sdkworkAsMap(item);
        return map == null ? null : SettlementChartPoint.fromJson(map);
      })())
            .whereType<SettlementChartPoint>()
            .toList();
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'bills': bills.map((item) => item.toJson()).toList(),
      'chartData': chartData.map((item) => item.toJson()).toList(),
    };
  }
}

class SiteRuntimeRetrieveResult {
  final int code;
  final dynamic data;
  final String traceId;

  SiteRuntimeRetrieveResult({
    required this.code,
    required this.data,
    required this.traceId
  });

  factory SiteRuntimeRetrieveResult.fromJson(Map<String, dynamic> json) {
    return SiteRuntimeRetrieveResult(
      code: (() {
        final value = json['code'];
        if (value is! int) {
          throw FormatException('SiteRuntimeRetrieveResult.code is required');
        }
        return value;
      })(),
      data: json['data'],
      traceId: (() {
        final value = json['traceId']?.toString();
        if (value == null) {
          throw FormatException('SiteRuntimeRetrieveResult.traceId is required');
        }
        return value;
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'code': code,
      'data': data,
      'traceId': traceId,
    };
  }
}

class SiteRuntimeSettingsResponse {
  final String accentColor;
  final Map<String, dynamic> adminModules;
  final String brandColor;
  final MediaResource? communityGroupQrCode;
  final bool? communityGroupQrCodeEnabled;
  final String customCss;
  final String description;
  final Map<String, String> descriptionI18n;
  final String docsUrl;
  final MediaResource? douyinQrCode;
  final bool? douyinQrCodeEnabled;
  final Map<String, dynamic> downloads;
  final MediaResource? favicon;
  final bool? footerBrandEnabled;
  final bool? footerCompanyLinksEnabled;
  final String footerCopyright;
  final Map<String, String> footerCopyrightI18n;
  final bool? footerLegalEnabled;
  final bool? footerNewsletterEnabled;
  final bool? footerProductLinksEnabled;
  final bool? footerQrCodesEnabled;
  final bool? footerResourceLinksEnabled;
  final bool? footerSocialBilibiliEnabled;
  final String? footerSocialBilibiliUrl;
  final bool? footerSocialDiscordEnabled;
  final String? footerSocialDiscordUrl;
  final bool? footerSocialDouyinEnabled;
  final String? footerSocialDouyinUrl;
  final bool? footerSocialEmailEnabled;
  final String? footerSocialEmailUrl;
  final bool? footerSocialEnabled;
  final bool? footerSocialGithubEnabled;
  final String? footerSocialGithubUrl;
  final bool? footerSocialLinkedinEnabled;
  final String? footerSocialLinkedinUrl;
  final bool? footerSocialTelegramEnabled;
  final String? footerSocialTelegramUrl;
  final bool? footerSocialTwitterEnabled;
  final String? footerSocialTwitterUrl;
  final bool? footerSocialWeiboEnabled;
  final String? footerSocialWeiboUrl;
  final bool? footerSocialXiaohongshuEnabled;
  final String? footerSocialXiaohongshuUrl;
  final bool? footerSocialYoutubeEnabled;
  final String? footerSocialYoutubeUrl;
  final bool? footerSocialZhihuEnabled;
  final String? footerSocialZhihuUrl;
  final Map<String, dynamic> homepage;
  final MediaResource? icon;
  final String icpRecordNumber;
  final String icpRecordUrl;
  final MediaResource? logo;
  final MediaResource? officialAccountQrCode;
  final bool? officialAccountQrCodeEnabled;
  final String policeRecordNumber;
  final String policeRecordUrl;
  final String privacyUrl;
  final String seoDescription;
  final Map<String, String> seoDescriptionI18n;
  final String seoTitle;
  final Map<String, String> seoTitleI18n;
  final String shortName;
  final Map<String, String> shortNameI18n;
  final String siteName;
  final Map<String, String> siteNameI18n;
  final String supportUrl;
  final String termsUrl;
  final MediaResource? videoChannelQrCode;
  final bool? videoChannelQrCodeEnabled;

  SiteRuntimeSettingsResponse({
    required this.accentColor,
    required this.adminModules,
    required this.brandColor,
    this.communityGroupQrCode,
    this.communityGroupQrCodeEnabled,
    required this.customCss,
    required this.description,
    required this.descriptionI18n,
    required this.docsUrl,
    this.douyinQrCode,
    this.douyinQrCodeEnabled,
    required this.downloads,
    required this.favicon,
    this.footerBrandEnabled,
    this.footerCompanyLinksEnabled,
    required this.footerCopyright,
    required this.footerCopyrightI18n,
    this.footerLegalEnabled,
    this.footerNewsletterEnabled,
    this.footerProductLinksEnabled,
    this.footerQrCodesEnabled,
    this.footerResourceLinksEnabled,
    this.footerSocialBilibiliEnabled,
    this.footerSocialBilibiliUrl,
    this.footerSocialDiscordEnabled,
    this.footerSocialDiscordUrl,
    this.footerSocialDouyinEnabled,
    this.footerSocialDouyinUrl,
    this.footerSocialEmailEnabled,
    this.footerSocialEmailUrl,
    this.footerSocialEnabled,
    this.footerSocialGithubEnabled,
    this.footerSocialGithubUrl,
    this.footerSocialLinkedinEnabled,
    this.footerSocialLinkedinUrl,
    this.footerSocialTelegramEnabled,
    this.footerSocialTelegramUrl,
    this.footerSocialTwitterEnabled,
    this.footerSocialTwitterUrl,
    this.footerSocialWeiboEnabled,
    this.footerSocialWeiboUrl,
    this.footerSocialXiaohongshuEnabled,
    this.footerSocialXiaohongshuUrl,
    this.footerSocialYoutubeEnabled,
    this.footerSocialYoutubeUrl,
    this.footerSocialZhihuEnabled,
    this.footerSocialZhihuUrl,
    required this.homepage,
    required this.icon,
    required this.icpRecordNumber,
    required this.icpRecordUrl,
    required this.logo,
    this.officialAccountQrCode,
    this.officialAccountQrCodeEnabled,
    required this.policeRecordNumber,
    required this.policeRecordUrl,
    required this.privacyUrl,
    required this.seoDescription,
    required this.seoDescriptionI18n,
    required this.seoTitle,
    required this.seoTitleI18n,
    required this.shortName,
    required this.shortNameI18n,
    required this.siteName,
    required this.siteNameI18n,
    required this.supportUrl,
    required this.termsUrl,
    this.videoChannelQrCode,
    this.videoChannelQrCodeEnabled
  });

  factory SiteRuntimeSettingsResponse.fromJson(Map<String, dynamic> json) {
    return SiteRuntimeSettingsResponse(
      accentColor: (() {
        final value = json['accentColor']?.toString();
        if (value == null) {
          throw FormatException('SiteRuntimeSettingsResponse.accentColor is required');
        }
        return value;
      })(),
      adminModules: (() {
        final map = _sdkworkAsMap(json['adminModules']);
        if (map == null) {
          throw FormatException('SiteRuntimeSettingsResponse.adminModules is required');
        }
        return map;
      })(),
      brandColor: (() {
        final value = json['brandColor']?.toString();
        if (value == null) {
          throw FormatException('SiteRuntimeSettingsResponse.brandColor is required');
        }
        return value;
      })(),
      communityGroupQrCode: (() {
        final map = _sdkworkAsMap(json['communityGroupQrCode']);
        return map == null ? null : MediaResource.fromJson(map);
      })(),
      communityGroupQrCodeEnabled: json['communityGroupQrCodeEnabled'] is bool ? json['communityGroupQrCodeEnabled'] : null,
      customCss: (() {
        final value = json['customCss']?.toString();
        if (value == null) {
          throw FormatException('SiteRuntimeSettingsResponse.customCss is required');
        }
        return value;
      })(),
      description: (() {
        final value = json['description']?.toString();
        if (value == null) {
          throw FormatException('SiteRuntimeSettingsResponse.description is required');
        }
        return value;
      })(),
      descriptionI18n: (() {
        final map = _sdkworkAsMap(json['descriptionI18n']);
        if (map == null) {
          throw FormatException('SiteRuntimeSettingsResponse.descriptionI18n is required');
        }
        final result = <String, String>{};
        map.forEach((key, item) {
          final deserialized = item?.toString();
          if (deserialized is String) {
            result[key] = deserialized;
          }
        });
        return result;
      })(),
      docsUrl: (() {
        final value = json['docsUrl']?.toString();
        if (value == null) {
          throw FormatException('SiteRuntimeSettingsResponse.docsUrl is required');
        }
        return value;
      })(),
      douyinQrCode: (() {
        final map = _sdkworkAsMap(json['douyinQrCode']);
        return map == null ? null : MediaResource.fromJson(map);
      })(),
      douyinQrCodeEnabled: json['douyinQrCodeEnabled'] is bool ? json['douyinQrCodeEnabled'] : null,
      downloads: (() {
        final map = _sdkworkAsMap(json['downloads']);
        if (map == null) {
          throw FormatException('SiteRuntimeSettingsResponse.downloads is required');
        }
        final result = <String, String>{};
        map.forEach((key, item) {
          final deserialized = item?.toString();
          if (deserialized is String) {
            result[key] = deserialized;
          }
        });
        return result;
      })(),
      favicon: (() {
        if (!json.containsKey('favicon')) {
          throw FormatException('SiteRuntimeSettingsResponse.favicon is required');
        }
        final _sdkworkRequiredValue = json['favicon'];
        if (_sdkworkRequiredValue == null) {
          return null;
        }
        return (() {
        final map = _sdkworkAsMap(_sdkworkRequiredValue);
        if (map == null) {
          throw FormatException('SiteRuntimeSettingsResponse.favicon is required');
        }
        return MediaResource.fromJson(map);
      })();
      })(),
      footerBrandEnabled: json['footerBrandEnabled'] is bool ? json['footerBrandEnabled'] : null,
      footerCompanyLinksEnabled: json['footerCompanyLinksEnabled'] is bool ? json['footerCompanyLinksEnabled'] : null,
      footerCopyright: (() {
        final value = json['footerCopyright']?.toString();
        if (value == null) {
          throw FormatException('SiteRuntimeSettingsResponse.footerCopyright is required');
        }
        return value;
      })(),
      footerCopyrightI18n: (() {
        final map = _sdkworkAsMap(json['footerCopyrightI18n']);
        if (map == null) {
          throw FormatException('SiteRuntimeSettingsResponse.footerCopyrightI18n is required');
        }
        final result = <String, String>{};
        map.forEach((key, item) {
          final deserialized = item?.toString();
          if (deserialized is String) {
            result[key] = deserialized;
          }
        });
        return result;
      })(),
      footerLegalEnabled: json['footerLegalEnabled'] is bool ? json['footerLegalEnabled'] : null,
      footerNewsletterEnabled: json['footerNewsletterEnabled'] is bool ? json['footerNewsletterEnabled'] : null,
      footerProductLinksEnabled: json['footerProductLinksEnabled'] is bool ? json['footerProductLinksEnabled'] : null,
      footerQrCodesEnabled: json['footerQrCodesEnabled'] is bool ? json['footerQrCodesEnabled'] : null,
      footerResourceLinksEnabled: json['footerResourceLinksEnabled'] is bool ? json['footerResourceLinksEnabled'] : null,
      footerSocialBilibiliEnabled: json['footerSocialBilibiliEnabled'] is bool ? json['footerSocialBilibiliEnabled'] : null,
      footerSocialBilibiliUrl: json['footerSocialBilibiliUrl']?.toString(),
      footerSocialDiscordEnabled: json['footerSocialDiscordEnabled'] is bool ? json['footerSocialDiscordEnabled'] : null,
      footerSocialDiscordUrl: json['footerSocialDiscordUrl']?.toString(),
      footerSocialDouyinEnabled: json['footerSocialDouyinEnabled'] is bool ? json['footerSocialDouyinEnabled'] : null,
      footerSocialDouyinUrl: json['footerSocialDouyinUrl']?.toString(),
      footerSocialEmailEnabled: json['footerSocialEmailEnabled'] is bool ? json['footerSocialEmailEnabled'] : null,
      footerSocialEmailUrl: json['footerSocialEmailUrl']?.toString(),
      footerSocialEnabled: json['footerSocialEnabled'] is bool ? json['footerSocialEnabled'] : null,
      footerSocialGithubEnabled: json['footerSocialGithubEnabled'] is bool ? json['footerSocialGithubEnabled'] : null,
      footerSocialGithubUrl: json['footerSocialGithubUrl']?.toString(),
      footerSocialLinkedinEnabled: json['footerSocialLinkedinEnabled'] is bool ? json['footerSocialLinkedinEnabled'] : null,
      footerSocialLinkedinUrl: json['footerSocialLinkedinUrl']?.toString(),
      footerSocialTelegramEnabled: json['footerSocialTelegramEnabled'] is bool ? json['footerSocialTelegramEnabled'] : null,
      footerSocialTelegramUrl: json['footerSocialTelegramUrl']?.toString(),
      footerSocialTwitterEnabled: json['footerSocialTwitterEnabled'] is bool ? json['footerSocialTwitterEnabled'] : null,
      footerSocialTwitterUrl: json['footerSocialTwitterUrl']?.toString(),
      footerSocialWeiboEnabled: json['footerSocialWeiboEnabled'] is bool ? json['footerSocialWeiboEnabled'] : null,
      footerSocialWeiboUrl: json['footerSocialWeiboUrl']?.toString(),
      footerSocialXiaohongshuEnabled: json['footerSocialXiaohongshuEnabled'] is bool ? json['footerSocialXiaohongshuEnabled'] : null,
      footerSocialXiaohongshuUrl: json['footerSocialXiaohongshuUrl']?.toString(),
      footerSocialYoutubeEnabled: json['footerSocialYoutubeEnabled'] is bool ? json['footerSocialYoutubeEnabled'] : null,
      footerSocialYoutubeUrl: json['footerSocialYoutubeUrl']?.toString(),
      footerSocialZhihuEnabled: json['footerSocialZhihuEnabled'] is bool ? json['footerSocialZhihuEnabled'] : null,
      footerSocialZhihuUrl: json['footerSocialZhihuUrl']?.toString(),
      homepage: (() {
        final map = _sdkworkAsMap(json['homepage']);
        if (map == null) {
          throw FormatException('SiteRuntimeSettingsResponse.homepage is required');
        }
        final result = <String, String>{};
        map.forEach((key, item) {
          final deserialized = item?.toString();
          if (deserialized is String) {
            result[key] = deserialized;
          }
        });
        return result;
      })(),
      icon: (() {
        if (!json.containsKey('icon')) {
          throw FormatException('SiteRuntimeSettingsResponse.icon is required');
        }
        final _sdkworkRequiredValue = json['icon'];
        if (_sdkworkRequiredValue == null) {
          return null;
        }
        return (() {
        final map = _sdkworkAsMap(_sdkworkRequiredValue);
        if (map == null) {
          throw FormatException('SiteRuntimeSettingsResponse.icon is required');
        }
        return MediaResource.fromJson(map);
      })();
      })(),
      icpRecordNumber: (() {
        final value = json['icpRecordNumber']?.toString();
        if (value == null) {
          throw FormatException('SiteRuntimeSettingsResponse.icpRecordNumber is required');
        }
        return value;
      })(),
      icpRecordUrl: (() {
        final value = json['icpRecordUrl']?.toString();
        if (value == null) {
          throw FormatException('SiteRuntimeSettingsResponse.icpRecordUrl is required');
        }
        return value;
      })(),
      logo: (() {
        if (!json.containsKey('logo')) {
          throw FormatException('SiteRuntimeSettingsResponse.logo is required');
        }
        final _sdkworkRequiredValue = json['logo'];
        if (_sdkworkRequiredValue == null) {
          return null;
        }
        return (() {
        final map = _sdkworkAsMap(_sdkworkRequiredValue);
        if (map == null) {
          throw FormatException('SiteRuntimeSettingsResponse.logo is required');
        }
        return MediaResource.fromJson(map);
      })();
      })(),
      officialAccountQrCode: (() {
        final map = _sdkworkAsMap(json['officialAccountQrCode']);
        return map == null ? null : MediaResource.fromJson(map);
      })(),
      officialAccountQrCodeEnabled: json['officialAccountQrCodeEnabled'] is bool ? json['officialAccountQrCodeEnabled'] : null,
      policeRecordNumber: (() {
        final value = json['policeRecordNumber']?.toString();
        if (value == null) {
          throw FormatException('SiteRuntimeSettingsResponse.policeRecordNumber is required');
        }
        return value;
      })(),
      policeRecordUrl: (() {
        final value = json['policeRecordUrl']?.toString();
        if (value == null) {
          throw FormatException('SiteRuntimeSettingsResponse.policeRecordUrl is required');
        }
        return value;
      })(),
      privacyUrl: (() {
        final value = json['privacyUrl']?.toString();
        if (value == null) {
          throw FormatException('SiteRuntimeSettingsResponse.privacyUrl is required');
        }
        return value;
      })(),
      seoDescription: (() {
        final value = json['seoDescription']?.toString();
        if (value == null) {
          throw FormatException('SiteRuntimeSettingsResponse.seoDescription is required');
        }
        return value;
      })(),
      seoDescriptionI18n: (() {
        final map = _sdkworkAsMap(json['seoDescriptionI18n']);
        if (map == null) {
          throw FormatException('SiteRuntimeSettingsResponse.seoDescriptionI18n is required');
        }
        final result = <String, String>{};
        map.forEach((key, item) {
          final deserialized = item?.toString();
          if (deserialized is String) {
            result[key] = deserialized;
          }
        });
        return result;
      })(),
      seoTitle: (() {
        final value = json['seoTitle']?.toString();
        if (value == null) {
          throw FormatException('SiteRuntimeSettingsResponse.seoTitle is required');
        }
        return value;
      })(),
      seoTitleI18n: (() {
        final map = _sdkworkAsMap(json['seoTitleI18n']);
        if (map == null) {
          throw FormatException('SiteRuntimeSettingsResponse.seoTitleI18n is required');
        }
        final result = <String, String>{};
        map.forEach((key, item) {
          final deserialized = item?.toString();
          if (deserialized is String) {
            result[key] = deserialized;
          }
        });
        return result;
      })(),
      shortName: (() {
        final value = json['shortName']?.toString();
        if (value == null) {
          throw FormatException('SiteRuntimeSettingsResponse.shortName is required');
        }
        return value;
      })(),
      shortNameI18n: (() {
        final map = _sdkworkAsMap(json['shortNameI18n']);
        if (map == null) {
          throw FormatException('SiteRuntimeSettingsResponse.shortNameI18n is required');
        }
        final result = <String, String>{};
        map.forEach((key, item) {
          final deserialized = item?.toString();
          if (deserialized is String) {
            result[key] = deserialized;
          }
        });
        return result;
      })(),
      siteName: (() {
        final value = json['siteName']?.toString();
        if (value == null) {
          throw FormatException('SiteRuntimeSettingsResponse.siteName is required');
        }
        return value;
      })(),
      siteNameI18n: (() {
        final map = _sdkworkAsMap(json['siteNameI18n']);
        if (map == null) {
          throw FormatException('SiteRuntimeSettingsResponse.siteNameI18n is required');
        }
        final result = <String, String>{};
        map.forEach((key, item) {
          final deserialized = item?.toString();
          if (deserialized is String) {
            result[key] = deserialized;
          }
        });
        return result;
      })(),
      supportUrl: (() {
        final value = json['supportUrl']?.toString();
        if (value == null) {
          throw FormatException('SiteRuntimeSettingsResponse.supportUrl is required');
        }
        return value;
      })(),
      termsUrl: (() {
        final value = json['termsUrl']?.toString();
        if (value == null) {
          throw FormatException('SiteRuntimeSettingsResponse.termsUrl is required');
        }
        return value;
      })(),
      videoChannelQrCode: (() {
        final map = _sdkworkAsMap(json['videoChannelQrCode']);
        return map == null ? null : MediaResource.fromJson(map);
      })(),
      videoChannelQrCodeEnabled: json['videoChannelQrCodeEnabled'] is bool ? json['videoChannelQrCodeEnabled'] : null
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'accentColor': accentColor,
      'adminModules': adminModules,
      'brandColor': brandColor,
      'communityGroupQrCode': communityGroupQrCode?.toJson(),
      'communityGroupQrCodeEnabled': communityGroupQrCodeEnabled,
      'customCss': customCss,
      'description': description,
      'descriptionI18n': descriptionI18n.map((key, item) => MapEntry(key, item)),
      'docsUrl': docsUrl,
      'douyinQrCode': douyinQrCode?.toJson(),
      'douyinQrCodeEnabled': douyinQrCodeEnabled,
      'downloads': downloads.map((key, item) => MapEntry(key, item)),
      'favicon': favicon?.toJson(),
      'footerBrandEnabled': footerBrandEnabled,
      'footerCompanyLinksEnabled': footerCompanyLinksEnabled,
      'footerCopyright': footerCopyright,
      'footerCopyrightI18n': footerCopyrightI18n.map((key, item) => MapEntry(key, item)),
      'footerLegalEnabled': footerLegalEnabled,
      'footerNewsletterEnabled': footerNewsletterEnabled,
      'footerProductLinksEnabled': footerProductLinksEnabled,
      'footerQrCodesEnabled': footerQrCodesEnabled,
      'footerResourceLinksEnabled': footerResourceLinksEnabled,
      'footerSocialBilibiliEnabled': footerSocialBilibiliEnabled,
      'footerSocialBilibiliUrl': footerSocialBilibiliUrl,
      'footerSocialDiscordEnabled': footerSocialDiscordEnabled,
      'footerSocialDiscordUrl': footerSocialDiscordUrl,
      'footerSocialDouyinEnabled': footerSocialDouyinEnabled,
      'footerSocialDouyinUrl': footerSocialDouyinUrl,
      'footerSocialEmailEnabled': footerSocialEmailEnabled,
      'footerSocialEmailUrl': footerSocialEmailUrl,
      'footerSocialEnabled': footerSocialEnabled,
      'footerSocialGithubEnabled': footerSocialGithubEnabled,
      'footerSocialGithubUrl': footerSocialGithubUrl,
      'footerSocialLinkedinEnabled': footerSocialLinkedinEnabled,
      'footerSocialLinkedinUrl': footerSocialLinkedinUrl,
      'footerSocialTelegramEnabled': footerSocialTelegramEnabled,
      'footerSocialTelegramUrl': footerSocialTelegramUrl,
      'footerSocialTwitterEnabled': footerSocialTwitterEnabled,
      'footerSocialTwitterUrl': footerSocialTwitterUrl,
      'footerSocialWeiboEnabled': footerSocialWeiboEnabled,
      'footerSocialWeiboUrl': footerSocialWeiboUrl,
      'footerSocialXiaohongshuEnabled': footerSocialXiaohongshuEnabled,
      'footerSocialXiaohongshuUrl': footerSocialXiaohongshuUrl,
      'footerSocialYoutubeEnabled': footerSocialYoutubeEnabled,
      'footerSocialYoutubeUrl': footerSocialYoutubeUrl,
      'footerSocialZhihuEnabled': footerSocialZhihuEnabled,
      'footerSocialZhihuUrl': footerSocialZhihuUrl,
      'homepage': homepage.map((key, item) => MapEntry(key, item)),
      'icon': icon?.toJson(),
      'icpRecordNumber': icpRecordNumber,
      'icpRecordUrl': icpRecordUrl,
      'logo': logo?.toJson(),
      'officialAccountQrCode': officialAccountQrCode?.toJson(),
      'officialAccountQrCodeEnabled': officialAccountQrCodeEnabled,
      'policeRecordNumber': policeRecordNumber,
      'policeRecordUrl': policeRecordUrl,
      'privacyUrl': privacyUrl,
      'seoDescription': seoDescription,
      'seoDescriptionI18n': seoDescriptionI18n.map((key, item) => MapEntry(key, item)),
      'seoTitle': seoTitle,
      'seoTitleI18n': seoTitleI18n.map((key, item) => MapEntry(key, item)),
      'shortName': shortName,
      'shortNameI18n': shortNameI18n.map((key, item) => MapEntry(key, item)),
      'siteName': siteName,
      'siteNameI18n': siteNameI18n.map((key, item) => MapEntry(key, item)),
      'supportUrl': supportUrl,
      'termsUrl': termsUrl,
      'videoChannelQrCode': videoChannelQrCode?.toJson(),
      'videoChannelQrCodeEnabled': videoChannelQrCodeEnabled,
    };
  }
}

class UpdateApiKeyRequest {
  final String? accountGroup;
  final List<String>? accountGroups;
  final Map<String, dynamic>? chain;
  final bool? defaultForRuntime;
  final String? expires;
  final List<Map<String, dynamic>>? groupRoutingPolicies;
  final String? ipLimit;
  final bool? isUnlimitedQuota;
  final List<String>? modalities;
  final String? name;
  final String? quota;

  UpdateApiKeyRequest({
    this.accountGroup,
    this.accountGroups,
    this.chain,
    this.defaultForRuntime,
    this.expires,
    this.groupRoutingPolicies,
    this.ipLimit,
    this.isUnlimitedQuota,
    this.modalities,
    this.name,
    this.quota
  });

  factory UpdateApiKeyRequest.fromJson(Map<String, dynamic> json) {
    return UpdateApiKeyRequest(
      accountGroup: json['accountGroup']?.toString(),
      accountGroups: (() {
        final list = _sdkworkAsList(json['accountGroups']);
        if (list == null) {
          return null;
        }
        return list
            .map((item) => item?.toString())
            .whereType<String>()
            .toList();
      })(),
      chain: _sdkworkAsMap(json['chain']),
      defaultForRuntime: json['defaultForRuntime'] is bool ? json['defaultForRuntime'] : null,
      expires: json['expires']?.toString(),
      groupRoutingPolicies: (() {
        final list = _sdkworkAsList(json['groupRoutingPolicies']);
        if (list == null) {
          return null;
        }
        return list
            .map((item) => _sdkworkAsMap(item))
            .whereType<Map<String, dynamic>>()
            .toList();
      })(),
      ipLimit: json['ipLimit']?.toString(),
      isUnlimitedQuota: json['isUnlimitedQuota'] is bool ? json['isUnlimitedQuota'] : null,
      modalities: (() {
        final list = _sdkworkAsList(json['modalities']);
        if (list == null) {
          return null;
        }
        return list
            .map((item) => item?.toString())
            .whereType<String>()
            .toList();
      })(),
      name: json['name']?.toString(),
      quota: json['quota']?.toString()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'accountGroup': accountGroup,
      'accountGroups': accountGroups?.map((item) => item).toList(),
      'chain': chain,
      'defaultForRuntime': defaultForRuntime,
      'expires': expires,
      'groupRoutingPolicies': groupRoutingPolicies?.map((item) => item).toList(),
      'ipLimit': ipLimit,
      'isUnlimitedQuota': isUnlimitedQuota,
      'modalities': modalities?.map((item) => item).toList(),
      'name': name,
      'quota': quota,
    };
  }
}

class UpdateApiKeyResponse {
  final AppApiKeyItem item;

  UpdateApiKeyResponse({
    required this.item
  });

  factory UpdateApiKeyResponse.fromJson(Map<String, dynamic> json) {
    return UpdateApiKeyResponse(
      item: (() {
        final map = _sdkworkAsMap(json['item']);
        if (map == null) {
          throw FormatException('UpdateApiKeyResponse.item is required');
        }
        return AppApiKeyItem.fromJson(map);
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'item': item.toJson(),
    };
  }
}

class UpdateSettingsNotificationsRequest {
  final bool apiMonitor;
  final bool billReminder;
  final bool quotaWarning;

  UpdateSettingsNotificationsRequest({
    required this.apiMonitor,
    required this.billReminder,
    required this.quotaWarning
  });

  factory UpdateSettingsNotificationsRequest.fromJson(Map<String, dynamic> json) {
    return UpdateSettingsNotificationsRequest(
      apiMonitor: (() {
        final value = json['apiMonitor'];
        if (value is! bool) {
          throw FormatException('UpdateSettingsNotificationsRequest.apiMonitor is required');
        }
        return value;
      })(),
      billReminder: (() {
        final value = json['billReminder'];
        if (value is! bool) {
          throw FormatException('UpdateSettingsNotificationsRequest.billReminder is required');
        }
        return value;
      })(),
      quotaWarning: (() {
        final value = json['quotaWarning'];
        if (value is! bool) {
          throw FormatException('UpdateSettingsNotificationsRequest.quotaWarning is required');
        }
        return value;
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'apiMonitor': apiMonitor,
      'billReminder': billReminder,
      'quotaWarning': quotaWarning,
    };
  }
}

class UpdateSettingsRequest {
  final String language;
  final UpdateSettingsNotificationsRequest notifications;
  final String timezone;
  final String webhookUrl;

  UpdateSettingsRequest({
    required this.language,
    required this.notifications,
    required this.timezone,
    required this.webhookUrl
  });

  factory UpdateSettingsRequest.fromJson(Map<String, dynamic> json) {
    return UpdateSettingsRequest(
      language: (() {
        final value = json['language']?.toString();
        if (value == null) {
          throw FormatException('UpdateSettingsRequest.language is required');
        }
        return value;
      })(),
      notifications: (() {
        final map = _sdkworkAsMap(json['notifications']);
        if (map == null) {
          throw FormatException('UpdateSettingsRequest.notifications is required');
        }
        return UpdateSettingsNotificationsRequest.fromJson(map);
      })(),
      timezone: (() {
        final value = json['timezone']?.toString();
        if (value == null) {
          throw FormatException('UpdateSettingsRequest.timezone is required');
        }
        return value;
      })(),
      webhookUrl: (() {
        final value = json['webhookUrl']?.toString();
        if (value == null) {
          throw FormatException('UpdateSettingsRequest.webhookUrl is required');
        }
        return value;
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'language': language,
      'notifications': notifications.toJson(),
      'timezone': timezone,
      'webhookUrl': webhookUrl,
    };
  }
}

class UpdateSettingsResponse {
  final bool success;

  UpdateSettingsResponse({
    required this.success
  });

  factory UpdateSettingsResponse.fromJson(Map<String, dynamic> json) {
    return UpdateSettingsResponse(
      success: (() {
        final value = json['success'];
        if (value is! bool) {
          throw FormatException('UpdateSettingsResponse.success is required');
        }
        return value;
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'success': success,
    };
  }
}

class UsageLogItem {
  final String baseInputPrice;
  final String baseOutputPrice;
  final String cacheReadPrice;
  final String cacheReadTokens;
  final String cost;
  final String currency;
  final String errorCode;
  final String errorMessage;
  final String errorType;
  final String gatewayRequestId;
  final String group;
  final int httpStatus;
  final String id;
  final String inputTokens;
  final String ip;
  final bool isStream;
  final String model;
  final String multiplier;
  final String? originalCurrencyAmount;
  final String? originalCurrencyCode;
  final String outputTokens;
  final String path;
  final String points;
  final String providerNativeModel;
  final String reasoningEffort;
  final String regionCode;
  final String requestedModelCatalogKey;
  final String status;
  final String time;
  final String tokenName;
  final String totalTime;
  final String ttft;
  final String type;
  final String unitSize;
  final String userAgent;

  UsageLogItem({
    required this.baseInputPrice,
    required this.baseOutputPrice,
    required this.cacheReadPrice,
    required this.cacheReadTokens,
    required this.cost,
    required this.currency,
    required this.errorCode,
    required this.errorMessage,
    required this.errorType,
    required this.gatewayRequestId,
    required this.group,
    required this.httpStatus,
    required this.id,
    required this.inputTokens,
    required this.ip,
    required this.isStream,
    required this.model,
    required this.multiplier,
    this.originalCurrencyAmount,
    this.originalCurrencyCode,
    required this.outputTokens,
    required this.path,
    required this.points,
    required this.providerNativeModel,
    required this.reasoningEffort,
    required this.regionCode,
    required this.requestedModelCatalogKey,
    required this.status,
    required this.time,
    required this.tokenName,
    required this.totalTime,
    required this.ttft,
    required this.type,
    required this.unitSize,
    required this.userAgent
  });

  factory UsageLogItem.fromJson(Map<String, dynamic> json) {
    return UsageLogItem(
      baseInputPrice: (() {
        final value = json['baseInputPrice']?.toString();
        if (value == null) {
          throw FormatException('UsageLogItem.baseInputPrice is required');
        }
        return value;
      })(),
      baseOutputPrice: (() {
        final value = json['baseOutputPrice']?.toString();
        if (value == null) {
          throw FormatException('UsageLogItem.baseOutputPrice is required');
        }
        return value;
      })(),
      cacheReadPrice: (() {
        final value = json['cacheReadPrice']?.toString();
        if (value == null) {
          throw FormatException('UsageLogItem.cacheReadPrice is required');
        }
        return value;
      })(),
      cacheReadTokens: (() {
        final value = json['cacheReadTokens']?.toString();
        if (value == null) {
          throw FormatException('UsageLogItem.cacheReadTokens is required');
        }
        return value;
      })(),
      cost: (() {
        final value = json['cost']?.toString();
        if (value == null) {
          throw FormatException('UsageLogItem.cost is required');
        }
        return value;
      })(),
      currency: (() {
        final value = json['currency']?.toString();
        if (value == null) {
          throw FormatException('UsageLogItem.currency is required');
        }
        return value;
      })(),
      errorCode: (() {
        final value = json['errorCode']?.toString();
        if (value == null) {
          throw FormatException('UsageLogItem.errorCode is required');
        }
        return value;
      })(),
      errorMessage: (() {
        final value = json['errorMessage']?.toString();
        if (value == null) {
          throw FormatException('UsageLogItem.errorMessage is required');
        }
        return value;
      })(),
      errorType: (() {
        final value = json['errorType']?.toString();
        if (value == null) {
          throw FormatException('UsageLogItem.errorType is required');
        }
        return value;
      })(),
      gatewayRequestId: (() {
        final value = json['gatewayRequestId']?.toString();
        if (value == null) {
          throw FormatException('UsageLogItem.gatewayRequestId is required');
        }
        return value;
      })(),
      group: (() {
        final value = json['group']?.toString();
        if (value == null) {
          throw FormatException('UsageLogItem.group is required');
        }
        return value;
      })(),
      httpStatus: (() {
        final value = json['httpStatus'];
        if (value is! int) {
          throw FormatException('UsageLogItem.httpStatus is required');
        }
        return value;
      })(),
      id: (() {
        final value = json['id']?.toString();
        if (value == null) {
          throw FormatException('UsageLogItem.id is required');
        }
        return value;
      })(),
      inputTokens: (() {
        final value = json['inputTokens']?.toString();
        if (value == null) {
          throw FormatException('UsageLogItem.inputTokens is required');
        }
        return value;
      })(),
      ip: (() {
        final value = json['ip']?.toString();
        if (value == null) {
          throw FormatException('UsageLogItem.ip is required');
        }
        return value;
      })(),
      isStream: (() {
        final value = json['isStream'];
        if (value is! bool) {
          throw FormatException('UsageLogItem.isStream is required');
        }
        return value;
      })(),
      model: (() {
        final value = json['model']?.toString();
        if (value == null) {
          throw FormatException('UsageLogItem.model is required');
        }
        return value;
      })(),
      multiplier: (() {
        final value = json['multiplier']?.toString();
        if (value == null) {
          throw FormatException('UsageLogItem.multiplier is required');
        }
        return value;
      })(),
      originalCurrencyAmount: json['originalCurrencyAmount']?.toString(),
      originalCurrencyCode: json['originalCurrencyCode']?.toString(),
      outputTokens: (() {
        final value = json['outputTokens']?.toString();
        if (value == null) {
          throw FormatException('UsageLogItem.outputTokens is required');
        }
        return value;
      })(),
      path: (() {
        final value = json['path']?.toString();
        if (value == null) {
          throw FormatException('UsageLogItem.path is required');
        }
        return value;
      })(),
      points: (() {
        final value = json['points']?.toString();
        if (value == null) {
          throw FormatException('UsageLogItem.points is required');
        }
        return value;
      })(),
      providerNativeModel: (() {
        final value = json['providerNativeModel']?.toString();
        if (value == null) {
          throw FormatException('UsageLogItem.providerNativeModel is required');
        }
        return value;
      })(),
      reasoningEffort: (() {
        final value = json['reasoningEffort']?.toString();
        if (value == null) {
          throw FormatException('UsageLogItem.reasoningEffort is required');
        }
        return value;
      })(),
      regionCode: (() {
        final value = json['regionCode']?.toString();
        if (value == null) {
          throw FormatException('UsageLogItem.regionCode is required');
        }
        return value;
      })(),
      requestedModelCatalogKey: (() {
        final value = json['requestedModelCatalogKey']?.toString();
        if (value == null) {
          throw FormatException('UsageLogItem.requestedModelCatalogKey is required');
        }
        return value;
      })(),
      status: (() {
        final value = json['status']?.toString();
        if (value == null) {
          throw FormatException('UsageLogItem.status is required');
        }
        return value;
      })(),
      time: (() {
        final value = json['time']?.toString();
        if (value == null) {
          throw FormatException('UsageLogItem.time is required');
        }
        return value;
      })(),
      tokenName: (() {
        final value = json['tokenName']?.toString();
        if (value == null) {
          throw FormatException('UsageLogItem.tokenName is required');
        }
        return value;
      })(),
      totalTime: (() {
        final value = json['totalTime']?.toString();
        if (value == null) {
          throw FormatException('UsageLogItem.totalTime is required');
        }
        return value;
      })(),
      ttft: (() {
        final value = json['ttft']?.toString();
        if (value == null) {
          throw FormatException('UsageLogItem.ttft is required');
        }
        return value;
      })(),
      type: (() {
        final value = json['type']?.toString();
        if (value == null) {
          throw FormatException('UsageLogItem.type is required');
        }
        return value;
      })(),
      unitSize: (() {
        final value = json['unitSize']?.toString();
        if (value == null) {
          throw FormatException('UsageLogItem.unitSize is required');
        }
        return value;
      })(),
      userAgent: (() {
        final value = json['userAgent']?.toString();
        if (value == null) {
          throw FormatException('UsageLogItem.userAgent is required');
        }
        return value;
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'baseInputPrice': baseInputPrice,
      'baseOutputPrice': baseOutputPrice,
      'cacheReadPrice': cacheReadPrice,
      'cacheReadTokens': cacheReadTokens,
      'cost': cost,
      'currency': currency,
      'errorCode': errorCode,
      'errorMessage': errorMessage,
      'errorType': errorType,
      'gatewayRequestId': gatewayRequestId,
      'group': group,
      'httpStatus': httpStatus,
      'id': id,
      'inputTokens': inputTokens,
      'ip': ip,
      'isStream': isStream,
      'model': model,
      'multiplier': multiplier,
      'originalCurrencyAmount': originalCurrencyAmount,
      'originalCurrencyCode': originalCurrencyCode,
      'outputTokens': outputTokens,
      'path': path,
      'points': points,
      'providerNativeModel': providerNativeModel,
      'reasoningEffort': reasoningEffort,
      'regionCode': regionCode,
      'requestedModelCatalogKey': requestedModelCatalogKey,
      'status': status,
      'time': time,
      'tokenName': tokenName,
      'totalTime': totalTime,
      'ttft': ttft,
      'type': type,
      'unitSize': unitSize,
      'userAgent': userAgent,
    };
  }
}

class UsageLogsListResult {
  final int code;
  final dynamic data;
  final String traceId;

  UsageLogsListResult({
    required this.code,
    required this.data,
    required this.traceId
  });

  factory UsageLogsListResult.fromJson(Map<String, dynamic> json) {
    return UsageLogsListResult(
      code: (() {
        final value = json['code'];
        if (value is! int) {
          throw FormatException('UsageLogsListResult.code is required');
        }
        return value;
      })(),
      data: json['data'],
      traceId: (() {
        final value = json['traceId']?.toString();
        if (value == null) {
          throw FormatException('UsageLogsListResult.traceId is required');
        }
        return value;
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'code': code,
      'data': data,
      'traceId': traceId,
    };
  }
}

class UsageLogsResponse {
  final List<UsageLogItem> items;
  final PageInfo pageInfo;

  UsageLogsResponse({
    required this.items,
    required this.pageInfo
  });

  factory UsageLogsResponse.fromJson(Map<String, dynamic> json) {
    return UsageLogsResponse(
      items: (() {
        final list = _sdkworkAsList(json['items']);
        if (list == null) {
          throw FormatException('UsageLogsResponse.items is required');
        }
        return list
            .map((item) => (() {
        final map = _sdkworkAsMap(item);
        return map == null ? null : UsageLogItem.fromJson(map);
      })())
            .whereType<UsageLogItem>()
            .toList();
      })(),
      pageInfo: (() {
        final map = _sdkworkAsMap(json['pageInfo']);
        if (map == null) {
          throw FormatException('UsageLogsResponse.pageInfo is required');
        }
        return PageInfo.fromJson(map);
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'items': items.map((item) => item.toJson()).toList(),
      'pageInfo': pageInfo.toJson(),
    };
  }
}

class UsersSettingsRetrieveResult {
  final int code;
  final dynamic data;
  final String traceId;

  UsersSettingsRetrieveResult({
    required this.code,
    required this.data,
    required this.traceId
  });

  factory UsersSettingsRetrieveResult.fromJson(Map<String, dynamic> json) {
    return UsersSettingsRetrieveResult(
      code: (() {
        final value = json['code'];
        if (value is! int) {
          throw FormatException('UsersSettingsRetrieveResult.code is required');
        }
        return value;
      })(),
      data: json['data'],
      traceId: (() {
        final value = json['traceId']?.toString();
        if (value == null) {
          throw FormatException('UsersSettingsRetrieveResult.traceId is required');
        }
        return value;
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'code': code,
      'data': data,
      'traceId': traceId,
    };
  }
}

class UsersSettingsUpdateResult {
  final int code;
  final dynamic data;
  final String traceId;

  UsersSettingsUpdateResult({
    required this.code,
    required this.data,
    required this.traceId
  });

  factory UsersSettingsUpdateResult.fromJson(Map<String, dynamic> json) {
    return UsersSettingsUpdateResult(
      code: (() {
        final value = json['code'];
        if (value is! int) {
          throw FormatException('UsersSettingsUpdateResult.code is required');
        }
        return value;
      })(),
      data: json['data'],
      traceId: (() {
        final value = json['traceId']?.toString();
        if (value == null) {
          throw FormatException('UsersSettingsUpdateResult.traceId is required');
        }
        return value;
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'code': code,
      'data': data,
      'traceId': traceId,
    };
  }
}
