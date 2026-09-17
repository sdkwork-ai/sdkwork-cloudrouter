/**
 * Package-local state slice descriptor.
 *
 * State stays package-local unless declared as a public integration contract.
 */
export interface ConsoleUsageStateSlice {
  readonly lastLoadedPage?: number;
  readonly lastLoadedProfileId?: string;
}

export const initialConsoleUsageStateSlice: ConsoleUsageStateSlice = {};
