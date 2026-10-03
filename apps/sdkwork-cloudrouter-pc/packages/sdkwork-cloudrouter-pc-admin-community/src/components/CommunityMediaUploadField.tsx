import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Trash2 } from 'lucide-react';
import { DriveUploadImage } from 'sdkwork-drive-pc-upload-image';
import {
  cloudRouterMediaResourceToDriveUploadImageValue,
  driveUploadImageValueToCloudRouterMediaResource,
  getCloudRouterDriveImageService,
  getCloudRouterUploadSlot,
  type CloudRouterMediaResource,
  type CloudRouterUploadSlotCode,
} from '@sdkwork/cloudroutes-pc-commons/runtime';

export interface CommunityMediaUploadFieldProps {
  label: string;
  slot: CloudRouterUploadSlotCode;
  value: CloudRouterMediaResource | undefined;
  onChange: (media: CloudRouterMediaResource | undefined) => void;
  hint?: string;
  accept?: string;
  maxSizeBytes?: number;
  /** 预览区形状：头像用 rounded-full，封面用 rounded-lg。 */
  shape?: 'circle' | 'rect';
  previewFit?: 'object-contain' | 'object-cover';
}

/**
 * 社区圈子头像 / 封面统一上传字段。
 *
 * 上传逻辑下沉到 `@sdkwork/cloudroutes-pc-commons` 的统一上传目录与共享 Drive
 * 图片上传服务（`sdkwork-drive-pc-upload-image` 的 `DriveUploadImage`），本组件
 * 只负责把 `CloudRouterMediaResource` 持久化状态桥接为共享组件的受控值。
 */
export function CommunityMediaUploadField({
  label,
  slot,
  value,
  onChange,
  hint,
  maxSizeBytes,
  shape = 'rect',
}: CommunityMediaUploadFieldProps) {
  const { t } = useTranslation();
  const catalogSlot = getCloudRouterUploadSlot(slot);
  const [uploadError, setUploadError] = useState<string | null>(null);

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between gap-3">
        <span className="block text-sm font-medium text-slate-700 dark:text-slate-300">{label}</span>
        {value ? (
          <button
            className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium text-slate-500 transition-colors hover:bg-slate-100 hover:text-red-600 dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-red-400"
            onClick={() => onChange(undefined)}
            type="button"
          >
            <Trash2 className="h-3.5 w-3.5" />
            {t('common.actions.clear', '清除')}
          </button>
        ) : null}
      </div>
      <DriveUploadImage
        appResourceId={catalogSlot.appResourceId}
        copy={{
          pickImage: label,
          removeImage: '移除图片',
          retryUpload: '重试上传',
          uploading: '上传中…',
          uploadFailed: '上传失败',
        }}
        maxSizeBytes={maxSizeBytes ?? catalogSlot.maxSizeBytes}
        onChange={(next) => {
          setUploadError(null);
          onChange(driveUploadImageValueToCloudRouterMediaResource(next, catalogSlot.mediaKind));
        }}
        onUploadError={(error) => setUploadError(error.message)}
        service={getCloudRouterDriveImageService(slot)}
        shape={shape === 'circle' ? 'circle' : 'rounded'}
        sizePx={80}
        value={cloudRouterMediaResourceToDriveUploadImageValue(value)}
      />
      {uploadError ? (
        <p className="mt-1.5 text-xs text-red-600 dark:text-red-400">{uploadError}</p>
      ) : hint ? (
        <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">{hint}</p>
      ) : null}
    </div>
  );
}
