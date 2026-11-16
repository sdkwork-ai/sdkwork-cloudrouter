import { lazy, Suspense, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import { getCloudRouterRtcAdminService } from './rtcService';

import '@sdkwork/rtc-pc-admin-core/src/admin-design-system.css';
import '@sdkwork/rtc-pc-admin-core/src/admin-styles.css';

export { RTC_ADMIN_DEFAULT_PATH } from './rtcAdminContribution';

/**
 * Cloud Router RTC admin (实时音视频中心) capability integration.
 *
 * Route components render the shared `RtcAdminCenterWorkspace` from
 * `@sdkwork/rtc-pc-admin-core` with the portal-injected service. The
 * workspace owns all page orchestration; this package only maps the
 * `/admin/rtc/*` route space onto it.
 */

function RtcAdminRouteLoading() {
  const { t } = useTranslation();
  return (
    <div
      className="flex min-h-full flex-col items-center justify-center gap-3 px-6 py-24 text-center"
      role="status"
    >
      <p className="text-sm text-slate-600 dark:text-slate-300">{t('admin.rtc.loading')}</p>
    </div>
  );
}

/** Maps a Cloud Router route (/admin/rtc/x) to the workspace route (/admin/x). */
function toRtcWorkspaceRoute(cloudRouterPath: string): string {
  return cloudRouterPath.replace(/^\/admin\/rtc(?=\/|$)/u, '/admin');
}

const LazyRtcAdminCenter = lazy(async () => {
  const { RtcAdminCenterWorkspace } = await import('@sdkwork/rtc-pc-admin-core');
  return {
    default: function CloudRouterRtcAdminCenterContent({ path }: { path: string }) {
      const services = useMemo(() => getCloudRouterRtcAdminService(), []);
      const navigate = useNavigate();
      // The workspace speaks its own `/admin/x` route space; the Cloud Router
      // admin mounts the same pages under `/admin/rtc/x` and uses the browser
      // router (not the hash strategy of the standalone RTC app).
      const navigateTo = useCallback(
        (workspacePath: string) => {
          const cloudRouterPath = workspacePath.startsWith('/admin')
            ? `/admin/rtc${workspacePath.slice('/admin'.length)}`
            : workspacePath;
          navigate(cloudRouterPath);
        },
        [navigate],
      );
      return (
        <RtcAdminCenterWorkspace
          services={services}
          route={toRtcWorkspaceRoute(path)}
          navigateTo={navigateTo}
        />
      );
    },
  };
});

function RtcAdminRoute({ path }: { path: string }) {
  return (
    <Suspense fallback={<RtcAdminRouteLoading />}>
      <LazyRtcAdminCenter path={path} />
    </Suspense>
  );
}

export const RTC_ADMIN_ROUTE_ELEMENTS: Readonly<Record<string, React.ReactElement>> = {
  'rtc/dashboard': <RtcAdminRoute path="/admin/rtc/dashboard" />,
  'rtc/media-sessions': <RtcAdminRoute path="/admin/rtc/media-sessions" />,
  'rtc/media-sessions/:mediaSessionId': <RtcAdminRoute path="/admin/rtc/media-sessions/:mediaSessionId" />,
  'rtc/rooms': <RtcAdminRoute path="/admin/rtc/rooms" />,
  'rtc/rooms/:roomId': <RtcAdminRoute path="/admin/rtc/rooms/:roomId" />,
  'rtc/media-artifacts': <RtcAdminRoute path="/admin/rtc/media-artifacts" />,
  'rtc/media-artifacts/:mediaArtifactId': <RtcAdminRoute path="/admin/rtc/media-artifacts/:mediaArtifactId" />,
  'rtc/quality-samples': <RtcAdminRoute path="/admin/rtc/quality-samples" />,
  'rtc/provider-accounts': <RtcAdminRoute path="/admin/rtc/provider-accounts" />,
  'rtc/provider-applications': <RtcAdminRoute path="/admin/rtc/provider-applications" />,
  'rtc/provider-credentials': <RtcAdminRoute path="/admin/rtc/provider-credentials" />,
  'rtc/provider-profiles': <RtcAdminRoute path="/admin/rtc/provider-profiles" />,
  'rtc/provider-routes': <RtcAdminRoute path="/admin/rtc/provider-routes" />,
  'rtc/providers': <RtcAdminRoute path="/admin/rtc/providers" />,
  'rtc/wizard': <RtcAdminRoute path="/admin/rtc/wizard" />,
  'rtc/webhook-events': <RtcAdminRoute path="/admin/rtc/webhook-events" />,
  'rtc/query-jobs': <RtcAdminRoute path="/admin/rtc/query-jobs" />,
};
