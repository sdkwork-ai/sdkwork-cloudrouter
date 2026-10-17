import 'package:sdkwork_cloudrouter_flutter_mobile_core/sdkwork_cloudrouter_flutter_mobile_core.dart';
import 'package:sdkwork_cloudrouter_flutter_mobile_shell/sdkwork_cloudrouter_flutter_mobile_shell.dart';

import 'host_adapters.dart';
import 'iam_runtime.dart';
import 'routes.dart';
import 'sdk_clients.dart';

/// Root runtime assembled by `bootstrap()` in the order required by
/// `APP_SDK_INTEGRATION_SPEC.md` section 4: environment, token/identity, host
/// adapters, generated app SDK clients, then routes.
class CloudRouterFlutterRuntime {
  const CloudRouterFlutterRuntime({
    required this.sdkClients,
    required this.consolePorts,
    required this.session,
    required this.routes,
  });

  final CloudRouterAppSdkClients sdkClients;
  final CloudRouterConsolePorts consolePorts;
  final CloudRouterSession session;

  /// Assembled console route registry (canonical route ids, never HTTP paths).
  final List<SdkworkCloudRouterRouteRegistration> routes;
}

Future<CloudRouterFlutterRuntime> bootstrap() async {
  final sdkClients = createSdkClients();
  final session = readCloudRouterSession();
  createIamRuntime(session);
  registerHostAdapters();
  final consolePorts = createCloudRouterConsolePorts(sdkClients: sdkClients);
  final routes = createRoutes();
  verifyConsoleRouteAlignment(routes);
  return CloudRouterFlutterRuntime(
    sdkClients: sdkClients,
    consolePorts: consolePorts,
    session: session,
    routes: routes,
  );
}
