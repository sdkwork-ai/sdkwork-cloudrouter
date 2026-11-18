import { useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  SdkworkCompanyEnterpriseAdminApp,
  createEnterpriseAdminService,
} from '@sdkwork/company-pc-admin-enterprise';
import { getSdkworkCompanyBackendSdkClient } from '@sdkwork/cloudroutes-pc-commons/sdk-clients';

/**
 * Cloud Router host adaptation element for the sdkwork-company enterprise center.
 *
 * The enterprise center screens owned by `@sdkwork/company-pc-admin-enterprise`
 * never read host session, permission, i18n, or router state. The host builds
 * the data service over the generated `@sdkwork/company-backend-sdk` client,
 * derives the section from the route pathname, and injects SPA navigation plus
 * the current portal language. All enterprise content (screens, service, menu
 * and route metadata, copy) lives in the sdkwork-company workspace.
 */
function resolveEnterpriseSectionFromPath(pathname: string): string {
  const normalized = pathname.replace(/^\/admin\/enterprise\/?/, '');
  return normalized.split('/')[0] || 'overview';
}

function resolveEnterpriseLocale(resolvedLanguage: string | undefined): string {
  if (!resolvedLanguage) {
    return 'zh-CN';
  }
  return resolvedLanguage.toLowerCase().startsWith('en') ? 'en-US' : 'zh-CN';
}

export function EnterpriseCenterHostElement() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { i18n } = useTranslation();
  const service = useMemo(
    () => createEnterpriseAdminService(getSdkworkCompanyBackendSdkClient()),
    [],
  );
  return (
    <SdkworkCompanyEnterpriseAdminApp
      locale={resolveEnterpriseLocale(i18n.resolvedLanguage)}
      onNavigate={(path) => navigate(path)}
      sectionId={resolveEnterpriseSectionFromPath(pathname)}
      service={service}
    />
  );
}
