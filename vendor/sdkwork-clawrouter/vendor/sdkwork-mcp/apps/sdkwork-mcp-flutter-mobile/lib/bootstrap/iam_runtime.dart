import 'package:sdkwork_mcp_flutter_mobile_core/sdkwork_mcp_flutter_mobile_core.dart';

import 'sdk_clients.dart';

SdkworkMcpFlutterSdkClients? _iamRuntime;

SdkworkMcpFlutterSdkClients createIamRuntime({
  String apiBaseUrl = 'http://127.0.0.1:8095/app/v3/api',
}) {
  _iamRuntime = createSdkClients(apiBaseUrl: apiBaseUrl);
  return _iamRuntime!;
}

SdkworkMcpFlutterSdkClients? getIamRuntime() => _iamRuntime;
