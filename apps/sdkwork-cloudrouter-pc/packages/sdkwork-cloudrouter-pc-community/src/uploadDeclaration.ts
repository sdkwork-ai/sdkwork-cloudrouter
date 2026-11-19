/**
 * Upload identity for community post media on the PC portal.
 *
 * Mirrors the `community.post_media` entry in
 * `apps/sdkwork-cloudrouter-pc/specs/upload.declaration.json`
 * (`DRIVE_SPEC.md` section 18). Call sites reference this constant instead of
 * inlining the declaration literals.
 */
export const CLOUDROUTER_PC_COMMUNITY_POST_UPLOAD = {
  appResourceIdKind: 'entity',
  appResourceType: 'community.post_media',
  purpose: 'Community post media uploaded from the Cloud Router PC community workspace.',
  retention: 'long_term',
  scene: 'community-post',
  source: 'cloudrouter-pc-community-post-upload',
  uploadProfileCode: 'image',
} as const;
