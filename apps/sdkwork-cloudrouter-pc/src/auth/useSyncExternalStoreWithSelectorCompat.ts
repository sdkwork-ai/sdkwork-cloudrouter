import { useDebugValue, useEffect, useMemo, useRef, useSyncExternalStore } from 'react';

type EqualityFn<T> = (left: T, right: T) => boolean;
type StoreSubscription = (onStoreChange: () => void) => () => void;
type StoreSnapshot<TSnapshot> = () => TSnapshot;
type Selector<TSnapshot, TSelection> = (snapshot: TSnapshot) => TSelection;
type SelectorState<TSelection> = {
  hasValue: boolean;
  value: TSelection | null;
};

function isEqual<T>(left: T, right: T): boolean {
  return Object.is(left, right);
}

export function useSyncExternalStoreWithSelector<TSnapshot, TSelection>(
  subscribe: StoreSubscription,
  getSnapshot: StoreSnapshot<TSnapshot>,
  getServerSnapshot: StoreSnapshot<TSnapshot> | undefined,
  selector: Selector<TSnapshot, TSelection>,
  isSelectionEqual: EqualityFn<TSelection> = isEqual,
): TSelection {
  const stateRef = useRef<SelectorState<TSelection> | null>(null);
  const state = stateRef.current ?? {
      hasValue: false,
      value: null,
    };
  if (stateRef.current === null) {
    stateRef.current = state;
  }

  const [getSelectedSnapshot, getSelectedServerSnapshot] = useMemo(
    () => {
      let hasMemo = false;
      let memoizedSnapshot: TSnapshot;
      let memoizedSelection: TSelection;

      function memoizedSelector(nextSnapshot: TSnapshot): TSelection {
        if (!hasMemo) {
          hasMemo = true;
          memoizedSnapshot = nextSnapshot;
          const nextSelection = selector(nextSnapshot);
          if (state.hasValue && isSelectionEqual(state.value as TSelection, nextSelection)) {
            memoizedSelection = state.value as TSelection;
            return memoizedSelection;
          }
          memoizedSelection = nextSelection;
          return memoizedSelection;
        }

        if (Object.is(memoizedSnapshot, nextSnapshot)) {
          return memoizedSelection;
        }

        const nextSelection = selector(nextSnapshot);
        if (isSelectionEqual(memoizedSelection, nextSelection)) {
          memoizedSnapshot = nextSnapshot;
          return memoizedSelection;
        }

        memoizedSnapshot = nextSnapshot;
        memoizedSelection = nextSelection;
        return nextSelection;
      }

      const selectedSnapshot = () => memoizedSelector(getSnapshot());
      const selectedServerSnapshot = getServerSnapshot
        ? () => memoizedSelector(getServerSnapshot())
        : undefined;
      return [selectedSnapshot, selectedServerSnapshot] as const;
    },
    [getSnapshot, getServerSnapshot, selector, isSelectionEqual],
  );

  const selectedValue = useSyncExternalStore(
    subscribe,
    getSelectedSnapshot,
    getSelectedServerSnapshot,
  );

  useEffect(() => {
    state.hasValue = true;
    state.value = selectedValue;
  }, [selectedValue]);
  useDebugValue(selectedValue);

  return selectedValue;
}

const useSyncExternalStoreWithSelectorShim = {
  useSyncExternalStoreWithSelector,
};

export default useSyncExternalStoreWithSelectorShim;
