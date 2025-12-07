import { useCallback, useEffect, useMemo, useState } from "react";

import { getAllowedSections } from "@/constants/permissions";
import { USER_STORAGE_KEY } from "@/constants/storageKeys";
import type { AccountProfile, Section } from "@/types";

/**
 * Resolve a stored user id if it exists and still belongs to the account list.
 */
function resolveStoredUserId(accounts: AccountProfile[], fallbackUserId: string | null): string | null {
  if (typeof window === "undefined") return fallbackUserId;
  const stored = window.localStorage.getItem(USER_STORAGE_KEY);
  if (stored && accounts.some((user) => user.id === stored && !user.archived)) return stored;
  return fallbackUserId;
}

function pickActiveAccountId(
  accounts: AccountProfile[],
  candidates: Array<string | null>,
  fallbackUserId: string | null,
): string | null {
  for (const id of candidates) {
    if (!id) continue;
    const match = accounts.find((account) => account.id === id && !account.archived);
    if (match) return match.id;
  }
  if (fallbackUserId) {
    const fallback = accounts.find((account) => account.id === fallbackUserId && !account.archived);
    if (fallback) return fallback.id;
  }
  const firstActive = accounts.find((account) => !account.archived);
  return firstActive ? firstActive.id : null;
}

/**
 * Keep track of the active user identity and allowed sections with localStorage sync.
 */
export function useActiveUser(accounts: AccountProfile[], fallbackUserId: string | null): {
  activeUserId: string | null;
  setActiveUserId: (id: string | null) => void;
  activeUser: AccountProfile | null;
  allowedSections: Section[];
} {
  const [activeUserId, setActiveUserId] = useState<string | null>(() => {
    const stored = resolveStoredUserId(accounts, fallbackUserId);
    return pickActiveAccountId(accounts, [stored], fallbackUserId);
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (activeUserId) {
      window.localStorage.setItem(USER_STORAGE_KEY, activeUserId);
    } else {
      window.localStorage.removeItem(USER_STORAGE_KEY);
    }
  }, [activeUserId]);

  useEffect(() => {
    setActiveUserId((previous) => pickActiveAccountId(accounts, [previous], fallbackUserId));
  }, [accounts, fallbackUserId]);

  const safeSetActiveUserId = useCallback(
    (id: string | null) => {
      setActiveUserId((previous) => pickActiveAccountId(accounts, [id, previous], fallbackUserId));
    },
    [accounts, fallbackUserId],
  );

  const activeUser = useMemo(
    () => accounts.find((user) => user.id === activeUserId) ?? null,
    [accounts, activeUserId],
  );

  const allowedSections = useMemo(
    () => (activeUser ? getAllowedSections(activeUser.role) : []),
    [activeUser],
  );

  return { activeUserId, setActiveUserId: safeSetActiveUserId, activeUser, allowedSections };
}
