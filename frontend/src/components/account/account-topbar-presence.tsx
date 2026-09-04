"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

/**
 * Lets the floating notification bell know a phone top bar is on screen.
 *
 * The bar carries its own bell, so the floating overlay would double it. This
 * used to be decided from a list of path prefixes, which already missed the
 * admin, checkout and cancellation routes -- every page built on
 * `AccountStaticShell` belongs there, and the list could not keep up. The bar
 * announcing itself cannot drift.
 */
const AccountTopBarPresenceContext = createContext<{
  hasTopBar: boolean;
  registerTopBar: () => () => void;
}>({
  hasTopBar: false,
  registerTopBar: () => () => {},
});

export function AccountTopBarPresenceProvider({
  children,
}: {
  children: ReactNode;
}) {
  // Counted rather than flagged, so a remount that overlaps an unmount does
  // not leave the bell hidden for good.
  const [barCount, setBarCount] = useState(0);

  const registerTopBar = useCallback(() => {
    setBarCount((count) => count + 1);
    return () => setBarCount((count) => Math.max(0, count - 1));
  }, []);

  const value = useMemo(
    () => ({ hasTopBar: barCount > 0, registerTopBar }),
    [barCount, registerTopBar],
  );

  return (
    <AccountTopBarPresenceContext.Provider value={value}>
      {children}
    </AccountTopBarPresenceContext.Provider>
  );
}

/** Call from the top bar: it counts as present while mounted. */
export function useRegisterAccountTopBar() {
  const { registerTopBar } = useContext(AccountTopBarPresenceContext);

  useEffect(() => registerTopBar(), [registerTopBar]);
}

export function useHasAccountTopBar() {
  return useContext(AccountTopBarPresenceContext).hasTopBar;
}
