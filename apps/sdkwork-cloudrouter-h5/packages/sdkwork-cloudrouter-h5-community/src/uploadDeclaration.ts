/**
 * Upload identity for community post media.
 *
 * Mirrors `apps/sdkwork-cloudrouter-h5/specs/upload.declaration.json`
 * (`DRIVE_SPEC.md` section 18). Call sites pass this value; they never inline
 * the source/scene/resource-type literals.
 */
export const CLOUDROUTER_H5_COMMUNITY_POST_UPLOAD = {
  appResourceIdKind: 'entity',
  appResourceType: 'community.post_media',
  purpose: 'Community post media uploaded from the Cloud Router H5 community surface.',
  retention: 'long_term',
  scene: 'community-post',
  source: 'sdkwork-cloudrouter-h5',
  uploadProfileCode: 'image',
} as const;
