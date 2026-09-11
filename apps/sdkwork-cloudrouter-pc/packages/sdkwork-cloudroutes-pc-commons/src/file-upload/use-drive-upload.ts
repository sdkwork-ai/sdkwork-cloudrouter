import { useCallback, useMemo, useRef, useState } from 'react';

import type { CloudRouterMediaResource } from '../media-resource.ts';
import {
  getCloudRouterUploadSlot,
  type CloudRouterUploadSlot,
  type CloudRouterUploadSlotCode,
} from './upload-catalog.ts';
import {
  uploadCloudRouterFile,
  validateCloudRouterUploadFile,
  type CloudRouterUploadFileInput,
  type CloudRouterUploadedFile,
  type CloudRouterUploadProgress,
} from './drive-upload.ts';

export type CloudRouterUploadState = 'error' | 'idle' | 'success' | 'uploading';

export interface UseCloudRouterUploadResult {
  slot: CloudRouterUploadSlot;
  state: CloudRouterUploadState;
  progress: CloudRouterUploadProgress | undefined;
  media: CloudRouterMediaResource | undefined;
  uploaded: CloudRouterUploadedFile | undefined;
  error: string | undefined;
  isUploading: boolean;
  upload: (file: CloudRouterUploadFileInput['file']) => Promise<CloudRouterUploadedFile | undefined>;
  reset: () => void;
}

export interface UseCloudRouterUploadOptions {
  slot: CloudRouterUploadSlotCode;
  appResourceId?: string;
  spaceId?: string;
  parentNodeId?: string;
  organizationId?: string;
  onUploaded?: (uploaded: CloudRouterUploadedFile) => void;
  onError?: (message: string) => void;
}

/**
 * 管理端媒体字段的共用上传状态机。
 *
 * 各业务包只负责渲染 `FileUpload`，上传、校验、进度与错误处理统一收敛到本 hook，
 * 保证每个入口都走 Drive uploader 并带一致的归类信息。
 */
export function useCloudRouterUpload(
  options: UseCloudRouterUploadOptions,
): UseCloudRouterUploadResult {
  const slot = useMemo(() => getCloudRouterUploadSlot(options.slot), [options.slot]);
  const [state, setState] = useState<CloudRouterUploadState>('idle');
  const [progress, setProgress] = useState<CloudRouterUploadProgress | undefined>(undefined);
  const [uploaded, setUploaded] = useState<CloudRouterUploadedFile | undefined>(undefined);
  const [error, setError] = useState<string | undefined>(undefined);
  const abortRef = useRef<AbortController | undefined>(undefined);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = undefined;
    setState('idle');
    setProgress(undefined);
    setUploaded(undefined);
    setError(undefined);
  }, []);

  const upload = useCallback(
    async (file: CloudRouterUploadFileInput['file']) => {
      const validation = validateCloudRouterUploadFile(options.slot, file);
      if (!validation.ok) {
        setState('error');
        setError(validation.message);
        options.onError?.(validation.message);
        return undefined;
      }

      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      setState('uploading');
      setError(undefined);
      setProgress(undefined);

      try {
        const result = await uploadCloudRouterFile({
          slot: options.slot,
          file,
          ...(options.appResourceId ? { appResourceId: options.appResourceId } : {}),
          ...(options.spaceId ? { spaceId: options.spaceId } : {}),
          ...(options.parentNodeId ? { parentNodeId: options.parentNodeId } : {}),
          ...(options.organizationId ? { organizationId: options.organizationId } : {}),
          signal: controller.signal,
          onProgress: setProgress,
        });
        setUploaded(result);
        setState('success');
        options.onUploaded?.(result);
        return result;
      } catch (uploadError) {
        if (controller.signal.aborted) {
          setState('idle');
          return undefined;
        }
        const message = uploadError instanceof Error
          ? uploadError.message
          : String(uploadError);
        setState('error');
        setError(message);
        options.onError?.(message);
        return undefined;
      } finally {
        if (abortRef.current === controller) {
          abortRef.current = undefined;
        }
      }
    },
    [
      options.slot,
      options.appResourceId,
      options.spaceId,
      options.parentNodeId,
      options.organizationId,
      options.onUploaded,
      options.onError,
    ],
  );

  return {
    slot,
    state,
    progress,
    media: uploaded?.media,
    uploaded,
    error,
    isUploading: state === 'uploading',
    upload,
    reset,
  };
}
