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

class AfterSalesEventsListResult {
  final int code;
  final dynamic data;
  final String traceId;

  AfterSalesEventsListResult({
    required this.code,
    required this.data,
    required this.traceId
  });

  factory AfterSalesEventsListResult.fromJson(Map<String, dynamic> json) {
    return AfterSalesEventsListResult(
      code: (() {
        final value = json['code'];
        if (value is! int) {
          throw FormatException('AfterSalesEventsListResult.code is required');
        }
        return value;
      })(),
      data: json['data'],
      traceId: (() {
        final value = json['traceId']?.toString();
        if (value == null) {
          throw FormatException('AfterSalesEventsListResult.traceId is required');
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

class AfterSalesRequestsCreateResult {
  final int code;
  final dynamic data;
  final String traceId;

  AfterSalesRequestsCreateResult({
    required this.code,
    required this.data,
    required this.traceId
  });

  factory AfterSalesRequestsCreateResult.fromJson(Map<String, dynamic> json) {
    return AfterSalesRequestsCreateResult(
      code: (() {
        final value = json['code'];
        if (value is! int) {
          throw FormatException('AfterSalesRequestsCreateResult.code is required');
        }
        return value;
      })(),
      data: json['data'],
      traceId: (() {
        final value = json['traceId']?.toString();
        if (value == null) {
          throw FormatException('AfterSalesRequestsCreateResult.traceId is required');
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

class AfterSalesRequestsListResult {
  final int code;
  final dynamic data;
  final String traceId;

  AfterSalesRequestsListResult({
    required this.code,
    required this.data,
    required this.traceId
  });

  factory AfterSalesRequestsListResult.fromJson(Map<String, dynamic> json) {
    return AfterSalesRequestsListResult(
      code: (() {
        final value = json['code'];
        if (value is! int) {
          throw FormatException('AfterSalesRequestsListResult.code is required');
        }
        return value;
      })(),
      data: json['data'],
      traceId: (() {
        final value = json['traceId']?.toString();
        if (value == null) {
          throw FormatException('AfterSalesRequestsListResult.traceId is required');
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

class AfterSalesRequestsRetrieveResult {
  final int code;
  final dynamic data;
  final String traceId;

  AfterSalesRequestsRetrieveResult({
    required this.code,
    required this.data,
    required this.traceId
  });

  factory AfterSalesRequestsRetrieveResult.fromJson(Map<String, dynamic> json) {
    return AfterSalesRequestsRetrieveResult(
      code: (() {
        final value = json['code'];
        if (value is! int) {
          throw FormatException('AfterSalesRequestsRetrieveResult.code is required');
        }
        return value;
      })(),
      data: json['data'],
      traceId: (() {
        final value = json['traceId']?.toString();
        if (value == null) {
          throw FormatException('AfterSalesRequestsRetrieveResult.traceId is required');
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

class AfterSalesRequestsUpdateResult {
  final int code;
  final dynamic data;
  final String traceId;

  AfterSalesRequestsUpdateResult({
    required this.code,
    required this.data,
    required this.traceId
  });

  factory AfterSalesRequestsUpdateResult.fromJson(Map<String, dynamic> json) {
    return AfterSalesRequestsUpdateResult(
      code: (() {
        final value = json['code'];
        if (value is! int) {
          throw FormatException('AfterSalesRequestsUpdateResult.code is required');
        }
        return value;
      })(),
      data: json['data'],
      traceId: (() {
        final value = json['traceId']?.toString();
        if (value == null) {
          throw FormatException('AfterSalesRequestsUpdateResult.traceId is required');
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

class AfterSalesReturnShipmentsCreateResult {
  final int code;
  final dynamic data;
  final String traceId;

  AfterSalesReturnShipmentsCreateResult({
    required this.code,
    required this.data,
    required this.traceId
  });

  factory AfterSalesReturnShipmentsCreateResult.fromJson(Map<String, dynamic> json) {
    return AfterSalesReturnShipmentsCreateResult(
      code: (() {
        final value = json['code'];
        if (value is! int) {
          throw FormatException('AfterSalesReturnShipmentsCreateResult.code is required');
        }
        return value;
      })(),
      data: json['data'],
      traceId: (() {
        final value = json['traceId']?.toString();
        if (value == null) {
          throw FormatException('AfterSalesReturnShipmentsCreateResult.traceId is required');
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

class AfterSalesReturnShipmentsListResult {
  final int code;
  final dynamic data;
  final String traceId;

  AfterSalesReturnShipmentsListResult({
    required this.code,
    required this.data,
    required this.traceId
  });

  factory AfterSalesReturnShipmentsListResult.fromJson(Map<String, dynamic> json) {
    return AfterSalesReturnShipmentsListResult(
      code: (() {
        final value = json['code'];
        if (value is! int) {
          throw FormatException('AfterSalesReturnShipmentsListResult.code is required');
        }
        return value;
      })(),
      data: json['data'],
      traceId: (() {
        final value = json['traceId']?.toString();
        if (value == null) {
          throw FormatException('AfterSalesReturnShipmentsListResult.traceId is required');
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

class ApiKeysDeleteResult {
  final int code;
  final dynamic data;
  final String traceId;

  ApiKeysDeleteResult({
    required this.code,
    required this.data,
    required this.traceId
  });

  factory ApiKeysDeleteResult.fromJson(Map<String, dynamic> json) {
    return ApiKeysDeleteResult(
      code: (() {
        final value = json['code'];
        if (value is! int) {
          throw FormatException('ApiKeysDeleteResult.code is required');
        }
        return value;
      })(),
      data: json['data'],
      traceId: (() {
        final value = json['traceId']?.toString();
        if (value == null) {
          throw FormatException('ApiKeysDeleteResult.traceId is required');
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

class ArtifactsCreateResult {
  final int code;
  final dynamic data;
  final String traceId;

  ArtifactsCreateResult({
    required this.code,
    required this.data,
    required this.traceId
  });

  factory ArtifactsCreateResult.fromJson(Map<String, dynamic> json) {
    return ArtifactsCreateResult(
      code: (() {
        final value = json['code'];
        if (value is! int) {
          throw FormatException('ArtifactsCreateResult.code is required');
        }
        return value;
      })(),
      data: json['data'],
      traceId: (() {
        final value = json['traceId']?.toString();
        if (value == null) {
          throw FormatException('ArtifactsCreateResult.traceId is required');
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

class ArtifactsListResult {
  final int code;
  final dynamic data;
  final String traceId;

  ArtifactsListResult({
    required this.code,
    required this.data,
    required this.traceId
  });

  factory ArtifactsListResult.fromJson(Map<String, dynamic> json) {
    return ArtifactsListResult(
      code: (() {
        final value = json['code'];
        if (value is! int) {
          throw FormatException('ArtifactsListResult.code is required');
        }
        return value;
      })(),
      data: json['data'],
      traceId: (() {
        final value = json['traceId']?.toString();
        if (value == null) {
          throw FormatException('ArtifactsListResult.traceId is required');
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

class ConversationMessagesListResult {
  final int code;
  final dynamic data;
  final String traceId;

  ConversationMessagesListResult({
    required this.code,
    required this.data,
    required this.traceId
  });

  factory ConversationMessagesListResult.fromJson(Map<String, dynamic> json) {
    return ConversationMessagesListResult(
      code: (() {
        final value = json['code'];
        if (value is! int) {
          throw FormatException('ConversationMessagesListResult.code is required');
        }
        return value;
      })(),
      data: json['data'],
      traceId: (() {
        final value = json['traceId']?.toString();
        if (value == null) {
          throw FormatException('ConversationMessagesListResult.traceId is required');
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

class ConversationsCreateResult {
  final int code;
  final dynamic data;
  final String traceId;

  ConversationsCreateResult({
    required this.code,
    required this.data,
    required this.traceId
  });

  factory ConversationsCreateResult.fromJson(Map<String, dynamic> json) {
    return ConversationsCreateResult(
      code: (() {
        final value = json['code'];
        if (value is! int) {
          throw FormatException('ConversationsCreateResult.code is required');
        }
        return value;
      })(),
      data: json['data'],
      traceId: (() {
        final value = json['traceId']?.toString();
        if (value == null) {
          throw FormatException('ConversationsCreateResult.traceId is required');
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

class ConversationsListResult {
  final int code;
  final dynamic data;
  final String traceId;

  ConversationsListResult({
    required this.code,
    required this.data,
    required this.traceId
  });

  factory ConversationsListResult.fromJson(Map<String, dynamic> json) {
    return ConversationsListResult(
      code: (() {
        final value = json['code'];
        if (value is! int) {
          throw FormatException('ConversationsListResult.code is required');
        }
        return value;
      })(),
      data: json['data'],
      traceId: (() {
        final value = json['traceId']?.toString();
        if (value == null) {
          throw FormatException('ConversationsListResult.traceId is required');
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

class ConversationsRetrieveResult {
  final int code;
  final dynamic data;
  final String traceId;

  ConversationsRetrieveResult({
    required this.code,
    required this.data,
    required this.traceId
  });

  factory ConversationsRetrieveResult.fromJson(Map<String, dynamic> json) {
    return ConversationsRetrieveResult(
      code: (() {
        final value = json['code'];
        if (value is! int) {
          throw FormatException('ConversationsRetrieveResult.code is required');
        }
        return value;
      })(),
      data: json['data'],
      traceId: (() {
        final value = json['traceId']?.toString();
        if (value == null) {
          throw FormatException('ConversationsRetrieveResult.traceId is required');
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

class InvocationEventStreamsListResult {
  final int code;
  final dynamic data;
  final String traceId;

  InvocationEventStreamsListResult({
    required this.code,
    required this.data,
    required this.traceId
  });

  factory InvocationEventStreamsListResult.fromJson(Map<String, dynamic> json) {
    return InvocationEventStreamsListResult(
      code: (() {
        final value = json['code'];
        if (value is! int) {
          throw FormatException('InvocationEventStreamsListResult.code is required');
        }
        return value;
      })(),
      data: json['data'],
      traceId: (() {
        final value = json['traceId']?.toString();
        if (value == null) {
          throw FormatException('InvocationEventStreamsListResult.traceId is required');
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

class InvocationEventsCreateResult {
  final int code;
  final dynamic data;
  final String traceId;

  InvocationEventsCreateResult({
    required this.code,
    required this.data,
    required this.traceId
  });

  factory InvocationEventsCreateResult.fromJson(Map<String, dynamic> json) {
    return InvocationEventsCreateResult(
      code: (() {
        final value = json['code'];
        if (value is! int) {
          throw FormatException('InvocationEventsCreateResult.code is required');
        }
        return value;
      })(),
      data: json['data'],
      traceId: (() {
        final value = json['traceId']?.toString();
        if (value == null) {
          throw FormatException('InvocationEventsCreateResult.traceId is required');
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

class InvocationEventsListResult {
  final int code;
  final dynamic data;
  final String traceId;

  InvocationEventsListResult({
    required this.code,
    required this.data,
    required this.traceId
  });

  factory InvocationEventsListResult.fromJson(Map<String, dynamic> json) {
    return InvocationEventsListResult(
      code: (() {
        final value = json['code'];
        if (value is! int) {
          throw FormatException('InvocationEventsListResult.code is required');
        }
        return value;
      })(),
      data: json['data'],
      traceId: (() {
        final value = json['traceId']?.toString();
        if (value == null) {
          throw FormatException('InvocationEventsListResult.traceId is required');
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

class InvocationsSubmitResult {
  final int code;
  final dynamic data;
  final String traceId;

  InvocationsSubmitResult({
    required this.code,
    required this.data,
    required this.traceId
  });

  factory InvocationsSubmitResult.fromJson(Map<String, dynamic> json) {
    return InvocationsSubmitResult(
      code: (() {
        final value = json['code'];
        if (value is! int) {
          throw FormatException('InvocationsSubmitResult.code is required');
        }
        return value;
      })(),
      data: json['data'],
      traceId: (() {
        final value = json['traceId']?.toString();
        if (value == null) {
          throw FormatException('InvocationsSubmitResult.traceId is required');
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

class NoData {


  NoData();

  factory NoData.fromJson(Map<String, dynamic> json) {
    return NoData();
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{};
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

class RoutingChannelsListResult {
  final int code;
  final dynamic data;
  final String traceId;

  RoutingChannelsListResult({
    required this.code,
    required this.data,
    required this.traceId
  });

  factory RoutingChannelsListResult.fromJson(Map<String, dynamic> json) {
    return RoutingChannelsListResult(
      code: (() {
        final value = json['code'];
        if (value is! int) {
          throw FormatException('RoutingChannelsListResult.code is required');
        }
        return value;
      })(),
      data: json['data'],
      traceId: (() {
        final value = json['traceId']?.toString();
        if (value == null) {
          throw FormatException('RoutingChannelsListResult.traceId is required');
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

class RoutingUsageListResult {
  final int code;
  final dynamic data;
  final String traceId;

  RoutingUsageListResult({
    required this.code,
    required this.data,
    required this.traceId
  });

  factory RoutingUsageListResult.fromJson(Map<String, dynamic> json) {
    return RoutingUsageListResult(
      code: (() {
        final value = json['code'];
        if (value is! int) {
          throw FormatException('RoutingUsageListResult.code is required');
        }
        return value;
      })(),
      data: json['data'],
      traceId: (() {
        final value = json['traceId']?.toString();
        if (value == null) {
          throw FormatException('RoutingUsageListResult.traceId is required');
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

class ShopsCurrentApplicationsCreateResult {
  final int code;
  final dynamic data;
  final String traceId;

  ShopsCurrentApplicationsCreateResult({
    required this.code,
    required this.data,
    required this.traceId
  });

  factory ShopsCurrentApplicationsCreateResult.fromJson(Map<String, dynamic> json) {
    return ShopsCurrentApplicationsCreateResult(
      code: (() {
        final value = json['code'];
        if (value is! int) {
          throw FormatException('ShopsCurrentApplicationsCreateResult.code is required');
        }
        return value;
      })(),
      data: json['data'],
      traceId: (() {
        final value = json['traceId']?.toString();
        if (value == null) {
          throw FormatException('ShopsCurrentApplicationsCreateResult.traceId is required');
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

class ShopsCurrentApplicationsListResult {
  final int code;
  final dynamic data;
  final String traceId;

  ShopsCurrentApplicationsListResult({
    required this.code,
    required this.data,
    required this.traceId
  });

  factory ShopsCurrentApplicationsListResult.fromJson(Map<String, dynamic> json) {
    return ShopsCurrentApplicationsListResult(
      code: (() {
        final value = json['code'];
        if (value is! int) {
          throw FormatException('ShopsCurrentApplicationsListResult.code is required');
        }
        return value;
      })(),
      data: json['data'],
      traceId: (() {
        final value = json['traceId']?.toString();
        if (value == null) {
          throw FormatException('ShopsCurrentApplicationsListResult.traceId is required');
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

class ShopsCurrentBrandAuthorizationsListResult {
  final int code;
  final dynamic data;
  final String traceId;

  ShopsCurrentBrandAuthorizationsListResult({
    required this.code,
    required this.data,
    required this.traceId
  });

  factory ShopsCurrentBrandAuthorizationsListResult.fromJson(Map<String, dynamic> json) {
    return ShopsCurrentBrandAuthorizationsListResult(
      code: (() {
        final value = json['code'];
        if (value is! int) {
          throw FormatException('ShopsCurrentBrandAuthorizationsListResult.code is required');
        }
        return value;
      })(),
      data: json['data'],
      traceId: (() {
        final value = json['traceId']?.toString();
        if (value == null) {
          throw FormatException('ShopsCurrentBrandAuthorizationsListResult.traceId is required');
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

class ShopsCurrentBrandAuthorizationsUpsertResult {
  final int code;
  final dynamic data;
  final String traceId;

  ShopsCurrentBrandAuthorizationsUpsertResult({
    required this.code,
    required this.data,
    required this.traceId
  });

  factory ShopsCurrentBrandAuthorizationsUpsertResult.fromJson(Map<String, dynamic> json) {
    return ShopsCurrentBrandAuthorizationsUpsertResult(
      code: (() {
        final value = json['code'];
        if (value is! int) {
          throw FormatException('ShopsCurrentBrandAuthorizationsUpsertResult.code is required');
        }
        return value;
      })(),
      data: json['data'],
      traceId: (() {
        final value = json['traceId']?.toString();
        if (value == null) {
          throw FormatException('ShopsCurrentBrandAuthorizationsUpsertResult.traceId is required');
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

class ShopsCurrentBusinessHoursRetrieveResult {
  final int code;
  final dynamic data;
  final String traceId;

  ShopsCurrentBusinessHoursRetrieveResult({
    required this.code,
    required this.data,
    required this.traceId
  });

  factory ShopsCurrentBusinessHoursRetrieveResult.fromJson(Map<String, dynamic> json) {
    return ShopsCurrentBusinessHoursRetrieveResult(
      code: (() {
        final value = json['code'];
        if (value is! int) {
          throw FormatException('ShopsCurrentBusinessHoursRetrieveResult.code is required');
        }
        return value;
      })(),
      data: json['data'],
      traceId: (() {
        final value = json['traceId']?.toString();
        if (value == null) {
          throw FormatException('ShopsCurrentBusinessHoursRetrieveResult.traceId is required');
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

class ShopsCurrentBusinessHoursUpdateResult {
  final int code;
  final dynamic data;
  final String traceId;

  ShopsCurrentBusinessHoursUpdateResult({
    required this.code,
    required this.data,
    required this.traceId
  });

  factory ShopsCurrentBusinessHoursUpdateResult.fromJson(Map<String, dynamic> json) {
    return ShopsCurrentBusinessHoursUpdateResult(
      code: (() {
        final value = json['code'];
        if (value is! int) {
          throw FormatException('ShopsCurrentBusinessHoursUpdateResult.code is required');
        }
        return value;
      })(),
      data: json['data'],
      traceId: (() {
        final value = json['traceId']?.toString();
        if (value == null) {
          throw FormatException('ShopsCurrentBusinessHoursUpdateResult.traceId is required');
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

class ShopsCurrentCategoryBindingsListResult {
  final int code;
  final dynamic data;
  final String traceId;

  ShopsCurrentCategoryBindingsListResult({
    required this.code,
    required this.data,
    required this.traceId
  });

  factory ShopsCurrentCategoryBindingsListResult.fromJson(Map<String, dynamic> json) {
    return ShopsCurrentCategoryBindingsListResult(
      code: (() {
        final value = json['code'];
        if (value is! int) {
          throw FormatException('ShopsCurrentCategoryBindingsListResult.code is required');
        }
        return value;
      })(),
      data: json['data'],
      traceId: (() {
        final value = json['traceId']?.toString();
        if (value == null) {
          throw FormatException('ShopsCurrentCategoryBindingsListResult.traceId is required');
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

class ShopsCurrentCategoryBindingsUpsertResult {
  final int code;
  final dynamic data;
  final String traceId;

  ShopsCurrentCategoryBindingsUpsertResult({
    required this.code,
    required this.data,
    required this.traceId
  });

  factory ShopsCurrentCategoryBindingsUpsertResult.fromJson(Map<String, dynamic> json) {
    return ShopsCurrentCategoryBindingsUpsertResult(
      code: (() {
        final value = json['code'];
        if (value is! int) {
          throw FormatException('ShopsCurrentCategoryBindingsUpsertResult.code is required');
        }
        return value;
      })(),
      data: json['data'],
      traceId: (() {
        final value = json['traceId']?.toString();
        if (value == null) {
          throw FormatException('ShopsCurrentCategoryBindingsUpsertResult.traceId is required');
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

class ShopsCurrentChannelsListResult {
  final int code;
  final dynamic data;
  final String traceId;

  ShopsCurrentChannelsListResult({
    required this.code,
    required this.data,
    required this.traceId
  });

  factory ShopsCurrentChannelsListResult.fromJson(Map<String, dynamic> json) {
    return ShopsCurrentChannelsListResult(
      code: (() {
        final value = json['code'];
        if (value is! int) {
          throw FormatException('ShopsCurrentChannelsListResult.code is required');
        }
        return value;
      })(),
      data: json['data'],
      traceId: (() {
        final value = json['traceId']?.toString();
        if (value == null) {
          throw FormatException('ShopsCurrentChannelsListResult.traceId is required');
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

class ShopsCurrentChannelsUpdateResult {
  final int code;
  final dynamic data;
  final String traceId;

  ShopsCurrentChannelsUpdateResult({
    required this.code,
    required this.data,
    required this.traceId
  });

  factory ShopsCurrentChannelsUpdateResult.fromJson(Map<String, dynamic> json) {
    return ShopsCurrentChannelsUpdateResult(
      code: (() {
        final value = json['code'];
        if (value is! int) {
          throw FormatException('ShopsCurrentChannelsUpdateResult.code is required');
        }
        return value;
      })(),
      data: json['data'],
      traceId: (() {
        final value = json['traceId']?.toString();
        if (value == null) {
          throw FormatException('ShopsCurrentChannelsUpdateResult.traceId is required');
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

class ShopsCurrentCustomerServicesListResult {
  final int code;
  final dynamic data;
  final String traceId;

  ShopsCurrentCustomerServicesListResult({
    required this.code,
    required this.data,
    required this.traceId
  });

  factory ShopsCurrentCustomerServicesListResult.fromJson(Map<String, dynamic> json) {
    return ShopsCurrentCustomerServicesListResult(
      code: (() {
        final value = json['code'];
        if (value is! int) {
          throw FormatException('ShopsCurrentCustomerServicesListResult.code is required');
        }
        return value;
      })(),
      data: json['data'],
      traceId: (() {
        final value = json['traceId']?.toString();
        if (value == null) {
          throw FormatException('ShopsCurrentCustomerServicesListResult.traceId is required');
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

class ShopsCurrentCustomerServicesUpsertResult {
  final int code;
  final dynamic data;
  final String traceId;

  ShopsCurrentCustomerServicesUpsertResult({
    required this.code,
    required this.data,
    required this.traceId
  });

  factory ShopsCurrentCustomerServicesUpsertResult.fromJson(Map<String, dynamic> json) {
    return ShopsCurrentCustomerServicesUpsertResult(
      code: (() {
        final value = json['code'];
        if (value is! int) {
          throw FormatException('ShopsCurrentCustomerServicesUpsertResult.code is required');
        }
        return value;
      })(),
      data: json['data'],
      traceId: (() {
        final value = json['traceId']?.toString();
        if (value == null) {
          throw FormatException('ShopsCurrentCustomerServicesUpsertResult.traceId is required');
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

class ShopsCurrentDashboardRetrieveResult {
  final int code;
  final dynamic data;
  final String traceId;

  ShopsCurrentDashboardRetrieveResult({
    required this.code,
    required this.data,
    required this.traceId
  });

  factory ShopsCurrentDashboardRetrieveResult.fromJson(Map<String, dynamic> json) {
    return ShopsCurrentDashboardRetrieveResult(
      code: (() {
        final value = json['code'];
        if (value is! int) {
          throw FormatException('ShopsCurrentDashboardRetrieveResult.code is required');
        }
        return value;
      })(),
      data: json['data'],
      traceId: (() {
        final value = json['traceId']?.toString();
        if (value == null) {
          throw FormatException('ShopsCurrentDashboardRetrieveResult.traceId is required');
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

class ShopsCurrentDepositAccountRetrieveResult {
  final int code;
  final dynamic data;
  final String traceId;

  ShopsCurrentDepositAccountRetrieveResult({
    required this.code,
    required this.data,
    required this.traceId
  });

  factory ShopsCurrentDepositAccountRetrieveResult.fromJson(Map<String, dynamic> json) {
    return ShopsCurrentDepositAccountRetrieveResult(
      code: (() {
        final value = json['code'];
        if (value is! int) {
          throw FormatException('ShopsCurrentDepositAccountRetrieveResult.code is required');
        }
        return value;
      })(),
      data: json['data'],
      traceId: (() {
        final value = json['traceId']?.toString();
        if (value == null) {
          throw FormatException('ShopsCurrentDepositAccountRetrieveResult.traceId is required');
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

class ShopsCurrentFulfillmentProfileRetrieveResult {
  final int code;
  final dynamic data;
  final String traceId;

  ShopsCurrentFulfillmentProfileRetrieveResult({
    required this.code,
    required this.data,
    required this.traceId
  });

  factory ShopsCurrentFulfillmentProfileRetrieveResult.fromJson(Map<String, dynamic> json) {
    return ShopsCurrentFulfillmentProfileRetrieveResult(
      code: (() {
        final value = json['code'];
        if (value is! int) {
          throw FormatException('ShopsCurrentFulfillmentProfileRetrieveResult.code is required');
        }
        return value;
      })(),
      data: json['data'],
      traceId: (() {
        final value = json['traceId']?.toString();
        if (value == null) {
          throw FormatException('ShopsCurrentFulfillmentProfileRetrieveResult.traceId is required');
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

class ShopsCurrentFulfillmentProfileUpdateResult {
  final int code;
  final dynamic data;
  final String traceId;

  ShopsCurrentFulfillmentProfileUpdateResult({
    required this.code,
    required this.data,
    required this.traceId
  });

  factory ShopsCurrentFulfillmentProfileUpdateResult.fromJson(Map<String, dynamic> json) {
    return ShopsCurrentFulfillmentProfileUpdateResult(
      code: (() {
        final value = json['code'];
        if (value is! int) {
          throw FormatException('ShopsCurrentFulfillmentProfileUpdateResult.code is required');
        }
        return value;
      })(),
      data: json['data'],
      traceId: (() {
        final value = json['traceId']?.toString();
        if (value == null) {
          throw FormatException('ShopsCurrentFulfillmentProfileUpdateResult.traceId is required');
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

class ShopsCurrentInventoryStocksAdjustmentsCreateResult {
  final int code;
  final dynamic data;
  final String traceId;

  ShopsCurrentInventoryStocksAdjustmentsCreateResult({
    required this.code,
    required this.data,
    required this.traceId
  });

  factory ShopsCurrentInventoryStocksAdjustmentsCreateResult.fromJson(Map<String, dynamic> json) {
    return ShopsCurrentInventoryStocksAdjustmentsCreateResult(
      code: (() {
        final value = json['code'];
        if (value is! int) {
          throw FormatException('ShopsCurrentInventoryStocksAdjustmentsCreateResult.code is required');
        }
        return value;
      })(),
      data: json['data'],
      traceId: (() {
        final value = json['traceId']?.toString();
        if (value == null) {
          throw FormatException('ShopsCurrentInventoryStocksAdjustmentsCreateResult.traceId is required');
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

class ShopsCurrentInventoryStocksListResult {
  final int code;
  final dynamic data;
  final String traceId;

  ShopsCurrentInventoryStocksListResult({
    required this.code,
    required this.data,
    required this.traceId
  });

  factory ShopsCurrentInventoryStocksListResult.fromJson(Map<String, dynamic> json) {
    return ShopsCurrentInventoryStocksListResult(
      code: (() {
        final value = json['code'];
        if (value is! int) {
          throw FormatException('ShopsCurrentInventoryStocksListResult.code is required');
        }
        return value;
      })(),
      data: json['data'],
      traceId: (() {
        final value = json['traceId']?.toString();
        if (value == null) {
          throw FormatException('ShopsCurrentInventoryStocksListResult.traceId is required');
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

class ShopsCurrentOrdersFulfillmentsCreateResult {
  final int code;
  final dynamic data;
  final String traceId;

  ShopsCurrentOrdersFulfillmentsCreateResult({
    required this.code,
    required this.data,
    required this.traceId
  });

  factory ShopsCurrentOrdersFulfillmentsCreateResult.fromJson(Map<String, dynamic> json) {
    return ShopsCurrentOrdersFulfillmentsCreateResult(
      code: (() {
        final value = json['code'];
        if (value is! int) {
          throw FormatException('ShopsCurrentOrdersFulfillmentsCreateResult.code is required');
        }
        return value;
      })(),
      data: json['data'],
      traceId: (() {
        final value = json['traceId']?.toString();
        if (value == null) {
          throw FormatException('ShopsCurrentOrdersFulfillmentsCreateResult.traceId is required');
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

class ShopsCurrentOrdersListResult {
  final int code;
  final dynamic data;
  final String traceId;

  ShopsCurrentOrdersListResult({
    required this.code,
    required this.data,
    required this.traceId
  });

  factory ShopsCurrentOrdersListResult.fromJson(Map<String, dynamic> json) {
    return ShopsCurrentOrdersListResult(
      code: (() {
        final value = json['code'];
        if (value is! int) {
          throw FormatException('ShopsCurrentOrdersListResult.code is required');
        }
        return value;
      })(),
      data: json['data'],
      traceId: (() {
        final value = json['traceId']?.toString();
        if (value == null) {
          throw FormatException('ShopsCurrentOrdersListResult.traceId is required');
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

class ShopsCurrentOrdersRetrieveResult {
  final int code;
  final dynamic data;
  final String traceId;

  ShopsCurrentOrdersRetrieveResult({
    required this.code,
    required this.data,
    required this.traceId
  });

  factory ShopsCurrentOrdersRetrieveResult.fromJson(Map<String, dynamic> json) {
    return ShopsCurrentOrdersRetrieveResult(
      code: (() {
        final value = json['code'];
        if (value is! int) {
          throw FormatException('ShopsCurrentOrdersRetrieveResult.code is required');
        }
        return value;
      })(),
      data: json['data'],
      traceId: (() {
        final value = json['traceId']?.toString();
        if (value == null) {
          throw FormatException('ShopsCurrentOrdersRetrieveResult.traceId is required');
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

class ShopsCurrentPoliciesListResult {
  final int code;
  final dynamic data;
  final String traceId;

  ShopsCurrentPoliciesListResult({
    required this.code,
    required this.data,
    required this.traceId
  });

  factory ShopsCurrentPoliciesListResult.fromJson(Map<String, dynamic> json) {
    return ShopsCurrentPoliciesListResult(
      code: (() {
        final value = json['code'];
        if (value is! int) {
          throw FormatException('ShopsCurrentPoliciesListResult.code is required');
        }
        return value;
      })(),
      data: json['data'],
      traceId: (() {
        final value = json['traceId']?.toString();
        if (value == null) {
          throw FormatException('ShopsCurrentPoliciesListResult.traceId is required');
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

class ShopsCurrentPoliciesUpdateResult {
  final int code;
  final dynamic data;
  final String traceId;

  ShopsCurrentPoliciesUpdateResult({
    required this.code,
    required this.data,
    required this.traceId
  });

  factory ShopsCurrentPoliciesUpdateResult.fromJson(Map<String, dynamic> json) {
    return ShopsCurrentPoliciesUpdateResult(
      code: (() {
        final value = json['code'];
        if (value is! int) {
          throw FormatException('ShopsCurrentPoliciesUpdateResult.code is required');
        }
        return value;
      })(),
      data: json['data'],
      traceId: (() {
        final value = json['traceId']?.toString();
        if (value == null) {
          throw FormatException('ShopsCurrentPoliciesUpdateResult.traceId is required');
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

class ShopsCurrentProductsCreateResult {
  final int code;
  final dynamic data;
  final String traceId;

  ShopsCurrentProductsCreateResult({
    required this.code,
    required this.data,
    required this.traceId
  });

  factory ShopsCurrentProductsCreateResult.fromJson(Map<String, dynamic> json) {
    return ShopsCurrentProductsCreateResult(
      code: (() {
        final value = json['code'];
        if (value is! int) {
          throw FormatException('ShopsCurrentProductsCreateResult.code is required');
        }
        return value;
      })(),
      data: json['data'],
      traceId: (() {
        final value = json['traceId']?.toString();
        if (value == null) {
          throw FormatException('ShopsCurrentProductsCreateResult.traceId is required');
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

class ShopsCurrentProductsListResult {
  final int code;
  final dynamic data;
  final String traceId;

  ShopsCurrentProductsListResult({
    required this.code,
    required this.data,
    required this.traceId
  });

  factory ShopsCurrentProductsListResult.fromJson(Map<String, dynamic> json) {
    return ShopsCurrentProductsListResult(
      code: (() {
        final value = json['code'];
        if (value is! int) {
          throw FormatException('ShopsCurrentProductsListResult.code is required');
        }
        return value;
      })(),
      data: json['data'],
      traceId: (() {
        final value = json['traceId']?.toString();
        if (value == null) {
          throw FormatException('ShopsCurrentProductsListResult.traceId is required');
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

class ShopsCurrentProductsPublishResult {
  final int code;
  final dynamic data;
  final String traceId;

  ShopsCurrentProductsPublishResult({
    required this.code,
    required this.data,
    required this.traceId
  });

  factory ShopsCurrentProductsPublishResult.fromJson(Map<String, dynamic> json) {
    return ShopsCurrentProductsPublishResult(
      code: (() {
        final value = json['code'];
        if (value is! int) {
          throw FormatException('ShopsCurrentProductsPublishResult.code is required');
        }
        return value;
      })(),
      data: json['data'],
      traceId: (() {
        final value = json['traceId']?.toString();
        if (value == null) {
          throw FormatException('ShopsCurrentProductsPublishResult.traceId is required');
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

class ShopsCurrentProductsUnpublishResult {
  final int code;
  final dynamic data;
  final String traceId;

  ShopsCurrentProductsUnpublishResult({
    required this.code,
    required this.data,
    required this.traceId
  });

  factory ShopsCurrentProductsUnpublishResult.fromJson(Map<String, dynamic> json) {
    return ShopsCurrentProductsUnpublishResult(
      code: (() {
        final value = json['code'];
        if (value is! int) {
          throw FormatException('ShopsCurrentProductsUnpublishResult.code is required');
        }
        return value;
      })(),
      data: json['data'],
      traceId: (() {
        final value = json['traceId']?.toString();
        if (value == null) {
          throw FormatException('ShopsCurrentProductsUnpublishResult.traceId is required');
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

class ShopsCurrentProductsUpdateResult {
  final int code;
  final dynamic data;
  final String traceId;

  ShopsCurrentProductsUpdateResult({
    required this.code,
    required this.data,
    required this.traceId
  });

  factory ShopsCurrentProductsUpdateResult.fromJson(Map<String, dynamic> json) {
    return ShopsCurrentProductsUpdateResult(
      code: (() {
        final value = json['code'];
        if (value is! int) {
          throw FormatException('ShopsCurrentProductsUpdateResult.code is required');
        }
        return value;
      })(),
      data: json['data'],
      traceId: (() {
        final value = json['traceId']?.toString();
        if (value == null) {
          throw FormatException('ShopsCurrentProductsUpdateResult.traceId is required');
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

class ShopsCurrentQualificationsListResult {
  final int code;
  final dynamic data;
  final String traceId;

  ShopsCurrentQualificationsListResult({
    required this.code,
    required this.data,
    required this.traceId
  });

  factory ShopsCurrentQualificationsListResult.fromJson(Map<String, dynamic> json) {
    return ShopsCurrentQualificationsListResult(
      code: (() {
        final value = json['code'];
        if (value is! int) {
          throw FormatException('ShopsCurrentQualificationsListResult.code is required');
        }
        return value;
      })(),
      data: json['data'],
      traceId: (() {
        final value = json['traceId']?.toString();
        if (value == null) {
          throw FormatException('ShopsCurrentQualificationsListResult.traceId is required');
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

class ShopsCurrentQualificationsUpsertResult {
  final int code;
  final dynamic data;
  final String traceId;

  ShopsCurrentQualificationsUpsertResult({
    required this.code,
    required this.data,
    required this.traceId
  });

  factory ShopsCurrentQualificationsUpsertResult.fromJson(Map<String, dynamic> json) {
    return ShopsCurrentQualificationsUpsertResult(
      code: (() {
        final value = json['code'];
        if (value is! int) {
          throw FormatException('ShopsCurrentQualificationsUpsertResult.code is required');
        }
        return value;
      })(),
      data: json['data'],
      traceId: (() {
        final value = json['traceId']?.toString();
        if (value == null) {
          throw FormatException('ShopsCurrentQualificationsUpsertResult.traceId is required');
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

class ShopsCurrentReadinessRetrieveResult {
  final int code;
  final dynamic data;
  final String traceId;

  ShopsCurrentReadinessRetrieveResult({
    required this.code,
    required this.data,
    required this.traceId
  });

  factory ShopsCurrentReadinessRetrieveResult.fromJson(Map<String, dynamic> json) {
    return ShopsCurrentReadinessRetrieveResult(
      code: (() {
        final value = json['code'];
        if (value is! int) {
          throw FormatException('ShopsCurrentReadinessRetrieveResult.code is required');
        }
        return value;
      })(),
      data: json['data'],
      traceId: (() {
        final value = json['traceId']?.toString();
        if (value == null) {
          throw FormatException('ShopsCurrentReadinessRetrieveResult.traceId is required');
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

class ShopsCurrentRetrieveResult {
  final int code;
  final dynamic data;
  final String traceId;

  ShopsCurrentRetrieveResult({
    required this.code,
    required this.data,
    required this.traceId
  });

  factory ShopsCurrentRetrieveResult.fromJson(Map<String, dynamic> json) {
    return ShopsCurrentRetrieveResult(
      code: (() {
        final value = json['code'];
        if (value is! int) {
          throw FormatException('ShopsCurrentRetrieveResult.code is required');
        }
        return value;
      })(),
      data: json['data'],
      traceId: (() {
        final value = json['traceId']?.toString();
        if (value == null) {
          throw FormatException('ShopsCurrentRetrieveResult.traceId is required');
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

class ShopsCurrentReturnAddressesListResult {
  final int code;
  final dynamic data;
  final String traceId;

  ShopsCurrentReturnAddressesListResult({
    required this.code,
    required this.data,
    required this.traceId
  });

  factory ShopsCurrentReturnAddressesListResult.fromJson(Map<String, dynamic> json) {
    return ShopsCurrentReturnAddressesListResult(
      code: (() {
        final value = json['code'];
        if (value is! int) {
          throw FormatException('ShopsCurrentReturnAddressesListResult.code is required');
        }
        return value;
      })(),
      data: json['data'],
      traceId: (() {
        final value = json['traceId']?.toString();
        if (value == null) {
          throw FormatException('ShopsCurrentReturnAddressesListResult.traceId is required');
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

class ShopsCurrentReturnAddressesUpsertResult {
  final int code;
  final dynamic data;
  final String traceId;

  ShopsCurrentReturnAddressesUpsertResult({
    required this.code,
    required this.data,
    required this.traceId
  });

  factory ShopsCurrentReturnAddressesUpsertResult.fromJson(Map<String, dynamic> json) {
    return ShopsCurrentReturnAddressesUpsertResult(
      code: (() {
        final value = json['code'];
        if (value is! int) {
          throw FormatException('ShopsCurrentReturnAddressesUpsertResult.code is required');
        }
        return value;
      })(),
      data: json['data'],
      traceId: (() {
        final value = json['traceId']?.toString();
        if (value == null) {
          throw FormatException('ShopsCurrentReturnAddressesUpsertResult.traceId is required');
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

class ShopsCurrentRiskSignalsListResult {
  final int code;
  final dynamic data;
  final String traceId;

  ShopsCurrentRiskSignalsListResult({
    required this.code,
    required this.data,
    required this.traceId
  });

  factory ShopsCurrentRiskSignalsListResult.fromJson(Map<String, dynamic> json) {
    return ShopsCurrentRiskSignalsListResult(
      code: (() {
        final value = json['code'];
        if (value is! int) {
          throw FormatException('ShopsCurrentRiskSignalsListResult.code is required');
        }
        return value;
      })(),
      data: json['data'],
      traceId: (() {
        final value = json['traceId']?.toString();
        if (value == null) {
          throw FormatException('ShopsCurrentRiskSignalsListResult.traceId is required');
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

class ShopsCurrentServiceAreasCreateResult {
  final int code;
  final dynamic data;
  final String traceId;

  ShopsCurrentServiceAreasCreateResult({
    required this.code,
    required this.data,
    required this.traceId
  });

  factory ShopsCurrentServiceAreasCreateResult.fromJson(Map<String, dynamic> json) {
    return ShopsCurrentServiceAreasCreateResult(
      code: (() {
        final value = json['code'];
        if (value is! int) {
          throw FormatException('ShopsCurrentServiceAreasCreateResult.code is required');
        }
        return value;
      })(),
      data: json['data'],
      traceId: (() {
        final value = json['traceId']?.toString();
        if (value == null) {
          throw FormatException('ShopsCurrentServiceAreasCreateResult.traceId is required');
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

class ShopsCurrentServiceAreasListResult {
  final int code;
  final dynamic data;
  final String traceId;

  ShopsCurrentServiceAreasListResult({
    required this.code,
    required this.data,
    required this.traceId
  });

  factory ShopsCurrentServiceAreasListResult.fromJson(Map<String, dynamic> json) {
    return ShopsCurrentServiceAreasListResult(
      code: (() {
        final value = json['code'];
        if (value is! int) {
          throw FormatException('ShopsCurrentServiceAreasListResult.code is required');
        }
        return value;
      })(),
      data: json['data'],
      traceId: (() {
        final value = json['traceId']?.toString();
        if (value == null) {
          throw FormatException('ShopsCurrentServiceAreasListResult.traceId is required');
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

class ShopsCurrentServiceAreasUpdateResult {
  final int code;
  final dynamic data;
  final String traceId;

  ShopsCurrentServiceAreasUpdateResult({
    required this.code,
    required this.data,
    required this.traceId
  });

  factory ShopsCurrentServiceAreasUpdateResult.fromJson(Map<String, dynamic> json) {
    return ShopsCurrentServiceAreasUpdateResult(
      code: (() {
        final value = json['code'];
        if (value is! int) {
          throw FormatException('ShopsCurrentServiceAreasUpdateResult.code is required');
        }
        return value;
      })(),
      data: json['data'],
      traceId: (() {
        final value = json['traceId']?.toString();
        if (value == null) {
          throw FormatException('ShopsCurrentServiceAreasUpdateResult.traceId is required');
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

class ShopsCurrentSettlementProfileRetrieveResult {
  final int code;
  final dynamic data;
  final String traceId;

  ShopsCurrentSettlementProfileRetrieveResult({
    required this.code,
    required this.data,
    required this.traceId
  });

  factory ShopsCurrentSettlementProfileRetrieveResult.fromJson(Map<String, dynamic> json) {
    return ShopsCurrentSettlementProfileRetrieveResult(
      code: (() {
        final value = json['code'];
        if (value is! int) {
          throw FormatException('ShopsCurrentSettlementProfileRetrieveResult.code is required');
        }
        return value;
      })(),
      data: json['data'],
      traceId: (() {
        final value = json['traceId']?.toString();
        if (value == null) {
          throw FormatException('ShopsCurrentSettlementProfileRetrieveResult.traceId is required');
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

class ShopsCurrentSettlementProfileUpdateResult {
  final int code;
  final dynamic data;
  final String traceId;

  ShopsCurrentSettlementProfileUpdateResult({
    required this.code,
    required this.data,
    required this.traceId
  });

  factory ShopsCurrentSettlementProfileUpdateResult.fromJson(Map<String, dynamic> json) {
    return ShopsCurrentSettlementProfileUpdateResult(
      code: (() {
        final value = json['code'];
        if (value is! int) {
          throw FormatException('ShopsCurrentSettlementProfileUpdateResult.code is required');
        }
        return value;
      })(),
      data: json['data'],
      traceId: (() {
        final value = json['traceId']?.toString();
        if (value == null) {
          throw FormatException('ShopsCurrentSettlementProfileUpdateResult.traceId is required');
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

class ShopsCurrentSettlementsListResult {
  final int code;
  final dynamic data;
  final String traceId;

  ShopsCurrentSettlementsListResult({
    required this.code,
    required this.data,
    required this.traceId
  });

  factory ShopsCurrentSettlementsListResult.fromJson(Map<String, dynamic> json) {
    return ShopsCurrentSettlementsListResult(
      code: (() {
        final value = json['code'];
        if (value is! int) {
          throw FormatException('ShopsCurrentSettlementsListResult.code is required');
        }
        return value;
      })(),
      data: json['data'],
      traceId: (() {
        final value = json['traceId']?.toString();
        if (value == null) {
          throw FormatException('ShopsCurrentSettlementsListResult.traceId is required');
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

class ShopsCurrentShippingTemplatesListResult {
  final int code;
  final dynamic data;
  final String traceId;

  ShopsCurrentShippingTemplatesListResult({
    required this.code,
    required this.data,
    required this.traceId
  });

  factory ShopsCurrentShippingTemplatesListResult.fromJson(Map<String, dynamic> json) {
    return ShopsCurrentShippingTemplatesListResult(
      code: (() {
        final value = json['code'];
        if (value is! int) {
          throw FormatException('ShopsCurrentShippingTemplatesListResult.code is required');
        }
        return value;
      })(),
      data: json['data'],
      traceId: (() {
        final value = json['traceId']?.toString();
        if (value == null) {
          throw FormatException('ShopsCurrentShippingTemplatesListResult.traceId is required');
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

class ShopsCurrentShippingTemplatesUpsertResult {
  final int code;
  final dynamic data;
  final String traceId;

  ShopsCurrentShippingTemplatesUpsertResult({
    required this.code,
    required this.data,
    required this.traceId
  });

  factory ShopsCurrentShippingTemplatesUpsertResult.fromJson(Map<String, dynamic> json) {
    return ShopsCurrentShippingTemplatesUpsertResult(
      code: (() {
        final value = json['code'];
        if (value is! int) {
          throw FormatException('ShopsCurrentShippingTemplatesUpsertResult.code is required');
        }
        return value;
      })(),
      data: json['data'],
      traceId: (() {
        final value = json['traceId']?.toString();
        if (value == null) {
          throw FormatException('ShopsCurrentShippingTemplatesUpsertResult.traceId is required');
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

class ShopsCurrentStatusEventsListResult {
  final int code;
  final dynamic data;
  final String traceId;

  ShopsCurrentStatusEventsListResult({
    required this.code,
    required this.data,
    required this.traceId
  });

  factory ShopsCurrentStatusEventsListResult.fromJson(Map<String, dynamic> json) {
    return ShopsCurrentStatusEventsListResult(
      code: (() {
        final value = json['code'];
        if (value is! int) {
          throw FormatException('ShopsCurrentStatusEventsListResult.code is required');
        }
        return value;
      })(),
      data: json['data'],
      traceId: (() {
        final value = json['traceId']?.toString();
        if (value == null) {
          throw FormatException('ShopsCurrentStatusEventsListResult.traceId is required');
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

class ShopsCurrentVerificationsListResult {
  final int code;
  final dynamic data;
  final String traceId;

  ShopsCurrentVerificationsListResult({
    required this.code,
    required this.data,
    required this.traceId
  });

  factory ShopsCurrentVerificationsListResult.fromJson(Map<String, dynamic> json) {
    return ShopsCurrentVerificationsListResult(
      code: (() {
        final value = json['code'];
        if (value is! int) {
          throw FormatException('ShopsCurrentVerificationsListResult.code is required');
        }
        return value;
      })(),
      data: json['data'],
      traceId: (() {
        final value = json['traceId']?.toString();
        if (value == null) {
          throw FormatException('ShopsCurrentVerificationsListResult.traceId is required');
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

class ShopsListResult {
  final int code;
  final dynamic data;
  final String traceId;

  ShopsListResult({
    required this.code,
    required this.data,
    required this.traceId
  });

  factory ShopsListResult.fromJson(Map<String, dynamic> json) {
    return ShopsListResult(
      code: (() {
        final value = json['code'];
        if (value is! int) {
          throw FormatException('ShopsListResult.code is required');
        }
        return value;
      })(),
      data: json['data'],
      traceId: (() {
        final value = json['traceId']?.toString();
        if (value == null) {
          throw FormatException('ShopsListResult.traceId is required');
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

class ShopsRetrieveResult {
  final int code;
  final dynamic data;
  final String traceId;

  ShopsRetrieveResult({
    required this.code,
    required this.data,
    required this.traceId
  });

  factory ShopsRetrieveResult.fromJson(Map<String, dynamic> json) {
    return ShopsRetrieveResult(
      code: (() {
        final value = json['code'];
        if (value is! int) {
          throw FormatException('ShopsRetrieveResult.code is required');
        }
        return value;
      })(),
      data: json['data'],
      traceId: (() {
        final value = json['traceId']?.toString();
        if (value == null) {
          throw FormatException('ShopsRetrieveResult.traceId is required');
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

class TurnResponsesCreateResult {
  final int code;
  final dynamic data;
  final String traceId;

  TurnResponsesCreateResult({
    required this.code,
    required this.data,
    required this.traceId
  });

  factory TurnResponsesCreateResult.fromJson(Map<String, dynamic> json) {
    return TurnResponsesCreateResult(
      code: (() {
        final value = json['code'];
        if (value is! int) {
          throw FormatException('TurnResponsesCreateResult.code is required');
        }
        return value;
      })(),
      data: json['data'],
      traceId: (() {
        final value = json['traceId']?.toString();
        if (value == null) {
          throw FormatException('TurnResponsesCreateResult.traceId is required');
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

class TurnsCreateResult {
  final int code;
  final dynamic data;
  final String traceId;

  TurnsCreateResult({
    required this.code,
    required this.data,
    required this.traceId
  });

  factory TurnsCreateResult.fromJson(Map<String, dynamic> json) {
    return TurnsCreateResult(
      code: (() {
        final value = json['code'];
        if (value is! int) {
          throw FormatException('TurnsCreateResult.code is required');
        }
        return value;
      })(),
      data: json['data'],
      traceId: (() {
        final value = json['traceId']?.toString();
        if (value == null) {
          throw FormatException('TurnsCreateResult.traceId is required');
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
