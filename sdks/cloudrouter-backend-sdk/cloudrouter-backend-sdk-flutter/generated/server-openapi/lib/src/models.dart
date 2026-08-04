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

class AdminAnalyticsOverview {
  final String? endTime;
  final List<Map<String, dynamic>> insights;
  final List<Map<String, dynamic>> modalityDistribution;
  final List<Map<String, dynamic>> modelDistribution;
  final Map<String, dynamic> modelRankings;
  final int rankingSize;
  final String? startTime;
  final Map<String, dynamic> summary;
  final String timeRange;
  final List<Map<String, dynamic>> trend;
  final Map<String, dynamic> userRankings;

  AdminAnalyticsOverview({
    this.endTime,
    required this.insights,
    required this.modalityDistribution,
    required this.modelDistribution,
    required this.modelRankings,
    required this.rankingSize,
    this.startTime,
    required this.summary,
    required this.timeRange,
    required this.trend,
    required this.userRankings
  });

  factory AdminAnalyticsOverview.fromJson(Map<String, dynamic> json) {
    return AdminAnalyticsOverview(
      endTime: json['endTime']?.toString(),
      insights: (() {
        final list = _sdkworkAsList(json['insights']);
        if (list == null) {
          throw FormatException('AdminAnalyticsOverview.insights is required');
        }
        return list
            .map((item) => _sdkworkAsMap(item))
            .whereType<Map<String, dynamic>>()
            .toList();
      })(),
      modalityDistribution: (() {
        final list = _sdkworkAsList(json['modalityDistribution']);
        if (list == null) {
          throw FormatException('AdminAnalyticsOverview.modalityDistribution is required');
        }
        return list
            .map((item) => _sdkworkAsMap(item))
            .whereType<Map<String, dynamic>>()
            .toList();
      })(),
      modelDistribution: (() {
        final list = _sdkworkAsList(json['modelDistribution']);
        if (list == null) {
          throw FormatException('AdminAnalyticsOverview.modelDistribution is required');
        }
        return list
            .map((item) => _sdkworkAsMap(item))
            .whereType<Map<String, dynamic>>()
            .toList();
      })(),
      modelRankings: (() {
        final map = _sdkworkAsMap(json['modelRankings']);
        if (map == null) {
          throw FormatException('AdminAnalyticsOverview.modelRankings is required');
        }
        return map;
      })(),
      rankingSize: (() {
        final value = json['rankingSize'];
        if (value is! int) {
          throw FormatException('AdminAnalyticsOverview.rankingSize is required');
        }
        return value;
      })(),
      startTime: json['startTime']?.toString(),
      summary: (() {
        final map = _sdkworkAsMap(json['summary']);
        if (map == null) {
          throw FormatException('AdminAnalyticsOverview.summary is required');
        }
        return map;
      })(),
      timeRange: (() {
        final value = json['timeRange']?.toString();
        if (value == null) {
          throw FormatException('AdminAnalyticsOverview.timeRange is required');
        }
        return value;
      })(),
      trend: (() {
        final list = _sdkworkAsList(json['trend']);
        if (list == null) {
          throw FormatException('AdminAnalyticsOverview.trend is required');
        }
        return list
            .map((item) => _sdkworkAsMap(item))
            .whereType<Map<String, dynamic>>()
            .toList();
      })(),
      userRankings: (() {
        final map = _sdkworkAsMap(json['userRankings']);
        if (map == null) {
          throw FormatException('AdminAnalyticsOverview.userRankings is required');
        }
        return map;
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'endTime': endTime,
      'insights': insights.map((item) => item).toList(),
      'modalityDistribution': modalityDistribution.map((item) => item).toList(),
      'modelDistribution': modelDistribution.map((item) => item).toList(),
      'modelRankings': modelRankings,
      'rankingSize': rankingSize,
      'startTime': startTime,
      'summary': summary,
      'timeRange': timeRange,
      'trend': trend.map((item) => item).toList(),
      'userRankings': userRankings,
    };
  }
}

class AfterSalesReviewsCreateResult {
  final int code;
  final dynamic data;
  final String traceId;

  AfterSalesReviewsCreateResult({
    required this.code,
    required this.data,
    required this.traceId
  });

  factory AfterSalesReviewsCreateResult.fromJson(Map<String, dynamic> json) {
    return AfterSalesReviewsCreateResult(
      code: (() {
        final value = json['code'];
        if (value is! int) {
          throw FormatException('AfterSalesReviewsCreateResult.code is required');
        }
        return value;
      })(),
      data: json['data'],
      traceId: (() {
        final value = json['traceId']?.toString();
        if (value == null) {
          throw FormatException('AfterSalesReviewsCreateResult.traceId is required');
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

class AiResourceGroupsCreateResult {
  final int code;
  final dynamic data;
  final String traceId;

  AiResourceGroupsCreateResult({
    required this.code,
    required this.data,
    required this.traceId
  });

  factory AiResourceGroupsCreateResult.fromJson(Map<String, dynamic> json) {
    return AiResourceGroupsCreateResult(
      code: (() {
        final value = json['code'];
        if (value is! int) {
          throw FormatException('AiResourceGroupsCreateResult.code is required');
        }
        return value;
      })(),
      data: json['data'],
      traceId: (() {
        final value = json['traceId']?.toString();
        if (value == null) {
          throw FormatException('AiResourceGroupsCreateResult.traceId is required');
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

class AiResourceGroupsDeleteResult {
  final int code;
  final dynamic data;
  final String traceId;

  AiResourceGroupsDeleteResult({
    required this.code,
    required this.data,
    required this.traceId
  });

  factory AiResourceGroupsDeleteResult.fromJson(Map<String, dynamic> json) {
    return AiResourceGroupsDeleteResult(
      code: (() {
        final value = json['code'];
        if (value is! int) {
          throw FormatException('AiResourceGroupsDeleteResult.code is required');
        }
        return value;
      })(),
      data: json['data'],
      traceId: (() {
        final value = json['traceId']?.toString();
        if (value == null) {
          throw FormatException('AiResourceGroupsDeleteResult.traceId is required');
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

class AiResourceGroupsListResult {
  final int code;
  final dynamic data;
  final String traceId;

  AiResourceGroupsListResult({
    required this.code,
    required this.data,
    required this.traceId
  });

  factory AiResourceGroupsListResult.fromJson(Map<String, dynamic> json) {
    return AiResourceGroupsListResult(
      code: (() {
        final value = json['code'];
        if (value is! int) {
          throw FormatException('AiResourceGroupsListResult.code is required');
        }
        return value;
      })(),
      data: json['data'],
      traceId: (() {
        final value = json['traceId']?.toString();
        if (value == null) {
          throw FormatException('AiResourceGroupsListResult.traceId is required');
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

class AiResourceGroupsResourcesListResult {
  final int code;
  final dynamic data;
  final String traceId;

  AiResourceGroupsResourcesListResult({
    required this.code,
    required this.data,
    required this.traceId
  });

  factory AiResourceGroupsResourcesListResult.fromJson(Map<String, dynamic> json) {
    return AiResourceGroupsResourcesListResult(
      code: (() {
        final value = json['code'];
        if (value is! int) {
          throw FormatException('AiResourceGroupsResourcesListResult.code is required');
        }
        return value;
      })(),
      data: json['data'],
      traceId: (() {
        final value = json['traceId']?.toString();
        if (value == null) {
          throw FormatException('AiResourceGroupsResourcesListResult.traceId is required');
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

class AiResourceGroupsUpdateResult {
  final int code;
  final dynamic data;
  final String traceId;

  AiResourceGroupsUpdateResult({
    required this.code,
    required this.data,
    required this.traceId
  });

  factory AiResourceGroupsUpdateResult.fromJson(Map<String, dynamic> json) {
    return AiResourceGroupsUpdateResult(
      code: (() {
        final value = json['code'];
        if (value is! int) {
          throw FormatException('AiResourceGroupsUpdateResult.code is required');
        }
        return value;
      })(),
      data: json['data'],
      traceId: (() {
        final value = json['traceId']?.toString();
        if (value == null) {
          throw FormatException('AiResourceGroupsUpdateResult.traceId is required');
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

class AiResourcesCreateResult {
  final int code;
  final dynamic data;
  final String traceId;

  AiResourcesCreateResult({
    required this.code,
    required this.data,
    required this.traceId
  });

  factory AiResourcesCreateResult.fromJson(Map<String, dynamic> json) {
    return AiResourcesCreateResult(
      code: (() {
        final value = json['code'];
        if (value is! int) {
          throw FormatException('AiResourcesCreateResult.code is required');
        }
        return value;
      })(),
      data: json['data'],
      traceId: (() {
        final value = json['traceId']?.toString();
        if (value == null) {
          throw FormatException('AiResourcesCreateResult.traceId is required');
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

class AiResourcesListResult {
  final int code;
  final dynamic data;
  final String traceId;

  AiResourcesListResult({
    required this.code,
    required this.data,
    required this.traceId
  });

  factory AiResourcesListResult.fromJson(Map<String, dynamic> json) {
    return AiResourcesListResult(
      code: (() {
        final value = json['code'];
        if (value is! int) {
          throw FormatException('AiResourcesListResult.code is required');
        }
        return value;
      })(),
      data: json['data'],
      traceId: (() {
        final value = json['traceId']?.toString();
        if (value == null) {
          throw FormatException('AiResourcesListResult.traceId is required');
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

class AiResourcesUpdateResult {
  final int code;
  final dynamic data;
  final String traceId;

  AiResourcesUpdateResult({
    required this.code,
    required this.data,
    required this.traceId
  });

  factory AiResourcesUpdateResult.fromJson(Map<String, dynamic> json) {
    return AiResourcesUpdateResult(
      code: (() {
        final value = json['code'];
        if (value is! int) {
          throw FormatException('AiResourcesUpdateResult.code is required');
        }
        return value;
      })(),
      data: json['data'],
      traceId: (() {
        final value = json['traceId']?.toString();
        if (value == null) {
          throw FormatException('AiResourcesUpdateResult.traceId is required');
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

class AnalyticsAdminOverviewRetrieveResult {
  final int code;
  final dynamic data;
  final String traceId;

  AnalyticsAdminOverviewRetrieveResult({
    required this.code,
    required this.data,
    required this.traceId
  });

  factory AnalyticsAdminOverviewRetrieveResult.fromJson(Map<String, dynamic> json) {
    return AnalyticsAdminOverviewRetrieveResult(
      code: (() {
        final value = json['code'];
        if (value is! int) {
          throw FormatException('AnalyticsAdminOverviewRetrieveResult.code is required');
        }
        return value;
      })(),
      data: json['data'],
      traceId: (() {
        final value = json['traceId']?.toString();
        if (value == null) {
          throw FormatException('AnalyticsAdminOverviewRetrieveResult.traceId is required');
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

class AuthSettingsRetrieveResult {
  final int code;
  final dynamic data;
  final String traceId;

  AuthSettingsRetrieveResult({
    required this.code,
    required this.data,
    required this.traceId
  });

  factory AuthSettingsRetrieveResult.fromJson(Map<String, dynamic> json) {
    return AuthSettingsRetrieveResult(
      code: (() {
        final value = json['code'];
        if (value is! int) {
          throw FormatException('AuthSettingsRetrieveResult.code is required');
        }
        return value;
      })(),
      data: json['data'],
      traceId: (() {
        final value = json['traceId']?.toString();
        if (value == null) {
          throw FormatException('AuthSettingsRetrieveResult.traceId is required');
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

class AuthSettingsUpdateResult {
  final int code;
  final dynamic data;
  final String traceId;

  AuthSettingsUpdateResult({
    required this.code,
    required this.data,
    required this.traceId
  });

  factory AuthSettingsUpdateResult.fromJson(Map<String, dynamic> json) {
    return AuthSettingsUpdateResult(
      code: (() {
        final value = json['code'];
        if (value is! int) {
          throw FormatException('AuthSettingsUpdateResult.code is required');
        }
        return value;
      })(),
      data: json['data'],
      traceId: (() {
        final value = json['traceId']?.toString();
        if (value == null) {
          throw FormatException('AuthSettingsUpdateResult.traceId is required');
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

class CacheInstancesDeleteResult {
  final int code;
  final dynamic data;
  final String traceId;

  CacheInstancesDeleteResult({
    required this.code,
    required this.data,
    required this.traceId
  });

  factory CacheInstancesDeleteResult.fromJson(Map<String, dynamic> json) {
    return CacheInstancesDeleteResult(
      code: (() {
        final value = json['code'];
        if (value is! int) {
          throw FormatException('CacheInstancesDeleteResult.code is required');
        }
        return value;
      })(),
      data: json['data'],
      traceId: (() {
        final value = json['traceId']?.toString();
        if (value == null) {
          throw FormatException('CacheInstancesDeleteResult.traceId is required');
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

class CacheInstancesRefreshCreateResult {
  final int code;
  final dynamic data;
  final String traceId;

  CacheInstancesRefreshCreateResult({
    required this.code,
    required this.data,
    required this.traceId
  });

  factory CacheInstancesRefreshCreateResult.fromJson(Map<String, dynamic> json) {
    return CacheInstancesRefreshCreateResult(
      code: (() {
        final value = json['code'];
        if (value is! int) {
          throw FormatException('CacheInstancesRefreshCreateResult.code is required');
        }
        return value;
      })(),
      data: json['data'],
      traceId: (() {
        final value = json['traceId']?.toString();
        if (value == null) {
          throw FormatException('CacheInstancesRefreshCreateResult.traceId is required');
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

class CacheNamespaceKeyPage {
  final String instanceName;
  final List<Map<String, dynamic>> items;
  final String namespace;
  final PageInfo pageInfo;
  final String returnedItems;
  final bool scanComplete;
  final String scannedItems;

  CacheNamespaceKeyPage({
    required this.instanceName,
    required this.items,
    required this.namespace,
    required this.pageInfo,
    required this.returnedItems,
    required this.scanComplete,
    required this.scannedItems
  });

  factory CacheNamespaceKeyPage.fromJson(Map<String, dynamic> json) {
    return CacheNamespaceKeyPage(
      instanceName: (() {
        final value = json['instanceName']?.toString();
        if (value == null) {
          throw FormatException('CacheNamespaceKeyPage.instanceName is required');
        }
        return value;
      })(),
      items: (() {
        final list = _sdkworkAsList(json['items']);
        if (list == null) {
          throw FormatException('CacheNamespaceKeyPage.items is required');
        }
        return list
            .map((item) => _sdkworkAsMap(item))
            .whereType<Map<String, dynamic>>()
            .toList();
      })(),
      namespace: (() {
        final value = json['namespace']?.toString();
        if (value == null) {
          throw FormatException('CacheNamespaceKeyPage.namespace is required');
        }
        return value;
      })(),
      pageInfo: (() {
        final map = _sdkworkAsMap(json['pageInfo']);
        if (map == null) {
          throw FormatException('CacheNamespaceKeyPage.pageInfo is required');
        }
        return PageInfo.fromJson(map);
      })(),
      returnedItems: (() {
        final value = json['returnedItems']?.toString();
        if (value == null) {
          throw FormatException('CacheNamespaceKeyPage.returnedItems is required');
        }
        return value;
      })(),
      scanComplete: (() {
        final value = json['scanComplete'];
        if (value is! bool) {
          throw FormatException('CacheNamespaceKeyPage.scanComplete is required');
        }
        return value;
      })(),
      scannedItems: (() {
        final value = json['scannedItems']?.toString();
        if (value == null) {
          throw FormatException('CacheNamespaceKeyPage.scannedItems is required');
        }
        return value;
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'instanceName': instanceName,
      'items': items.map((item) => item).toList(),
      'namespace': namespace,
      'pageInfo': pageInfo.toJson(),
      'returnedItems': returnedItems,
      'scanComplete': scanComplete,
      'scannedItems': scannedItems,
    };
  }
}

class CacheNamespacesDeleteResult {
  final int code;
  final dynamic data;
  final String traceId;

  CacheNamespacesDeleteResult({
    required this.code,
    required this.data,
    required this.traceId
  });

  factory CacheNamespacesDeleteResult.fromJson(Map<String, dynamic> json) {
    return CacheNamespacesDeleteResult(
      code: (() {
        final value = json['code'];
        if (value is! int) {
          throw FormatException('CacheNamespacesDeleteResult.code is required');
        }
        return value;
      })(),
      data: json['data'],
      traceId: (() {
        final value = json['traceId']?.toString();
        if (value == null) {
          throw FormatException('CacheNamespacesDeleteResult.traceId is required');
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

class CacheNamespacesKeysDeleteResult {
  final int code;
  final dynamic data;
  final String traceId;

  CacheNamespacesKeysDeleteResult({
    required this.code,
    required this.data,
    required this.traceId
  });

  factory CacheNamespacesKeysDeleteResult.fromJson(Map<String, dynamic> json) {
    return CacheNamespacesKeysDeleteResult(
      code: (() {
        final value = json['code'];
        if (value is! int) {
          throw FormatException('CacheNamespacesKeysDeleteResult.code is required');
        }
        return value;
      })(),
      data: json['data'],
      traceId: (() {
        final value = json['traceId']?.toString();
        if (value == null) {
          throw FormatException('CacheNamespacesKeysDeleteResult.traceId is required');
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

class CacheNamespacesKeysListResult {
  final int code;
  final dynamic data;
  final String traceId;

  CacheNamespacesKeysListResult({
    required this.code,
    required this.data,
    required this.traceId
  });

  factory CacheNamespacesKeysListResult.fromJson(Map<String, dynamic> json) {
    return CacheNamespacesKeysListResult(
      code: (() {
        final value = json['code'];
        if (value is! int) {
          throw FormatException('CacheNamespacesKeysListResult.code is required');
        }
        return value;
      })(),
      data: json['data'],
      traceId: (() {
        final value = json['traceId']?.toString();
        if (value == null) {
          throw FormatException('CacheNamespacesKeysListResult.traceId is required');
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

class CacheNamespacesRefreshCreateResult {
  final int code;
  final dynamic data;
  final String traceId;

  CacheNamespacesRefreshCreateResult({
    required this.code,
    required this.data,
    required this.traceId
  });

  factory CacheNamespacesRefreshCreateResult.fromJson(Map<String, dynamic> json) {
    return CacheNamespacesRefreshCreateResult(
      code: (() {
        final value = json['code'];
        if (value is! int) {
          throw FormatException('CacheNamespacesRefreshCreateResult.code is required');
        }
        return value;
      })(),
      data: json['data'],
      traceId: (() {
        final value = json['traceId']?.toString();
        if (value == null) {
          throw FormatException('CacheNamespacesRefreshCreateResult.traceId is required');
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

class CacheOperationOutcome {
  final String cacheKey;
  final String deletedEntries;
  final String instanceName;
  final String namespace;
  final String operation;
  final String refreshedEntries;
  final String status;

  CacheOperationOutcome({
    required this.cacheKey,
    required this.deletedEntries,
    required this.instanceName,
    required this.namespace,
    required this.operation,
    required this.refreshedEntries,
    required this.status
  });

  factory CacheOperationOutcome.fromJson(Map<String, dynamic> json) {
    return CacheOperationOutcome(
      cacheKey: (() {
        final value = json['cacheKey']?.toString();
        if (value == null) {
          throw FormatException('CacheOperationOutcome.cacheKey is required');
        }
        return value;
      })(),
      deletedEntries: (() {
        final value = json['deletedEntries']?.toString();
        if (value == null) {
          throw FormatException('CacheOperationOutcome.deletedEntries is required');
        }
        return value;
      })(),
      instanceName: (() {
        final value = json['instanceName']?.toString();
        if (value == null) {
          throw FormatException('CacheOperationOutcome.instanceName is required');
        }
        return value;
      })(),
      namespace: (() {
        final value = json['namespace']?.toString();
        if (value == null) {
          throw FormatException('CacheOperationOutcome.namespace is required');
        }
        return value;
      })(),
      operation: (() {
        final value = json['operation']?.toString();
        if (value == null) {
          throw FormatException('CacheOperationOutcome.operation is required');
        }
        return value;
      })(),
      refreshedEntries: (() {
        final value = json['refreshedEntries']?.toString();
        if (value == null) {
          throw FormatException('CacheOperationOutcome.refreshedEntries is required');
        }
        return value;
      })(),
      status: (() {
        final value = json['status']?.toString();
        if (value == null) {
          throw FormatException('CacheOperationOutcome.status is required');
        }
        return value;
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'cacheKey': cacheKey,
      'deletedEntries': deletedEntries,
      'instanceName': instanceName,
      'namespace': namespace,
      'operation': operation,
      'refreshedEntries': refreshedEntries,
      'status': status,
    };
  }
}

class CacheOverview {
  final List<Map<String, dynamic>> instances;
  final List<Map<String, dynamic>> namespacePolicies;
  final Map<String, dynamic> summary;

  CacheOverview({
    required this.instances,
    required this.namespacePolicies,
    required this.summary
  });

  factory CacheOverview.fromJson(Map<String, dynamic> json) {
    return CacheOverview(
      instances: (() {
        final list = _sdkworkAsList(json['instances']);
        if (list == null) {
          throw FormatException('CacheOverview.instances is required');
        }
        return list
            .map((item) => _sdkworkAsMap(item))
            .whereType<Map<String, dynamic>>()
            .toList();
      })(),
      namespacePolicies: (() {
        final list = _sdkworkAsList(json['namespacePolicies']);
        if (list == null) {
          throw FormatException('CacheOverview.namespacePolicies is required');
        }
        return list
            .map((item) => _sdkworkAsMap(item))
            .whereType<Map<String, dynamic>>()
            .toList();
      })(),
      summary: (() {
        final map = _sdkworkAsMap(json['summary']);
        if (map == null) {
          throw FormatException('CacheOverview.summary is required');
        }
        return map;
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'instances': instances.map((item) => item).toList(),
      'namespacePolicies': namespacePolicies.map((item) => item).toList(),
      'summary': summary,
    };
  }
}

class CacheOverviewRetrieveResult {
  final int code;
  final dynamic data;
  final String traceId;

  CacheOverviewRetrieveResult({
    required this.code,
    required this.data,
    required this.traceId
  });

  factory CacheOverviewRetrieveResult.fromJson(Map<String, dynamic> json) {
    return CacheOverviewRetrieveResult(
      code: (() {
        final value = json['code'];
        if (value is! int) {
          throw FormatException('CacheOverviewRetrieveResult.code is required');
        }
        return value;
      })(),
      data: json['data'],
      traceId: (() {
        final value = json['traceId']?.toString();
        if (value == null) {
          throw FormatException('CacheOverviewRetrieveResult.traceId is required');
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

class CacheRefreshCreateResult {
  final int code;
  final dynamic data;
  final String traceId;

  CacheRefreshCreateResult({
    required this.code,
    required this.data,
    required this.traceId
  });

  factory CacheRefreshCreateResult.fromJson(Map<String, dynamic> json) {
    return CacheRefreshCreateResult(
      code: (() {
        final value = json['code'];
        if (value is! int) {
          throw FormatException('CacheRefreshCreateResult.code is required');
        }
        return value;
      })(),
      data: json['data'],
      traceId: (() {
        final value = json['traceId']?.toString();
        if (value == null) {
          throw FormatException('CacheRefreshCreateResult.traceId is required');
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

class ChannelGroupsChannelBindingsListResult {
  final int code;
  final dynamic data;
  final String traceId;

  ChannelGroupsChannelBindingsListResult({
    required this.code,
    required this.data,
    required this.traceId
  });

  factory ChannelGroupsChannelBindingsListResult.fromJson(Map<String, dynamic> json) {
    return ChannelGroupsChannelBindingsListResult(
      code: (() {
        final value = json['code'];
        if (value is! int) {
          throw FormatException('ChannelGroupsChannelBindingsListResult.code is required');
        }
        return value;
      })(),
      data: json['data'],
      traceId: (() {
        final value = json['traceId']?.toString();
        if (value == null) {
          throw FormatException('ChannelGroupsChannelBindingsListResult.traceId is required');
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

class ChannelGroupsChannelBindingsUpdateResult {
  final int code;
  final dynamic data;
  final String traceId;

  ChannelGroupsChannelBindingsUpdateResult({
    required this.code,
    required this.data,
    required this.traceId
  });

  factory ChannelGroupsChannelBindingsUpdateResult.fromJson(Map<String, dynamic> json) {
    return ChannelGroupsChannelBindingsUpdateResult(
      code: (() {
        final value = json['code'];
        if (value is! int) {
          throw FormatException('ChannelGroupsChannelBindingsUpdateResult.code is required');
        }
        return value;
      })(),
      data: json['data'],
      traceId: (() {
        final value = json['traceId']?.toString();
        if (value == null) {
          throw FormatException('ChannelGroupsChannelBindingsUpdateResult.traceId is required');
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

class ChannelGroupsCreateResult {
  final int code;
  final dynamic data;
  final String traceId;

  ChannelGroupsCreateResult({
    required this.code,
    required this.data,
    required this.traceId
  });

  factory ChannelGroupsCreateResult.fromJson(Map<String, dynamic> json) {
    return ChannelGroupsCreateResult(
      code: (() {
        final value = json['code'];
        if (value is! int) {
          throw FormatException('ChannelGroupsCreateResult.code is required');
        }
        return value;
      })(),
      data: json['data'],
      traceId: (() {
        final value = json['traceId']?.toString();
        if (value == null) {
          throw FormatException('ChannelGroupsCreateResult.traceId is required');
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

class ChannelGroupsDeleteResult {
  final int code;
  final dynamic data;
  final String traceId;

  ChannelGroupsDeleteResult({
    required this.code,
    required this.data,
    required this.traceId
  });

  factory ChannelGroupsDeleteResult.fromJson(Map<String, dynamic> json) {
    return ChannelGroupsDeleteResult(
      code: (() {
        final value = json['code'];
        if (value is! int) {
          throw FormatException('ChannelGroupsDeleteResult.code is required');
        }
        return value;
      })(),
      data: json['data'],
      traceId: (() {
        final value = json['traceId']?.toString();
        if (value == null) {
          throw FormatException('ChannelGroupsDeleteResult.traceId is required');
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

class ChannelGroupsListResult {
  final int code;
  final dynamic data;
  final String traceId;

  ChannelGroupsListResult({
    required this.code,
    required this.data,
    required this.traceId
  });

  factory ChannelGroupsListResult.fromJson(Map<String, dynamic> json) {
    return ChannelGroupsListResult(
      code: (() {
        final value = json['code'];
        if (value is! int) {
          throw FormatException('ChannelGroupsListResult.code is required');
        }
        return value;
      })(),
      data: json['data'],
      traceId: (() {
        final value = json['traceId']?.toString();
        if (value == null) {
          throw FormatException('ChannelGroupsListResult.traceId is required');
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

class ChannelGroupsRouteExplainRetrieveResult {
  final int code;
  final dynamic data;
  final String traceId;

  ChannelGroupsRouteExplainRetrieveResult({
    required this.code,
    required this.data,
    required this.traceId
  });

  factory ChannelGroupsRouteExplainRetrieveResult.fromJson(Map<String, dynamic> json) {
    return ChannelGroupsRouteExplainRetrieveResult(
      code: (() {
        final value = json['code'];
        if (value is! int) {
          throw FormatException('ChannelGroupsRouteExplainRetrieveResult.code is required');
        }
        return value;
      })(),
      data: json['data'],
      traceId: (() {
        final value = json['traceId']?.toString();
        if (value == null) {
          throw FormatException('ChannelGroupsRouteExplainRetrieveResult.traceId is required');
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

class ChannelGroupsUpdateResult {
  final int code;
  final dynamic data;
  final String traceId;

  ChannelGroupsUpdateResult({
    required this.code,
    required this.data,
    required this.traceId
  });

  factory ChannelGroupsUpdateResult.fromJson(Map<String, dynamic> json) {
    return ChannelGroupsUpdateResult(
      code: (() {
        final value = json['code'];
        if (value is! int) {
          throw FormatException('ChannelGroupsUpdateResult.code is required');
        }
        return value;
      })(),
      data: json['data'],
      traceId: (() {
        final value = json['traceId']?.toString();
        if (value == null) {
          throw FormatException('ChannelGroupsUpdateResult.traceId is required');
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

class ChannelsCreateResult {
  final int code;
  final dynamic data;
  final String traceId;

  ChannelsCreateResult({
    required this.code,
    required this.data,
    required this.traceId
  });

  factory ChannelsCreateResult.fromJson(Map<String, dynamic> json) {
    return ChannelsCreateResult(
      code: (() {
        final value = json['code'];
        if (value is! int) {
          throw FormatException('ChannelsCreateResult.code is required');
        }
        return value;
      })(),
      data: json['data'],
      traceId: (() {
        final value = json['traceId']?.toString();
        if (value == null) {
          throw FormatException('ChannelsCreateResult.traceId is required');
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

class ChannelsDeleteResult {
  final int code;
  final dynamic data;
  final String traceId;

  ChannelsDeleteResult({
    required this.code,
    required this.data,
    required this.traceId
  });

  factory ChannelsDeleteResult.fromJson(Map<String, dynamic> json) {
    return ChannelsDeleteResult(
      code: (() {
        final value = json['code'];
        if (value is! int) {
          throw FormatException('ChannelsDeleteResult.code is required');
        }
        return value;
      })(),
      data: json['data'],
      traceId: (() {
        final value = json['traceId']?.toString();
        if (value == null) {
          throw FormatException('ChannelsDeleteResult.traceId is required');
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

class ChannelsListResult {
  final int code;
  final dynamic data;
  final String traceId;

  ChannelsListResult({
    required this.code,
    required this.data,
    required this.traceId
  });

  factory ChannelsListResult.fromJson(Map<String, dynamic> json) {
    return ChannelsListResult(
      code: (() {
        final value = json['code'];
        if (value is! int) {
          throw FormatException('ChannelsListResult.code is required');
        }
        return value;
      })(),
      data: json['data'],
      traceId: (() {
        final value = json['traceId']?.toString();
        if (value == null) {
          throw FormatException('ChannelsListResult.traceId is required');
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

class ChannelsUpdateResult {
  final int code;
  final dynamic data;
  final String traceId;

  ChannelsUpdateResult({
    required this.code,
    required this.data,
    required this.traceId
  });

  factory ChannelsUpdateResult.fromJson(Map<String, dynamic> json) {
    return ChannelsUpdateResult(
      code: (() {
        final value = json['code'];
        if (value is! int) {
          throw FormatException('ChannelsUpdateResult.code is required');
        }
        return value;
      })(),
      data: json['data'],
      traceId: (() {
        final value = json['traceId']?.toString();
        if (value == null) {
          throw FormatException('ChannelsUpdateResult.traceId is required');
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

class ChannelsVerifyResult {
  final int code;
  final dynamic data;
  final String traceId;

  ChannelsVerifyResult({
    required this.code,
    required this.data,
    required this.traceId
  });

  factory ChannelsVerifyResult.fromJson(Map<String, dynamic> json) {
    return ChannelsVerifyResult(
      code: (() {
        final value = json['code'];
        if (value is! int) {
          throw FormatException('ChannelsVerifyResult.code is required');
        }
        return value;
      })(),
      data: json['data'],
      traceId: (() {
        final value = json['traceId']?.toString();
        if (value == null) {
          throw FormatException('ChannelsVerifyResult.traceId is required');
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

class DashboardAdminOverviewRetrieveResult {
  final int code;
  final dynamic data;
  final String traceId;

  DashboardAdminOverviewRetrieveResult({
    required this.code,
    required this.data,
    required this.traceId
  });

  factory DashboardAdminOverviewRetrieveResult.fromJson(Map<String, dynamic> json) {
    return DashboardAdminOverviewRetrieveResult(
      code: (() {
        final value = json['code'];
        if (value is! int) {
          throw FormatException('DashboardAdminOverviewRetrieveResult.code is required');
        }
        return value;
      })(),
      data: json['data'],
      traceId: (() {
        final value = json['traceId']?.toString();
        if (value == null) {
          throw FormatException('DashboardAdminOverviewRetrieveResult.traceId is required');
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

class FieldError {
  final int? code;
  final String field;
  final String message;

  FieldError({
    this.code,
    required this.field,
    required this.message
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
      message: (() {
        final value = json['message']?.toString();
        if (value == null) {
          throw FormatException('FieldError.message is required');
        }
        return value;
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'code': code,
      'field': field,
      'message': message,
    };
  }
}

class FirewallsRulesCreateResult {
  final int code;
  final dynamic data;
  final String traceId;

  FirewallsRulesCreateResult({
    required this.code,
    required this.data,
    required this.traceId
  });

  factory FirewallsRulesCreateResult.fromJson(Map<String, dynamic> json) {
    return FirewallsRulesCreateResult(
      code: (() {
        final value = json['code'];
        if (value is! int) {
          throw FormatException('FirewallsRulesCreateResult.code is required');
        }
        return value;
      })(),
      data: json['data'],
      traceId: (() {
        final value = json['traceId']?.toString();
        if (value == null) {
          throw FormatException('FirewallsRulesCreateResult.traceId is required');
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

class FirewallsRulesDeleteResult {
  final int code;
  final dynamic data;
  final String traceId;

  FirewallsRulesDeleteResult({
    required this.code,
    required this.data,
    required this.traceId
  });

  factory FirewallsRulesDeleteResult.fromJson(Map<String, dynamic> json) {
    return FirewallsRulesDeleteResult(
      code: (() {
        final value = json['code'];
        if (value is! int) {
          throw FormatException('FirewallsRulesDeleteResult.code is required');
        }
        return value;
      })(),
      data: json['data'],
      traceId: (() {
        final value = json['traceId']?.toString();
        if (value == null) {
          throw FormatException('FirewallsRulesDeleteResult.traceId is required');
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

class FirewallsRulesListResult {
  final int code;
  final dynamic data;
  final String traceId;

  FirewallsRulesListResult({
    required this.code,
    required this.data,
    required this.traceId
  });

  factory FirewallsRulesListResult.fromJson(Map<String, dynamic> json) {
    return FirewallsRulesListResult(
      code: (() {
        final value = json['code'];
        if (value is! int) {
          throw FormatException('FirewallsRulesListResult.code is required');
        }
        return value;
      })(),
      data: json['data'],
      traceId: (() {
        final value = json['traceId']?.toString();
        if (value == null) {
          throw FormatException('FirewallsRulesListResult.traceId is required');
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

class HealthCheckCreateResult {
  final int code;
  final dynamic data;
  final String traceId;

  HealthCheckCreateResult({
    required this.code,
    required this.data,
    required this.traceId
  });

  factory HealthCheckCreateResult.fromJson(Map<String, dynamic> json) {
    return HealthCheckCreateResult(
      code: (() {
        final value = json['code'];
        if (value is! int) {
          throw FormatException('HealthCheckCreateResult.code is required');
        }
        return value;
      })(),
      data: json['data'],
      traceId: (() {
        final value = json['traceId']?.toString();
        if (value == null) {
          throw FormatException('HealthCheckCreateResult.traceId is required');
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

class InstallationStatusRetrieveResult {
  final int code;
  final dynamic data;
  final String traceId;

  InstallationStatusRetrieveResult({
    required this.code,
    required this.data,
    required this.traceId
  });

  factory InstallationStatusRetrieveResult.fromJson(Map<String, dynamic> json) {
    return InstallationStatusRetrieveResult(
      code: (() {
        final value = json['code'];
        if (value is! int) {
          throw FormatException('InstallationStatusRetrieveResult.code is required');
        }
        return value;
      })(),
      data: json['data'],
      traceId: (() {
        final value = json['traceId']?.toString();
        if (value == null) {
          throw FormatException('InstallationStatusRetrieveResult.traceId is required');
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

class MarketingReferralStatsListResult {
  final int code;
  final dynamic data;
  final String traceId;

  MarketingReferralStatsListResult({
    required this.code,
    required this.data,
    required this.traceId
  });

  factory MarketingReferralStatsListResult.fromJson(Map<String, dynamic> json) {
    return MarketingReferralStatsListResult(
      code: (() {
        final value = json['code'];
        if (value is! int) {
          throw FormatException('MarketingReferralStatsListResult.code is required');
        }
        return value;
      })(),
      data: json['data'],
      traceId: (() {
        final value = json['traceId']?.toString();
        if (value == null) {
          throw FormatException('MarketingReferralStatsListResult.traceId is required');
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

class ModelCatalogPage {
  final List<Map<String, dynamic>> groups;
  final List<Map<String, dynamic>> items;
  final PageInfo pageInfo;

  ModelCatalogPage({
    required this.groups,
    required this.items,
    required this.pageInfo
  });

  factory ModelCatalogPage.fromJson(Map<String, dynamic> json) {
    return ModelCatalogPage(
      groups: (() {
        final list = _sdkworkAsList(json['groups']);
        if (list == null) {
          throw FormatException('ModelCatalogPage.groups is required');
        }
        return list
            .map((item) => _sdkworkAsMap(item))
            .whereType<Map<String, dynamic>>()
            .toList();
      })(),
      items: (() {
        final list = _sdkworkAsList(json['items']);
        if (list == null) {
          throw FormatException('ModelCatalogPage.items is required');
        }
        return list
            .map((item) => (() {
        final map = _sdkworkAsMap(item);
        if (map == null) {
          return null;
        }
        final result = <String, String>{};
        map.forEach((key, nestedItem) {
          final deserialized = nestedItem?.toString();
          if (deserialized is String) {
            result[key] = deserialized;
          }
        });
        return result;
      })())
            .whereType<Map<String, dynamic>>()
            .toList();
      })(),
      pageInfo: (() {
        final map = _sdkworkAsMap(json['pageInfo']);
        if (map == null) {
          throw FormatException('ModelCatalogPage.pageInfo is required');
        }
        return PageInfo.fromJson(map);
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'groups': groups.map((item) => item).toList(),
      'items': items.map((item) => item.map((key, nestedItem) => MapEntry(key, nestedItem))).toList(),
      'pageInfo': pageInfo.toJson(),
    };
  }
}

class ModelMappingOptionsListResult {
  final int code;
  final dynamic data;
  final String traceId;

  ModelMappingOptionsListResult({
    required this.code,
    required this.data,
    required this.traceId
  });

  factory ModelMappingOptionsListResult.fromJson(Map<String, dynamic> json) {
    return ModelMappingOptionsListResult(
      code: (() {
        final value = json['code'];
        if (value is! int) {
          throw FormatException('ModelMappingOptionsListResult.code is required');
        }
        return value;
      })(),
      data: json['data'],
      traceId: (() {
        final value = json['traceId']?.toString();
        if (value == null) {
          throw FormatException('ModelMappingOptionsListResult.traceId is required');
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

class ModelMappingsCreateResult {
  final int code;
  final dynamic data;
  final String traceId;

  ModelMappingsCreateResult({
    required this.code,
    required this.data,
    required this.traceId
  });

  factory ModelMappingsCreateResult.fromJson(Map<String, dynamic> json) {
    return ModelMappingsCreateResult(
      code: (() {
        final value = json['code'];
        if (value is! int) {
          throw FormatException('ModelMappingsCreateResult.code is required');
        }
        return value;
      })(),
      data: json['data'],
      traceId: (() {
        final value = json['traceId']?.toString();
        if (value == null) {
          throw FormatException('ModelMappingsCreateResult.traceId is required');
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

class ModelMappingsDeleteResult {
  final int code;
  final dynamic data;
  final String traceId;

  ModelMappingsDeleteResult({
    required this.code,
    required this.data,
    required this.traceId
  });

  factory ModelMappingsDeleteResult.fromJson(Map<String, dynamic> json) {
    return ModelMappingsDeleteResult(
      code: (() {
        final value = json['code'];
        if (value is! int) {
          throw FormatException('ModelMappingsDeleteResult.code is required');
        }
        return value;
      })(),
      data: json['data'],
      traceId: (() {
        final value = json['traceId']?.toString();
        if (value == null) {
          throw FormatException('ModelMappingsDeleteResult.traceId is required');
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

class ModelMappingsListResult {
  final int code;
  final dynamic data;
  final String traceId;

  ModelMappingsListResult({
    required this.code,
    required this.data,
    required this.traceId
  });

  factory ModelMappingsListResult.fromJson(Map<String, dynamic> json) {
    return ModelMappingsListResult(
      code: (() {
        final value = json['code'];
        if (value is! int) {
          throw FormatException('ModelMappingsListResult.code is required');
        }
        return value;
      })(),
      data: json['data'],
      traceId: (() {
        final value = json['traceId']?.toString();
        if (value == null) {
          throw FormatException('ModelMappingsListResult.traceId is required');
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

class ModelMappingsReplaceResult {
  final int code;
  final dynamic data;
  final String traceId;

  ModelMappingsReplaceResult({
    required this.code,
    required this.data,
    required this.traceId
  });

  factory ModelMappingsReplaceResult.fromJson(Map<String, dynamic> json) {
    return ModelMappingsReplaceResult(
      code: (() {
        final value = json['code'];
        if (value is! int) {
          throw FormatException('ModelMappingsReplaceResult.code is required');
        }
        return value;
      })(),
      data: json['data'],
      traceId: (() {
        final value = json['traceId']?.toString();
        if (value == null) {
          throw FormatException('ModelMappingsReplaceResult.traceId is required');
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

class ModelMappingsResolveCreateResult {
  final int code;
  final dynamic data;
  final String traceId;

  ModelMappingsResolveCreateResult({
    required this.code,
    required this.data,
    required this.traceId
  });

  factory ModelMappingsResolveCreateResult.fromJson(Map<String, dynamic> json) {
    return ModelMappingsResolveCreateResult(
      code: (() {
        final value = json['code'];
        if (value is! int) {
          throw FormatException('ModelMappingsResolveCreateResult.code is required');
        }
        return value;
      })(),
      data: json['data'],
      traceId: (() {
        final value = json['traceId']?.toString();
        if (value == null) {
          throw FormatException('ModelMappingsResolveCreateResult.traceId is required');
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

class ModelMappingsUpdateResult {
  final int code;
  final dynamic data;
  final String traceId;

  ModelMappingsUpdateResult({
    required this.code,
    required this.data,
    required this.traceId
  });

  factory ModelMappingsUpdateResult.fromJson(Map<String, dynamic> json) {
    return ModelMappingsUpdateResult(
      code: (() {
        final value = json['code'];
        if (value is! int) {
          throw FormatException('ModelMappingsUpdateResult.code is required');
        }
        return value;
      })(),
      data: json['data'],
      traceId: (() {
        final value = json['traceId']?.toString();
        if (value == null) {
          throw FormatException('ModelMappingsUpdateResult.traceId is required');
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

class ModelRankingRefreshJobHistoryPage {
  final List<Map<String, dynamic>> items;
  final PageInfo pageInfo;

  ModelRankingRefreshJobHistoryPage({
    required this.items,
    required this.pageInfo
  });

  factory ModelRankingRefreshJobHistoryPage.fromJson(Map<String, dynamic> json) {
    return ModelRankingRefreshJobHistoryPage(
      items: (() {
        final list = _sdkworkAsList(json['items']);
        if (list == null) {
          throw FormatException('ModelRankingRefreshJobHistoryPage.items is required');
        }
        return list
            .map((item) => (() {
        final map = _sdkworkAsMap(item);
        if (map == null) {
          return null;
        }
        final result = <String, String>{};
        map.forEach((key, nestedItem) {
          final deserialized = nestedItem?.toString();
          if (deserialized is String) {
            result[key] = deserialized;
          }
        });
        return result;
      })())
            .whereType<Map<String, dynamic>>()
            .toList();
      })(),
      pageInfo: (() {
        final map = _sdkworkAsMap(json['pageInfo']);
        if (map == null) {
          throw FormatException('ModelRankingRefreshJobHistoryPage.pageInfo is required');
        }
        return PageInfo.fromJson(map);
      })()
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'items': items.map((item) => item.map((key, nestedItem) => MapEntry(key, nestedItem))).toList(),
      'pageInfo': pageInfo.toJson(),
    };
  }
}

class ModelRankingsJobsListResult {
  final int code;
  final dynamic data;
  final String traceId;

  ModelRankingsJobsListResult({
    required this.code,
    required this.data,
    required this.traceId
  });

  factory ModelRankingsJobsListResult.fromJson(Map<String, dynamic> json) {
    return ModelRankingsJobsListResult(
      code: (() {
        final value = json['code'];
        if (value is! int) {
          throw FormatException('ModelRankingsJobsListResult.code is required');
        }
        return value;
      })(),
      data: json['data'],
      traceId: (() {
        final value = json['traceId']?.toString();
        if (value == null) {
          throw FormatException('ModelRankingsJobsListResult.traceId is required');
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

class ModelRankingsListResult {
  final int code;
  final dynamic data;
  final String traceId;

  ModelRankingsListResult({
    required this.code,
    required this.data,
    required this.traceId
  });

  factory ModelRankingsListResult.fromJson(Map<String, dynamic> json) {
    return ModelRankingsListResult(
      code: (() {
        final value = json['code'];
        if (value is! int) {
          throw FormatException('ModelRankingsListResult.code is required');
        }
        return value;
      })(),
      data: json['data'],
      traceId: (() {
        final value = json['traceId']?.toString();
        if (value == null) {
          throw FormatException('ModelRankingsListResult.traceId is required');
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

class ModelRankingsPage {
  final List<Map<String, dynamic>> history;
  final List<Map<String, dynamic>> items;
  final PageInfo pageInfo;
  final Map<String, dynamic> source;

  ModelRankingsPage({
    required this.history,
    required this.items,
    required this.pageInfo,
    required this.source
  });

  factory ModelRankingsPage.fromJson(Map<String, dynamic> json) {
    return ModelRankingsPage(
      history: (() {
        final list = _sdkworkAsList(json['history']);
        if (list == null) {
          throw FormatException('ModelRankingsPage.history is required');
        }
        return list
            .map((item) => (() {
        final map = _sdkworkAsMap(item);
        if (map == null) {
          return null;
        }
        final result = <String, String>{};
        map.forEach((key, nestedItem) {
          final deserialized = nestedItem?.toString();
          if (deserialized is String) {
            result[key] = deserialized;
          }
        });
        return result;
      })())
            .whereType<Map<String, dynamic>>()
            .toList();
      })(),
      items: (() {
        final list = _sdkworkAsList(json['items']);
        if (list == null) {
          throw FormatException('ModelRankingsPage.items is required');
        }
        return list
            .map((item) => (() {
        final map = _sdkworkAsMap(item);
        if (map == null) {
          return null;
        }
        final result = <String, String>{};
        map.forEach((key, nestedItem) {
          final deserialized = nestedItem?.toString();
          if (deserialized is String) {
            result[key] = deserialized;
          }
        });
        return result;
      })())
            .whereType<Map<String, dynamic>>()
            .toList();
      })(),
      pageInfo: (() {
        final map = _sdkworkAsMap(json['pageInfo']);
        if (map == null) {
          throw FormatException('ModelRankingsPage.pageInfo is required');
        }
        return PageInfo.fromJson(map);
      })(),
      source: (() {
        final map = _sdkworkAsMap(json['source']);
        if (map == null) {
          throw FormatException('ModelRankingsPage.source is required');
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
      'history': history.map((item) => item.map((key, nestedItem) => MapEntry(key, nestedItem))).toList(),
      'items': items.map((item) => item.map((key, nestedItem) => MapEntry(key, nestedItem))).toList(),
      'pageInfo': pageInfo.toJson(),
      'source': source.map((key, item) => MapEntry(key, item)),
    };
  }
}

class ModelRankingsRefreshResult {
  final int code;
  final dynamic data;
  final String traceId;

  ModelRankingsRefreshResult({
    required this.code,
    required this.data,
    required this.traceId
  });

  factory ModelRankingsRefreshResult.fromJson(Map<String, dynamic> json) {
    return ModelRankingsRefreshResult(
      code: (() {
        final value = json['code'];
        if (value is! int) {
          throw FormatException('ModelRankingsRefreshResult.code is required');
        }
        return value;
      })(),
      data: json['data'],
      traceId: (() {
        final value = json['traceId']?.toString();
        if (value == null) {
          throw FormatException('ModelRankingsRefreshResult.traceId is required');
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

class ModelRankingsStatusRetrieveResult {
  final int code;
  final dynamic data;
  final String traceId;

  ModelRankingsStatusRetrieveResult({
    required this.code,
    required this.data,
    required this.traceId
  });

  factory ModelRankingsStatusRetrieveResult.fromJson(Map<String, dynamic> json) {
    return ModelRankingsStatusRetrieveResult(
      code: (() {
        final value = json['code'];
        if (value is! int) {
          throw FormatException('ModelRankingsStatusRetrieveResult.code is required');
        }
        return value;
      })(),
      data: json['data'],
      traceId: (() {
        final value = json['traceId']?.toString();
        if (value == null) {
          throw FormatException('ModelRankingsStatusRetrieveResult.traceId is required');
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

class ModelVendorsCreateResult {
  final int code;
  final dynamic data;
  final String traceId;

  ModelVendorsCreateResult({
    required this.code,
    required this.data,
    required this.traceId
  });

  factory ModelVendorsCreateResult.fromJson(Map<String, dynamic> json) {
    return ModelVendorsCreateResult(
      code: (() {
        final value = json['code'];
        if (value is! int) {
          throw FormatException('ModelVendorsCreateResult.code is required');
        }
        return value;
      })(),
      data: json['data'],
      traceId: (() {
        final value = json['traceId']?.toString();
        if (value == null) {
          throw FormatException('ModelVendorsCreateResult.traceId is required');
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

class ModelVendorsListResult {
  final int code;
  final dynamic data;
  final String traceId;

  ModelVendorsListResult({
    required this.code,
    required this.data,
    required this.traceId
  });

  factory ModelVendorsListResult.fromJson(Map<String, dynamic> json) {
    return ModelVendorsListResult(
      code: (() {
        final value = json['code'];
        if (value is! int) {
          throw FormatException('ModelVendorsListResult.code is required');
        }
        return value;
      })(),
      data: json['data'],
      traceId: (() {
        final value = json['traceId']?.toString();
        if (value == null) {
          throw FormatException('ModelVendorsListResult.traceId is required');
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

class ModelsCreateResult {
  final int code;
  final dynamic data;
  final String traceId;

  ModelsCreateResult({
    required this.code,
    required this.data,
    required this.traceId
  });

  factory ModelsCreateResult.fromJson(Map<String, dynamic> json) {
    return ModelsCreateResult(
      code: (() {
        final value = json['code'];
        if (value is! int) {
          throw FormatException('ModelsCreateResult.code is required');
        }
        return value;
      })(),
      data: json['data'],
      traceId: (() {
        final value = json['traceId']?.toString();
        if (value == null) {
          throw FormatException('ModelsCreateResult.traceId is required');
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

class ModelsDeleteResult {
  final int code;
  final dynamic data;
  final String traceId;

  ModelsDeleteResult({
    required this.code,
    required this.data,
    required this.traceId
  });

  factory ModelsDeleteResult.fromJson(Map<String, dynamic> json) {
    return ModelsDeleteResult(
      code: (() {
        final value = json['code'];
        if (value is! int) {
          throw FormatException('ModelsDeleteResult.code is required');
        }
        return value;
      })(),
      data: json['data'],
      traceId: (() {
        final value = json['traceId']?.toString();
        if (value == null) {
          throw FormatException('ModelsDeleteResult.traceId is required');
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

class ModelsListResult {
  final int code;
  final dynamic data;
  final String traceId;

  ModelsListResult({
    required this.code,
    required this.data,
    required this.traceId
  });

  factory ModelsListResult.fromJson(Map<String, dynamic> json) {
    return ModelsListResult(
      code: (() {
        final value = json['code'];
        if (value is! int) {
          throw FormatException('ModelsListResult.code is required');
        }
        return value;
      })(),
      data: json['data'],
      traceId: (() {
        final value = json['traceId']?.toString();
        if (value == null) {
          throw FormatException('ModelsListResult.traceId is required');
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

class ModelsRefreshResult {
  final int code;
  final dynamic data;
  final String traceId;

  ModelsRefreshResult({
    required this.code,
    required this.data,
    required this.traceId
  });

  factory ModelsRefreshResult.fromJson(Map<String, dynamic> json) {
    return ModelsRefreshResult(
      code: (() {
        final value = json['code'];
        if (value is! int) {
          throw FormatException('ModelsRefreshResult.code is required');
        }
        return value;
      })(),
      data: json['data'],
      traceId: (() {
        final value = json['traceId']?.toString();
        if (value == null) {
          throw FormatException('ModelsRefreshResult.traceId is required');
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

class ModelsUpdateResult {
  final int code;
  final dynamic data;
  final String traceId;

  ModelsUpdateResult({
    required this.code,
    required this.data,
    required this.traceId
  });

  factory ModelsUpdateResult.fromJson(Map<String, dynamic> json) {
    return ModelsUpdateResult(
      code: (() {
        final value = json['code'];
        if (value is! int) {
          throw FormatException('ModelsUpdateResult.code is required');
        }
        return value;
      })(),
      data: json['data'],
      traceId: (() {
        final value = json['traceId']?.toString();
        if (value == null) {
          throw FormatException('ModelsUpdateResult.traceId is required');
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

class MonitorAlertsListResult {
  final int code;
  final dynamic data;
  final String traceId;

  MonitorAlertsListResult({
    required this.code,
    required this.data,
    required this.traceId
  });

  factory MonitorAlertsListResult.fromJson(Map<String, dynamic> json) {
    return MonitorAlertsListResult(
      code: (() {
        final value = json['code'];
        if (value is! int) {
          throw FormatException('MonitorAlertsListResult.code is required');
        }
        return value;
      })(),
      data: json['data'],
      traceId: (() {
        final value = json['traceId']?.toString();
        if (value == null) {
          throw FormatException('MonitorAlertsListResult.traceId is required');
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

class MonitorNodesListResult {
  final int code;
  final dynamic data;
  final String traceId;

  MonitorNodesListResult({
    required this.code,
    required this.data,
    required this.traceId
  });

  factory MonitorNodesListResult.fromJson(Map<String, dynamic> json) {
    return MonitorNodesListResult(
      code: (() {
        final value = json['code'];
        if (value is! int) {
          throw FormatException('MonitorNodesListResult.code is required');
        }
        return value;
      })(),
      data: json['data'],
      traceId: (() {
        final value = json['traceId']?.toString();
        if (value == null) {
          throw FormatException('MonitorNodesListResult.traceId is required');
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

class MonitorPerformanceListResult {
  final int code;
  final dynamic data;
  final String traceId;

  MonitorPerformanceListResult({
    required this.code,
    required this.data,
    required this.traceId
  });

  factory MonitorPerformanceListResult.fromJson(Map<String, dynamic> json) {
    return MonitorPerformanceListResult(
      code: (() {
        final value = json['code'];
        if (value is! int) {
          throw FormatException('MonitorPerformanceListResult.code is required');
        }
        return value;
      })(),
      data: json['data'],
      traceId: (() {
        final value = json['traceId']?.toString();
        if (value == null) {
          throw FormatException('MonitorPerformanceListResult.traceId is required');
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

class NoData {


  NoData();

  factory NoData.fromJson(Map<String, dynamic> json) {
    return NoData();
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{};
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

class ProblemDetail {
  final int code;
  final String? detail;
  final List<FieldError>? errors;
  final String? instance;
  final int status;
  final String title;
  final String traceId;
  final String type;

  ProblemDetail({
    required this.code,
    this.detail,
    this.errors,
    this.instance,
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
      instance: json['instance']?.toString(),
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
      'instance': instance,
      'status': status,
      'title': title,
      'traceId': traceId,
      'type': type,
    };
  }
}

class ProviderSecretsCreateResult {
  final int code;
  final dynamic data;
  final String traceId;

  ProviderSecretsCreateResult({
    required this.code,
    required this.data,
    required this.traceId
  });

  factory ProviderSecretsCreateResult.fromJson(Map<String, dynamic> json) {
    return ProviderSecretsCreateResult(
      code: (() {
        final value = json['code'];
        if (value is! int) {
          throw FormatException('ProviderSecretsCreateResult.code is required');
        }
        return value;
      })(),
      data: json['data'],
      traceId: (() {
        final value = json['traceId']?.toString();
        if (value == null) {
          throw FormatException('ProviderSecretsCreateResult.traceId is required');
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

class ProviderSecretsDeleteResult {
  final int code;
  final dynamic data;
  final String traceId;

  ProviderSecretsDeleteResult({
    required this.code,
    required this.data,
    required this.traceId
  });

  factory ProviderSecretsDeleteResult.fromJson(Map<String, dynamic> json) {
    return ProviderSecretsDeleteResult(
      code: (() {
        final value = json['code'];
        if (value is! int) {
          throw FormatException('ProviderSecretsDeleteResult.code is required');
        }
        return value;
      })(),
      data: json['data'],
      traceId: (() {
        final value = json['traceId']?.toString();
        if (value == null) {
          throw FormatException('ProviderSecretsDeleteResult.traceId is required');
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

class ProviderSecretsListResult {
  final int code;
  final dynamic data;
  final String traceId;

  ProviderSecretsListResult({
    required this.code,
    required this.data,
    required this.traceId
  });

  factory ProviderSecretsListResult.fromJson(Map<String, dynamic> json) {
    return ProviderSecretsListResult(
      code: (() {
        final value = json['code'];
        if (value is! int) {
          throw FormatException('ProviderSecretsListResult.code is required');
        }
        return value;
      })(),
      data: json['data'],
      traceId: (() {
        final value = json['traceId']?.toString();
        if (value == null) {
          throw FormatException('ProviderSecretsListResult.traceId is required');
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

class ProviderSecretsUpdateResult {
  final int code;
  final dynamic data;
  final String traceId;

  ProviderSecretsUpdateResult({
    required this.code,
    required this.data,
    required this.traceId
  });

  factory ProviderSecretsUpdateResult.fromJson(Map<String, dynamic> json) {
    return ProviderSecretsUpdateResult(
      code: (() {
        final value = json['code'];
        if (value is! int) {
          throw FormatException('ProviderSecretsUpdateResult.code is required');
        }
        return value;
      })(),
      data: json['data'],
      traceId: (() {
        final value = json['traceId']?.toString();
        if (value == null) {
          throw FormatException('ProviderSecretsUpdateResult.traceId is required');
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

class RateLimitsApiKeysCreateResult {
  final int code;
  final dynamic data;
  final String traceId;

  RateLimitsApiKeysCreateResult({
    required this.code,
    required this.data,
    required this.traceId
  });

  factory RateLimitsApiKeysCreateResult.fromJson(Map<String, dynamic> json) {
    return RateLimitsApiKeysCreateResult(
      code: (() {
        final value = json['code'];
        if (value is! int) {
          throw FormatException('RateLimitsApiKeysCreateResult.code is required');
        }
        return value;
      })(),
      data: json['data'],
      traceId: (() {
        final value = json['traceId']?.toString();
        if (value == null) {
          throw FormatException('RateLimitsApiKeysCreateResult.traceId is required');
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

class RateLimitsApiKeysListResult {
  final int code;
  final dynamic data;
  final String traceId;

  RateLimitsApiKeysListResult({
    required this.code,
    required this.data,
    required this.traceId
  });

  factory RateLimitsApiKeysListResult.fromJson(Map<String, dynamic> json) {
    return RateLimitsApiKeysListResult(
      code: (() {
        final value = json['code'];
        if (value is! int) {
          throw FormatException('RateLimitsApiKeysListResult.code is required');
        }
        return value;
      })(),
      data: json['data'],
      traceId: (() {
        final value = json['traceId']?.toString();
        if (value == null) {
          throw FormatException('RateLimitsApiKeysListResult.traceId is required');
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

class RateLimitsIpCreateResult {
  final int code;
  final dynamic data;
  final String traceId;

  RateLimitsIpCreateResult({
    required this.code,
    required this.data,
    required this.traceId
  });

  factory RateLimitsIpCreateResult.fromJson(Map<String, dynamic> json) {
    return RateLimitsIpCreateResult(
      code: (() {
        final value = json['code'];
        if (value is! int) {
          throw FormatException('RateLimitsIpCreateResult.code is required');
        }
        return value;
      })(),
      data: json['data'],
      traceId: (() {
        final value = json['traceId']?.toString();
        if (value == null) {
          throw FormatException('RateLimitsIpCreateResult.traceId is required');
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

class RateLimitsIpListResult {
  final int code;
  final dynamic data;
  final String traceId;

  RateLimitsIpListResult({
    required this.code,
    required this.data,
    required this.traceId
  });

  factory RateLimitsIpListResult.fromJson(Map<String, dynamic> json) {
    return RateLimitsIpListResult(
      code: (() {
        final value = json['code'];
        if (value is! int) {
          throw FormatException('RateLimitsIpListResult.code is required');
        }
        return value;
      })(),
      data: json['data'],
      traceId: (() {
        final value = json['traceId']?.toString();
        if (value == null) {
          throw FormatException('RateLimitsIpListResult.traceId is required');
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

class RateLimitsModelsCreateResult {
  final int code;
  final dynamic data;
  final String traceId;

  RateLimitsModelsCreateResult({
    required this.code,
    required this.data,
    required this.traceId
  });

  factory RateLimitsModelsCreateResult.fromJson(Map<String, dynamic> json) {
    return RateLimitsModelsCreateResult(
      code: (() {
        final value = json['code'];
        if (value is! int) {
          throw FormatException('RateLimitsModelsCreateResult.code is required');
        }
        return value;
      })(),
      data: json['data'],
      traceId: (() {
        final value = json['traceId']?.toString();
        if (value == null) {
          throw FormatException('RateLimitsModelsCreateResult.traceId is required');
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

class RateLimitsModelsListResult {
  final int code;
  final dynamic data;
  final String traceId;

  RateLimitsModelsListResult({
    required this.code,
    required this.data,
    required this.traceId
  });

  factory RateLimitsModelsListResult.fromJson(Map<String, dynamic> json) {
    return RateLimitsModelsListResult(
      code: (() {
        final value = json['code'];
        if (value is! int) {
          throw FormatException('RateLimitsModelsListResult.code is required');
        }
        return value;
      })(),
      data: json['data'],
      traceId: (() {
        final value = json['traceId']?.toString();
        if (value == null) {
          throw FormatException('RateLimitsModelsListResult.traceId is required');
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

class RecordsListResult {
  final int code;
  final dynamic data;
  final String traceId;

  RecordsListResult({
    required this.code,
    required this.data,
    required this.traceId
  });

  factory RecordsListResult.fromJson(Map<String, dynamic> json) {
    return RecordsListResult(
      code: (() {
        final value = json['code'];
        if (value is! int) {
          throw FormatException('RecordsListResult.code is required');
        }
        return value;
      })(),
      data: json['data'],
      traceId: (() {
        final value = json['traceId']?.toString();
        if (value == null) {
          throw FormatException('RecordsListResult.traceId is required');
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

class RouteExplainCreateResult {
  final int code;
  final dynamic data;
  final String traceId;

  RouteExplainCreateResult({
    required this.code,
    required this.data,
    required this.traceId
  });

  factory RouteExplainCreateResult.fromJson(Map<String, dynamic> json) {
    return RouteExplainCreateResult(
      code: (() {
        final value = json['code'];
        if (value is! int) {
          throw FormatException('RouteExplainCreateResult.code is required');
        }
        return value;
      })(),
      data: json['data'],
      traceId: (() {
        final value = json['traceId']?.toString();
        if (value == null) {
          throw FormatException('RouteExplainCreateResult.traceId is required');
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

class RuntimeRegionSettingsRetrieveResult {
  final int code;
  final dynamic data;
  final String traceId;

  RuntimeRegionSettingsRetrieveResult({
    required this.code,
    required this.data,
    required this.traceId
  });

  factory RuntimeRegionSettingsRetrieveResult.fromJson(Map<String, dynamic> json) {
    return RuntimeRegionSettingsRetrieveResult(
      code: (() {
        final value = json['code'];
        if (value is! int) {
          throw FormatException('RuntimeRegionSettingsRetrieveResult.code is required');
        }
        return value;
      })(),
      data: json['data'],
      traceId: (() {
        final value = json['traceId']?.toString();
        if (value == null) {
          throw FormatException('RuntimeRegionSettingsRetrieveResult.traceId is required');
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

class RuntimeRegionSettingsUpdateResult {
  final int code;
  final dynamic data;
  final String traceId;

  RuntimeRegionSettingsUpdateResult({
    required this.code,
    required this.data,
    required this.traceId
  });

  factory RuntimeRegionSettingsUpdateResult.fromJson(Map<String, dynamic> json) {
    return RuntimeRegionSettingsUpdateResult(
      code: (() {
        final value = json['code'];
        if (value is! int) {
          throw FormatException('RuntimeRegionSettingsUpdateResult.code is required');
        }
        return value;
      })(),
      data: json['data'],
      traceId: (() {
        final value = json['traceId']?.toString();
        if (value == null) {
          throw FormatException('RuntimeRegionSettingsUpdateResult.traceId is required');
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

class ServiceNodesCreateResult {
  final int code;
  final dynamic data;
  final String traceId;

  ServiceNodesCreateResult({
    required this.code,
    required this.data,
    required this.traceId
  });

  factory ServiceNodesCreateResult.fromJson(Map<String, dynamic> json) {
    return ServiceNodesCreateResult(
      code: (() {
        final value = json['code'];
        if (value is! int) {
          throw FormatException('ServiceNodesCreateResult.code is required');
        }
        return value;
      })(),
      data: json['data'],
      traceId: (() {
        final value = json['traceId']?.toString();
        if (value == null) {
          throw FormatException('ServiceNodesCreateResult.traceId is required');
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

class ServiceNodesDeleteResult {
  final int code;
  final dynamic data;
  final String traceId;

  ServiceNodesDeleteResult({
    required this.code,
    required this.data,
    required this.traceId
  });

  factory ServiceNodesDeleteResult.fromJson(Map<String, dynamic> json) {
    return ServiceNodesDeleteResult(
      code: (() {
        final value = json['code'];
        if (value is! int) {
          throw FormatException('ServiceNodesDeleteResult.code is required');
        }
        return value;
      })(),
      data: json['data'],
      traceId: (() {
        final value = json['traceId']?.toString();
        if (value == null) {
          throw FormatException('ServiceNodesDeleteResult.traceId is required');
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

class ServiceNodesListResult {
  final int code;
  final dynamic data;
  final String traceId;

  ServiceNodesListResult({
    required this.code,
    required this.data,
    required this.traceId
  });

  factory ServiceNodesListResult.fromJson(Map<String, dynamic> json) {
    return ServiceNodesListResult(
      code: (() {
        final value = json['code'];
        if (value is! int) {
          throw FormatException('ServiceNodesListResult.code is required');
        }
        return value;
      })(),
      data: json['data'],
      traceId: (() {
        final value = json['traceId']?.toString();
        if (value == null) {
          throw FormatException('ServiceNodesListResult.traceId is required');
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

class ServiceNodesStatusUpdateResult {
  final int code;
  final dynamic data;
  final String traceId;

  ServiceNodesStatusUpdateResult({
    required this.code,
    required this.data,
    required this.traceId
  });

  factory ServiceNodesStatusUpdateResult.fromJson(Map<String, dynamic> json) {
    return ServiceNodesStatusUpdateResult(
      code: (() {
        final value = json['code'];
        if (value is! int) {
          throw FormatException('ServiceNodesStatusUpdateResult.code is required');
        }
        return value;
      })(),
      data: json['data'],
      traceId: (() {
        final value = json['traceId']?.toString();
        if (value == null) {
          throw FormatException('ServiceNodesStatusUpdateResult.traceId is required');
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

class ServiceNodesUpdateResult {
  final int code;
  final dynamic data;
  final String traceId;

  ServiceNodesUpdateResult({
    required this.code,
    required this.data,
    required this.traceId
  });

  factory ServiceNodesUpdateResult.fromJson(Map<String, dynamic> json) {
    return ServiceNodesUpdateResult(
      code: (() {
        final value = json['code'];
        if (value is! int) {
          throw FormatException('ServiceNodesUpdateResult.code is required');
        }
        return value;
      })(),
      data: json['data'],
      traceId: (() {
        final value = json['traceId']?.toString();
        if (value == null) {
          throw FormatException('ServiceNodesUpdateResult.traceId is required');
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

class ShopsApproveResult {
  final int code;
  final dynamic data;
  final String traceId;

  ShopsApproveResult({
    required this.code,
    required this.data,
    required this.traceId
  });

  factory ShopsApproveResult.fromJson(Map<String, dynamic> json) {
    return ShopsApproveResult(
      code: (() {
        final value = json['code'];
        if (value is! int) {
          throw FormatException('ShopsApproveResult.code is required');
        }
        return value;
      })(),
      data: json['data'],
      traceId: (() {
        final value = json['traceId']?.toString();
        if (value == null) {
          throw FormatException('ShopsApproveResult.traceId is required');
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

class ShopsBrandAuthorizationsUpsertResult {
  final int code;
  final dynamic data;
  final String traceId;

  ShopsBrandAuthorizationsUpsertResult({
    required this.code,
    required this.data,
    required this.traceId
  });

  factory ShopsBrandAuthorizationsUpsertResult.fromJson(Map<String, dynamic> json) {
    return ShopsBrandAuthorizationsUpsertResult(
      code: (() {
        final value = json['code'];
        if (value is! int) {
          throw FormatException('ShopsBrandAuthorizationsUpsertResult.code is required');
        }
        return value;
      })(),
      data: json['data'],
      traceId: (() {
        final value = json['traceId']?.toString();
        if (value == null) {
          throw FormatException('ShopsBrandAuthorizationsUpsertResult.traceId is required');
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

class ShopsBusinessHoursUpdateResult {
  final int code;
  final dynamic data;
  final String traceId;

  ShopsBusinessHoursUpdateResult({
    required this.code,
    required this.data,
    required this.traceId
  });

  factory ShopsBusinessHoursUpdateResult.fromJson(Map<String, dynamic> json) {
    return ShopsBusinessHoursUpdateResult(
      code: (() {
        final value = json['code'];
        if (value is! int) {
          throw FormatException('ShopsBusinessHoursUpdateResult.code is required');
        }
        return value;
      })(),
      data: json['data'],
      traceId: (() {
        final value = json['traceId']?.toString();
        if (value == null) {
          throw FormatException('ShopsBusinessHoursUpdateResult.traceId is required');
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

class ShopsCategoryBindingsUpsertResult {
  final int code;
  final dynamic data;
  final String traceId;

  ShopsCategoryBindingsUpsertResult({
    required this.code,
    required this.data,
    required this.traceId
  });

  factory ShopsCategoryBindingsUpsertResult.fromJson(Map<String, dynamic> json) {
    return ShopsCategoryBindingsUpsertResult(
      code: (() {
        final value = json['code'];
        if (value is! int) {
          throw FormatException('ShopsCategoryBindingsUpsertResult.code is required');
        }
        return value;
      })(),
      data: json['data'],
      traceId: (() {
        final value = json['traceId']?.toString();
        if (value == null) {
          throw FormatException('ShopsCategoryBindingsUpsertResult.traceId is required');
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

class ShopsChannelsCreateResult {
  final int code;
  final dynamic data;
  final String traceId;

  ShopsChannelsCreateResult({
    required this.code,
    required this.data,
    required this.traceId
  });

  factory ShopsChannelsCreateResult.fromJson(Map<String, dynamic> json) {
    return ShopsChannelsCreateResult(
      code: (() {
        final value = json['code'];
        if (value is! int) {
          throw FormatException('ShopsChannelsCreateResult.code is required');
        }
        return value;
      })(),
      data: json['data'],
      traceId: (() {
        final value = json['traceId']?.toString();
        if (value == null) {
          throw FormatException('ShopsChannelsCreateResult.traceId is required');
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

class ShopsChannelsUpdateResult {
  final int code;
  final dynamic data;
  final String traceId;

  ShopsChannelsUpdateResult({
    required this.code,
    required this.data,
    required this.traceId
  });

  factory ShopsChannelsUpdateResult.fromJson(Map<String, dynamic> json) {
    return ShopsChannelsUpdateResult(
      code: (() {
        final value = json['code'];
        if (value is! int) {
          throw FormatException('ShopsChannelsUpdateResult.code is required');
        }
        return value;
      })(),
      data: json['data'],
      traceId: (() {
        final value = json['traceId']?.toString();
        if (value == null) {
          throw FormatException('ShopsChannelsUpdateResult.traceId is required');
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

class ShopsCloseResult {
  final int code;
  final dynamic data;
  final String traceId;

  ShopsCloseResult({
    required this.code,
    required this.data,
    required this.traceId
  });

  factory ShopsCloseResult.fromJson(Map<String, dynamic> json) {
    return ShopsCloseResult(
      code: (() {
        final value = json['code'];
        if (value is! int) {
          throw FormatException('ShopsCloseResult.code is required');
        }
        return value;
      })(),
      data: json['data'],
      traceId: (() {
        final value = json['traceId']?.toString();
        if (value == null) {
          throw FormatException('ShopsCloseResult.traceId is required');
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

class ShopsCreateResult {
  final int code;
  final dynamic data;
  final String traceId;

  ShopsCreateResult({
    required this.code,
    required this.data,
    required this.traceId
  });

  factory ShopsCreateResult.fromJson(Map<String, dynamic> json) {
    return ShopsCreateResult(
      code: (() {
        final value = json['code'];
        if (value is! int) {
          throw FormatException('ShopsCreateResult.code is required');
        }
        return value;
      })(),
      data: json['data'],
      traceId: (() {
        final value = json['traceId']?.toString();
        if (value == null) {
          throw FormatException('ShopsCreateResult.traceId is required');
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

class ShopsCustomerServicesUpsertResult {
  final int code;
  final dynamic data;
  final String traceId;

  ShopsCustomerServicesUpsertResult({
    required this.code,
    required this.data,
    required this.traceId
  });

  factory ShopsCustomerServicesUpsertResult.fromJson(Map<String, dynamic> json) {
    return ShopsCustomerServicesUpsertResult(
      code: (() {
        final value = json['code'];
        if (value is! int) {
          throw FormatException('ShopsCustomerServicesUpsertResult.code is required');
        }
        return value;
      })(),
      data: json['data'],
      traceId: (() {
        final value = json['traceId']?.toString();
        if (value == null) {
          throw FormatException('ShopsCustomerServicesUpsertResult.traceId is required');
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

class ShopsDepositAccountReviewResult {
  final int code;
  final dynamic data;
  final String traceId;

  ShopsDepositAccountReviewResult({
    required this.code,
    required this.data,
    required this.traceId
  });

  factory ShopsDepositAccountReviewResult.fromJson(Map<String, dynamic> json) {
    return ShopsDepositAccountReviewResult(
      code: (() {
        final value = json['code'];
        if (value is! int) {
          throw FormatException('ShopsDepositAccountReviewResult.code is required');
        }
        return value;
      })(),
      data: json['data'],
      traceId: (() {
        final value = json['traceId']?.toString();
        if (value == null) {
          throw FormatException('ShopsDepositAccountReviewResult.traceId is required');
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

class ShopsDepositAccountUpdateResult {
  final int code;
  final dynamic data;
  final String traceId;

  ShopsDepositAccountUpdateResult({
    required this.code,
    required this.data,
    required this.traceId
  });

  factory ShopsDepositAccountUpdateResult.fromJson(Map<String, dynamic> json) {
    return ShopsDepositAccountUpdateResult(
      code: (() {
        final value = json['code'];
        if (value is! int) {
          throw FormatException('ShopsDepositAccountUpdateResult.code is required');
        }
        return value;
      })(),
      data: json['data'],
      traceId: (() {
        final value = json['traceId']?.toString();
        if (value == null) {
          throw FormatException('ShopsDepositAccountUpdateResult.traceId is required');
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

class ShopsFulfillmentProfileUpdateResult {
  final int code;
  final dynamic data;
  final String traceId;

  ShopsFulfillmentProfileUpdateResult({
    required this.code,
    required this.data,
    required this.traceId
  });

  factory ShopsFulfillmentProfileUpdateResult.fromJson(Map<String, dynamic> json) {
    return ShopsFulfillmentProfileUpdateResult(
      code: (() {
        final value = json['code'];
        if (value is! int) {
          throw FormatException('ShopsFulfillmentProfileUpdateResult.code is required');
        }
        return value;
      })(),
      data: json['data'],
      traceId: (() {
        final value = json['traceId']?.toString();
        if (value == null) {
          throw FormatException('ShopsFulfillmentProfileUpdateResult.traceId is required');
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

class ShopsPoliciesCreateResult {
  final int code;
  final dynamic data;
  final String traceId;

  ShopsPoliciesCreateResult({
    required this.code,
    required this.data,
    required this.traceId
  });

  factory ShopsPoliciesCreateResult.fromJson(Map<String, dynamic> json) {
    return ShopsPoliciesCreateResult(
      code: (() {
        final value = json['code'];
        if (value is! int) {
          throw FormatException('ShopsPoliciesCreateResult.code is required');
        }
        return value;
      })(),
      data: json['data'],
      traceId: (() {
        final value = json['traceId']?.toString();
        if (value == null) {
          throw FormatException('ShopsPoliciesCreateResult.traceId is required');
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

class ShopsPoliciesUpdateResult {
  final int code;
  final dynamic data;
  final String traceId;

  ShopsPoliciesUpdateResult({
    required this.code,
    required this.data,
    required this.traceId
  });

  factory ShopsPoliciesUpdateResult.fromJson(Map<String, dynamic> json) {
    return ShopsPoliciesUpdateResult(
      code: (() {
        final value = json['code'];
        if (value is! int) {
          throw FormatException('ShopsPoliciesUpdateResult.code is required');
        }
        return value;
      })(),
      data: json['data'],
      traceId: (() {
        final value = json['traceId']?.toString();
        if (value == null) {
          throw FormatException('ShopsPoliciesUpdateResult.traceId is required');
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

class ShopsQualificationsUpsertResult {
  final int code;
  final dynamic data;
  final String traceId;

  ShopsQualificationsUpsertResult({
    required this.code,
    required this.data,
    required this.traceId
  });

  factory ShopsQualificationsUpsertResult.fromJson(Map<String, dynamic> json) {
    return ShopsQualificationsUpsertResult(
      code: (() {
        final value = json['code'];
        if (value is! int) {
          throw FormatException('ShopsQualificationsUpsertResult.code is required');
        }
        return value;
      })(),
      data: json['data'],
      traceId: (() {
        final value = json['traceId']?.toString();
        if (value == null) {
          throw FormatException('ShopsQualificationsUpsertResult.traceId is required');
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

class ShopsRejectResult {
  final int code;
  final dynamic data;
  final String traceId;

  ShopsRejectResult({
    required this.code,
    required this.data,
    required this.traceId
  });

  factory ShopsRejectResult.fromJson(Map<String, dynamic> json) {
    return ShopsRejectResult(
      code: (() {
        final value = json['code'];
        if (value is! int) {
          throw FormatException('ShopsRejectResult.code is required');
        }
        return value;
      })(),
      data: json['data'],
      traceId: (() {
        final value = json['traceId']?.toString();
        if (value == null) {
          throw FormatException('ShopsRejectResult.traceId is required');
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

class ShopsResumeResult {
  final int code;
  final dynamic data;
  final String traceId;

  ShopsResumeResult({
    required this.code,
    required this.data,
    required this.traceId
  });

  factory ShopsResumeResult.fromJson(Map<String, dynamic> json) {
    return ShopsResumeResult(
      code: (() {
        final value = json['code'];
        if (value is! int) {
          throw FormatException('ShopsResumeResult.code is required');
        }
        return value;
      })(),
      data: json['data'],
      traceId: (() {
        final value = json['traceId']?.toString();
        if (value == null) {
          throw FormatException('ShopsResumeResult.traceId is required');
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

class ShopsReturnAddressesUpsertResult {
  final int code;
  final dynamic data;
  final String traceId;

  ShopsReturnAddressesUpsertResult({
    required this.code,
    required this.data,
    required this.traceId
  });

  factory ShopsReturnAddressesUpsertResult.fromJson(Map<String, dynamic> json) {
    return ShopsReturnAddressesUpsertResult(
      code: (() {
        final value = json['code'];
        if (value is! int) {
          throw FormatException('ShopsReturnAddressesUpsertResult.code is required');
        }
        return value;
      })(),
      data: json['data'],
      traceId: (() {
        final value = json['traceId']?.toString();
        if (value == null) {
          throw FormatException('ShopsReturnAddressesUpsertResult.traceId is required');
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

class ShopsRiskSignalsCreateResult {
  final int code;
  final dynamic data;
  final String traceId;

  ShopsRiskSignalsCreateResult({
    required this.code,
    required this.data,
    required this.traceId
  });

  factory ShopsRiskSignalsCreateResult.fromJson(Map<String, dynamic> json) {
    return ShopsRiskSignalsCreateResult(
      code: (() {
        final value = json['code'];
        if (value is! int) {
          throw FormatException('ShopsRiskSignalsCreateResult.code is required');
        }
        return value;
      })(),
      data: json['data'],
      traceId: (() {
        final value = json['traceId']?.toString();
        if (value == null) {
          throw FormatException('ShopsRiskSignalsCreateResult.traceId is required');
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

class ShopsRiskSignalsResolveResult {
  final int code;
  final dynamic data;
  final String traceId;

  ShopsRiskSignalsResolveResult({
    required this.code,
    required this.data,
    required this.traceId
  });

  factory ShopsRiskSignalsResolveResult.fromJson(Map<String, dynamic> json) {
    return ShopsRiskSignalsResolveResult(
      code: (() {
        final value = json['code'];
        if (value is! int) {
          throw FormatException('ShopsRiskSignalsResolveResult.code is required');
        }
        return value;
      })(),
      data: json['data'],
      traceId: (() {
        final value = json['traceId']?.toString();
        if (value == null) {
          throw FormatException('ShopsRiskSignalsResolveResult.traceId is required');
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

class ShopsServiceAreasCreateResult {
  final int code;
  final dynamic data;
  final String traceId;

  ShopsServiceAreasCreateResult({
    required this.code,
    required this.data,
    required this.traceId
  });

  factory ShopsServiceAreasCreateResult.fromJson(Map<String, dynamic> json) {
    return ShopsServiceAreasCreateResult(
      code: (() {
        final value = json['code'];
        if (value is! int) {
          throw FormatException('ShopsServiceAreasCreateResult.code is required');
        }
        return value;
      })(),
      data: json['data'],
      traceId: (() {
        final value = json['traceId']?.toString();
        if (value == null) {
          throw FormatException('ShopsServiceAreasCreateResult.traceId is required');
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

class ShopsServiceAreasUpdateResult {
  final int code;
  final dynamic data;
  final String traceId;

  ShopsServiceAreasUpdateResult({
    required this.code,
    required this.data,
    required this.traceId
  });

  factory ShopsServiceAreasUpdateResult.fromJson(Map<String, dynamic> json) {
    return ShopsServiceAreasUpdateResult(
      code: (() {
        final value = json['code'];
        if (value is! int) {
          throw FormatException('ShopsServiceAreasUpdateResult.code is required');
        }
        return value;
      })(),
      data: json['data'],
      traceId: (() {
        final value = json['traceId']?.toString();
        if (value == null) {
          throw FormatException('ShopsServiceAreasUpdateResult.traceId is required');
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

class ShopsSettlementProfileApproveResult {
  final int code;
  final dynamic data;
  final String traceId;

  ShopsSettlementProfileApproveResult({
    required this.code,
    required this.data,
    required this.traceId
  });

  factory ShopsSettlementProfileApproveResult.fromJson(Map<String, dynamic> json) {
    return ShopsSettlementProfileApproveResult(
      code: (() {
        final value = json['code'];
        if (value is! int) {
          throw FormatException('ShopsSettlementProfileApproveResult.code is required');
        }
        return value;
      })(),
      data: json['data'],
      traceId: (() {
        final value = json['traceId']?.toString();
        if (value == null) {
          throw FormatException('ShopsSettlementProfileApproveResult.traceId is required');
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

class ShopsSettlementProfileRejectResult {
  final int code;
  final dynamic data;
  final String traceId;

  ShopsSettlementProfileRejectResult({
    required this.code,
    required this.data,
    required this.traceId
  });

  factory ShopsSettlementProfileRejectResult.fromJson(Map<String, dynamic> json) {
    return ShopsSettlementProfileRejectResult(
      code: (() {
        final value = json['code'];
        if (value is! int) {
          throw FormatException('ShopsSettlementProfileRejectResult.code is required');
        }
        return value;
      })(),
      data: json['data'],
      traceId: (() {
        final value = json['traceId']?.toString();
        if (value == null) {
          throw FormatException('ShopsSettlementProfileRejectResult.traceId is required');
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

class ShopsSettlementProfileUpdateResult {
  final int code;
  final dynamic data;
  final String traceId;

  ShopsSettlementProfileUpdateResult({
    required this.code,
    required this.data,
    required this.traceId
  });

  factory ShopsSettlementProfileUpdateResult.fromJson(Map<String, dynamic> json) {
    return ShopsSettlementProfileUpdateResult(
      code: (() {
        final value = json['code'];
        if (value is! int) {
          throw FormatException('ShopsSettlementProfileUpdateResult.code is required');
        }
        return value;
      })(),
      data: json['data'],
      traceId: (() {
        final value = json['traceId']?.toString();
        if (value == null) {
          throw FormatException('ShopsSettlementProfileUpdateResult.traceId is required');
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

class ShopsShippingTemplatesUpsertResult {
  final int code;
  final dynamic data;
  final String traceId;

  ShopsShippingTemplatesUpsertResult({
    required this.code,
    required this.data,
    required this.traceId
  });

  factory ShopsShippingTemplatesUpsertResult.fromJson(Map<String, dynamic> json) {
    return ShopsShippingTemplatesUpsertResult(
      code: (() {
        final value = json['code'];
        if (value is! int) {
          throw FormatException('ShopsShippingTemplatesUpsertResult.code is required');
        }
        return value;
      })(),
      data: json['data'],
      traceId: (() {
        final value = json['traceId']?.toString();
        if (value == null) {
          throw FormatException('ShopsShippingTemplatesUpsertResult.traceId is required');
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

class ShopsSubmitReviewResult {
  final int code;
  final dynamic data;
  final String traceId;

  ShopsSubmitReviewResult({
    required this.code,
    required this.data,
    required this.traceId
  });

  factory ShopsSubmitReviewResult.fromJson(Map<String, dynamic> json) {
    return ShopsSubmitReviewResult(
      code: (() {
        final value = json['code'];
        if (value is! int) {
          throw FormatException('ShopsSubmitReviewResult.code is required');
        }
        return value;
      })(),
      data: json['data'],
      traceId: (() {
        final value = json['traceId']?.toString();
        if (value == null) {
          throw FormatException('ShopsSubmitReviewResult.traceId is required');
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

class ShopsSuspendResult {
  final int code;
  final dynamic data;
  final String traceId;

  ShopsSuspendResult({
    required this.code,
    required this.data,
    required this.traceId
  });

  factory ShopsSuspendResult.fromJson(Map<String, dynamic> json) {
    return ShopsSuspendResult(
      code: (() {
        final value = json['code'];
        if (value is! int) {
          throw FormatException('ShopsSuspendResult.code is required');
        }
        return value;
      })(),
      data: json['data'],
      traceId: (() {
        final value = json['traceId']?.toString();
        if (value == null) {
          throw FormatException('ShopsSuspendResult.traceId is required');
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

class ShopsUpdateResult {
  final int code;
  final dynamic data;
  final String traceId;

  ShopsUpdateResult({
    required this.code,
    required this.data,
    required this.traceId
  });

  factory ShopsUpdateResult.fromJson(Map<String, dynamic> json) {
    return ShopsUpdateResult(
      code: (() {
        final value = json['code'];
        if (value is! int) {
          throw FormatException('ShopsUpdateResult.code is required');
        }
        return value;
      })(),
      data: json['data'],
      traceId: (() {
        final value = json['traceId']?.toString();
        if (value == null) {
          throw FormatException('ShopsUpdateResult.traceId is required');
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

class ShopsVerificationsUpdateResult {
  final int code;
  final dynamic data;
  final String traceId;

  ShopsVerificationsUpdateResult({
    required this.code,
    required this.data,
    required this.traceId
  });

  factory ShopsVerificationsUpdateResult.fromJson(Map<String, dynamic> json) {
    return ShopsVerificationsUpdateResult(
      code: (() {
        final value = json['code'];
        if (value is! int) {
          throw FormatException('ShopsVerificationsUpdateResult.code is required');
        }
        return value;
      })(),
      data: json['data'],
      traceId: (() {
        final value = json['traceId']?.toString();
        if (value == null) {
          throw FormatException('ShopsVerificationsUpdateResult.traceId is required');
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

class SiteCatalogListResult {
  final int code;
  final dynamic data;
  final String traceId;

  SiteCatalogListResult({
    required this.code,
    required this.data,
    required this.traceId
  });

  factory SiteCatalogListResult.fromJson(Map<String, dynamic> json) {
    return SiteCatalogListResult(
      code: (() {
        final value = json['code'];
        if (value is! int) {
          throw FormatException('SiteCatalogListResult.code is required');
        }
        return value;
      })(),
      data: json['data'],
      traceId: (() {
        final value = json['traceId']?.toString();
        if (value == null) {
          throw FormatException('SiteCatalogListResult.traceId is required');
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

class SiteChannelsListResult {
  final int code;
  final dynamic data;
  final String traceId;

  SiteChannelsListResult({
    required this.code,
    required this.data,
    required this.traceId
  });

  factory SiteChannelsListResult.fromJson(Map<String, dynamic> json) {
    return SiteChannelsListResult(
      code: (() {
        final value = json['code'];
        if (value is! int) {
          throw FormatException('SiteChannelsListResult.code is required');
        }
        return value;
      })(),
      data: json['data'],
      traceId: (() {
        final value = json['traceId']?.toString();
        if (value == null) {
          throw FormatException('SiteChannelsListResult.traceId is required');
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

class SiteCreateResult {
  final int code;
  final dynamic data;
  final String traceId;

  SiteCreateResult({
    required this.code,
    required this.data,
    required this.traceId
  });

  factory SiteCreateResult.fromJson(Map<String, dynamic> json) {
    return SiteCreateResult(
      code: (() {
        final value = json['code'];
        if (value is! int) {
          throw FormatException('SiteCreateResult.code is required');
        }
        return value;
      })(),
      data: json['data'],
      traceId: (() {
        final value = json['traceId']?.toString();
        if (value == null) {
          throw FormatException('SiteCreateResult.traceId is required');
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

class SiteDeleteResult {
  final int code;
  final dynamic data;
  final String traceId;

  SiteDeleteResult({
    required this.code,
    required this.data,
    required this.traceId
  });

  factory SiteDeleteResult.fromJson(Map<String, dynamic> json) {
    return SiteDeleteResult(
      code: (() {
        final value = json['code'];
        if (value is! int) {
          throw FormatException('SiteDeleteResult.code is required');
        }
        return value;
      })(),
      data: json['data'],
      traceId: (() {
        final value = json['traceId']?.toString();
        if (value == null) {
          throw FormatException('SiteDeleteResult.traceId is required');
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

class SiteSettingsRetrieveResult {
  final int code;
  final dynamic data;
  final String traceId;

  SiteSettingsRetrieveResult({
    required this.code,
    required this.data,
    required this.traceId
  });

  factory SiteSettingsRetrieveResult.fromJson(Map<String, dynamic> json) {
    return SiteSettingsRetrieveResult(
      code: (() {
        final value = json['code'];
        if (value is! int) {
          throw FormatException('SiteSettingsRetrieveResult.code is required');
        }
        return value;
      })(),
      data: json['data'],
      traceId: (() {
        final value = json['traceId']?.toString();
        if (value == null) {
          throw FormatException('SiteSettingsRetrieveResult.traceId is required');
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

class SiteSettingsUpdateResult {
  final int code;
  final dynamic data;
  final String traceId;

  SiteSettingsUpdateResult({
    required this.code,
    required this.data,
    required this.traceId
  });

  factory SiteSettingsUpdateResult.fromJson(Map<String, dynamic> json) {
    return SiteSettingsUpdateResult(
      code: (() {
        final value = json['code'];
        if (value is! int) {
          throw FormatException('SiteSettingsUpdateResult.code is required');
        }
        return value;
      })(),
      data: json['data'],
      traceId: (() {
        final value = json['traceId']?.toString();
        if (value == null) {
          throw FormatException('SiteSettingsUpdateResult.traceId is required');
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

class SiteUpdateResult {
  final int code;
  final dynamic data;
  final String traceId;

  SiteUpdateResult({
    required this.code,
    required this.data,
    required this.traceId
  });

  factory SiteUpdateResult.fromJson(Map<String, dynamic> json) {
    return SiteUpdateResult(
      code: (() {
        final value = json['code'];
        if (value is! int) {
          throw FormatException('SiteUpdateResult.code is required');
        }
        return value;
      })(),
      data: json['data'],
      traceId: (() {
        final value = json['traceId']?.toString();
        if (value == null) {
          throw FormatException('SiteUpdateResult.traceId is required');
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

class TestConnectionCreateResult {
  final int code;
  final dynamic data;
  final String traceId;

  TestConnectionCreateResult({
    required this.code,
    required this.data,
    required this.traceId
  });

  factory TestConnectionCreateResult.fromJson(Map<String, dynamic> json) {
    return TestConnectionCreateResult(
      code: (() {
        final value = json['code'];
        if (value is! int) {
          throw FormatException('TestConnectionCreateResult.code is required');
        }
        return value;
      })(),
      data: json['data'],
      traceId: (() {
        final value = json['traceId']?.toString();
        if (value == null) {
          throw FormatException('TestConnectionCreateResult.traceId is required');
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
