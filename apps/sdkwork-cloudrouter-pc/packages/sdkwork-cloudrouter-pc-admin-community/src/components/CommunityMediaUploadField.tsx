import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Trash2 } from 'lucide-react';
import { FileUpload, type FileUploadItem } from '@sdkwork/ui-pc-react';
import {
  useCloudRouterUpload,
  useResolvedMediaResourceUrl,
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
 * 上传逻辑全部下沉到 `@sdkwork/cloudroutes-pc-commons` 的统一上传目录与
 * `useCloudRouterUpload`，本组件只负责渲染、进度映射与清空操作。
 */
export function CommunityMediaUploadField({
  label,
  slot,
  value,
  onChange,
  hint,
  accept = 'image/*',
  maxSizeBytes = 5 * 1024 * 1024,
  shape = 'rect',
  previewFit = 'object-cover',
}: CommunityMediaUploadFieldProps) {
  const { t } = useTranslation();
  const previewUrl = useResolvedMediaResourceUrl(value);
  const [items, setItems] = useState<FileUploadItem[]>([]);

  const uploader = useCloudRouterUpload({
    slot,
    onUploaded: (result) => onChange(result.media),
  });

  const markItem = (itemId: string, status: FileUploadItem['status'], progress?: number) => {
    setItems((current) => current.map((item) =>
      item.id === itemId ? { ...item, status, ...(progress === undefined ? {} : { progress }) } : item));
  };

  const handleValueChange = (nextItems: FileUploadItem[]) => {
    setItems(nextItems);
    const nextFile = nextItems.find((item) => item.file);
    if (!nextFile?.file || uploader.isUploading) {
      return;
    }
    const pendingId = nextFile.id;
    markItem(pendingId, 'uploading', 0);
    void uploader.upload(nextFile.file).then((result) => {
      markItem(pendingId, result ? 'success' : 'error', result ? 100 : 0);
    });
  };

  const clear = () => {
    onChange(undefined);
    setItems([]);
    uploader.reset();
  };

  const previewClassName = shape === 'circle' ? 'rounded-full' : 'rounded-lg';

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between gap-3">
        <span className="block text-sm font-medium text-slate-700 dark:text-slate-300">{label}</span>
        {value ? (
          <button
            className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium text-slate-500 transition-colors hover:bg-slate-100 hover:text-red-600 dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-red-400"
            onClick={clear}
            type="button"
          >
            <Trash2 className="h-3.5 w-3.5" />
            {t('common.actions.clear', '清除')}
          </button>
        ) : null}
      </div>
      <div className="flex items-start gap-3">
        <div className={`flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden border border-slate-200 bg-slate-50 dark:border-white/10 dark:bg-white/5 ${previewClassName}`}>
          {previewUrl ? (
            <img alt={label} className={`h-full w-full ${previewFit}`} src={previewUrl} />
          ) : null}
        </div>
        <div className="min-w-0 flex-1">
          <FileUpload
            accept={accept}
            disabled={uploader.isUploading}
            maxFiles={1}
            maxSize={maxSizeBytes}
            multiple={false}
            onValueChange={handleValueChange}
            replaceOnMax
            value={items}
            variant="image"
          />
          {uploader.error ? (
            <p className="mt-1.5 text-xs text-red-600 dark:text-red-400">{uploader.error}</p>
          ) : hint ? (
            <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">{hint}</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
