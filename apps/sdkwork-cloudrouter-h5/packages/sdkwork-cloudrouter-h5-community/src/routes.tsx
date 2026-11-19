import { lazy, Suspense, type ComponentType } from 'react';
import { Route, Routes } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import type { SdkworkConsoleLocale } from '@sdkwork/cloudrouter-h5-i18n';
import { CLOUDROUTER_H5_ORDER_ROUTES } from '@sdkwork/cloudrouter-h5-orders/routes';

import { CommunityI18nProvider } from './i18n.js';

/**
 * Community route catalog.
 *
 * Paths mirror the sdkwork-community mobile route catalog so the same pages
 * render in every SDKWork host (the community package was extracted from
 * sdkwork-im H5). Stacked community screens render outside the console tab
 * shell, like the order and settings surfaces.
 */
type CommunityPage =
  | 'CommunityList'
  | 'CreateCommunity'
  | 'MyCommunities'
  | 'CommunityDetail'
  | 'CommunityProfile'
  | 'CommunityGroupManagement'
  | 'CreateCommunityGroup'
  | 'CommunityEditField'
  | 'CommunityEditImage'
  | 'CommunityEditTabs'
  | 'CommunityMembers'
  | 'CommunityQRCode'
  | 'CommunityPostCreate'
  | 'CommunityGroupQRs';

function lazyCommunityPage(name: CommunityPage): ComponentType {
  return lazy(async () => {
    const module = await import('@sdkwork/community-mobile-react-community');
    const page = module[name];
    if (!page) {
      throw new Error(`Community page ${name} is not exported by @sdkwork/community-mobile-react-community.`);
    }
    return { default: page as ComponentType };
  });
}

const CircleCashierBridge = lazy(async () => {
  const module = await import('@sdkwork/community-mobile-react-community');
  return { default: module.CircleCashierBridge };
});

const CommunityList = lazyCommunityPage('CommunityList');
const CreateCommunity = lazyCommunityPage('CreateCommunity');
const MyCommunities = lazyCommunityPage('MyCommunities');
const CommunityDetail = lazyCommunityPage('CommunityDetail');
const CommunityProfile = lazyCommunityPage('CommunityProfile');
const CommunityGroupManagement = lazyCommunityPage('CommunityGroupManagement');
const CreateCommunityGroup = lazyCommunityPage('CreateCommunityGroup');
const CommunityEditField = lazyCommunityPage('CommunityEditField');
const CommunityEditImage = lazyCommunityPage('CommunityEditImage');
const CommunityEditTabs = lazyCommunityPage('CommunityEditTabs');
const CommunityMembers = lazyCommunityPage('CommunityMembers');
const CommunityQRCode = lazyCommunityPage('CommunityQRCode');
const CommunityPostCreate = lazyCommunityPage('CommunityPostCreate');
const CommunityGroupQRs = lazyCommunityPage('CommunityGroupQRs');

function CommunityFallback() {
  const { t } = useTranslation();
  return (
    <div className="flex min-h-[40vh] items-center justify-center bg-[var(--cr-canvas)] text-sm text-[var(--cr-ink-muted)]">
      {t('community.auto_7f6f37e', 'Loading...')}
    </div>
  );
}

export interface CommunityRoutesProps {
  readonly locale: SdkworkConsoleLocale;
}

export function CommunityRoutes({ locale }: CommunityRoutesProps) {
  return (
    <CommunityI18nProvider locale={locale}>
      <Suspense fallback={<CommunityFallback />}>
        <Routes>
          <Route index element={<CommunityList />} />
          <Route path="create" element={<CreateCommunity />} />
          <Route path="mine" element={<MyCommunities />} />
          <Route path=":id" element={<CommunityDetail />} />
          <Route path=":id/profile" element={<CommunityProfile />} />
          <Route path=":id/profile/groups" element={<CommunityGroupManagement />} />
          <Route path=":id/profile/groups/edit/:groupId" element={<CreateCommunityGroup />} />
          <Route path=":id/profile/edit" element={<CommunityEditField />} />
          <Route path=":id/profile/image" element={<CommunityEditImage />} />
          <Route path=":id/profile/tabs" element={<CommunityEditTabs />} />
          <Route path=":id/profile/members" element={<CommunityMembers />} />
          <Route path=":id/profile/qrcode" element={<CommunityQRCode />} />
          <Route path=":id/post" element={<CommunityPostCreate />} />
          <Route path=":id/groups/create" element={<CreateCommunityGroup />} />
          <Route path=":id/group/:groupId" element={<CommunityGroupQRs />} />
          <Route
            path=":id/cashier/:orderId"
            element={
              <CircleCashierBridge
                orderCenterPath={CLOUDROUTER_H5_ORDER_ROUTES.orderCenter.path}
                orderDetailPath={CLOUDROUTER_H5_ORDER_ROUTES.orderDetail.path}
              />
            }
          />
        </Routes>
      </Suspense>
    </CommunityI18nProvider>
  );
}
