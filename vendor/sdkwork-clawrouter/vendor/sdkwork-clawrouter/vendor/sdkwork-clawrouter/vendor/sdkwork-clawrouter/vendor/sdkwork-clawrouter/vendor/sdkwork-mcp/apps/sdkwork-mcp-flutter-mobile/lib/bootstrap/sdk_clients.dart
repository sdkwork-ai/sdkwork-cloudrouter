import 'package:sdkwork_mcp_flutter_mobile_core/sdkwork_mcp_flutter_mobile_core.dart';

typedef SdkClients = SdkworkMcpFlutterSdkClients;

SdkworkMcpFlutterSdkClients createSdkClients({
  String apiBaseUrl = 'http://127.0.0.1:8095/app/v3/api',
}) {
  return createSdkworkMcpFlutterSdkClients(apiBaseUrl: apiBaseUrl);
}
