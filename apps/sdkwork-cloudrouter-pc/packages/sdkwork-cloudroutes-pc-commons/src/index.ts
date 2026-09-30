// Every relative specifier below is extension-qualified on purpose.
//
// This package's `src/` still carries stray in-place `tsc` emit from an ad-hoc run
// (`*.js` / `*.d.ts` / `*.js.map` / `*.d.ts.map` next to each source). The bundler's
// extension resolution puts `.js` ahead of `.ts`, so a bare specifier silently loads a
// stale compiled copy — and any later edit to that source then has no effect in the dev
// server, with no error to explain why. Naming the source file wins outright.
//
// It is also the package's existing convention: 182 explicit-extension specifiers
// against 45 bare ones, and the barrelled subpath entries in package.json already point
// straight at `.ts`/`.tsx`.
export * from './components/Navbar.tsx';
export * from './components/Footer.tsx';
export * from './components/QrCodePlaceholder.tsx';
export * from './components/Sidebar.tsx';
export * from './components/JsonSyntaxHighlight.tsx';
export * from './components/BusinessState.tsx';
export * from './components/AdminTableShell.tsx';
export * from './components/AdminResourceCenter.tsx';
export * from './components/AdminResourceHelp.tsx';
export * from './components/AdminCategoryManagementSidebar.tsx';
export * from './components/AiResourceSelectorModal.tsx';
export * from './components/GroupSelector.tsx';
export * from './components/GroupPicker.tsx';
export * from './components/BottomPagination.tsx';
export * from './components/ConfirmDialog.tsx';
export * from './components/CopyButton.tsx';
export * from './admin-category-types.ts';
export * from './admin-resource-options.ts';
export * from './clipboard.ts';
export * from './api-request-url.ts';
export * from './media-resource.ts';
export * from './model-catalog-identity.ts';
export * from './reference-sidebar-groups.ts';
export * from './documents-reference-runtime-adapter.ts';
export * from './share-url.ts';
export * from './portal-auth.ts';
export * from './recharge-math.ts';
export * from './problem-message.ts';
export * from './sdk-locale.ts';
export * from './queryClient.tsx';
import './base-data-pc-react-config.ts';
export * from './PortalErrorBoundary.tsx';
