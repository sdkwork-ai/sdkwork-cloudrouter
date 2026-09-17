/**
 * Package-local state slice descriptor.
 *
 * State stays package-local unless declared as a public integration contract.
 */
export interface ConsoleDashboardStateSlice {
  readonly lastLoadedPage?: number;
  readonly lastLoadedProfileId?: string;
}

export const initialConsoleDashboardStateSlice: ConsoleDashboardStateSlice = {};
