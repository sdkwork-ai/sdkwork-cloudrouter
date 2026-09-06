import type { GroupPickerVendor } from '@sdkwork/cloudroutes-pc-commons/components/GroupPicker';
/**
 * 拉取模型厂商列表（model vendors 权威主数据，经 app SDK 边界调用）。
 * 返回完整厂商列表：API 项优先，缺失的厂商用静态兜底表补齐显示名；
 * API 完全不可用时回退到静态全量表。
 */
export declare function fetchModelVendors(): Promise<GroupPickerVendor[]>;
//# sourceMappingURL=vendorCatalog.d.ts.map