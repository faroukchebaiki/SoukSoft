import { type Dispatch, type SetStateAction, useEffect, useMemo, useRef, useState } from "react";

import { ACCOUNTS_STORAGE_KEY } from "@/constants/storageKeys";
import { userProfiles } from "@/data/mockData";
import { buildAccountRecord, normalizeUsername, validateAccountPayload } from "@/lib/auth";
import type { AccountProfile, CreateAccountPayload, UpdateAccountPayload } from "@/types";

/**
 * Read accounts from localStorage with seeded defaults when missing.
 */
function readStoredAccounts(): AccountProfile[] {
  if (typeof window === "undefined") return userProfiles;
  try {
    const raw = window.localStorage.getItem(ACCOUNTS_STORAGE_KEY);
    if (!raw) {
      window.localStorage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify(userProfiles));
      return userProfiles;
    }
    const parsed = JSON.parse(raw) as AccountProfile[];
    if (!Array.isArray(parsed) || parsed.length === 0) {
      window.localStorage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify(userProfiles));
      return userProfiles;
    }
    return parsed.map((account) => ({
      ...account,
      archived: Boolean(account.archived),
      username: normalizeUsername(account.username),
    }));
  } catch {
    return userProfiles;
  }
}

/**
 * Generate a unique username given an existing account list.
 */
function generateUniqueUsername(base: string, accounts: AccountProfile[]): string {
  const normalizedBase = normalizeUsername(base);
  let username = normalizedBase;
  let suffix = 1;
  while (accounts.some((account) => account.username === username)) {
    username = `${normalizedBase}${suffix++}`;
  }
  return username;
}

/**
 * Ensure the account list always contains at least one manager account.
 */
function ensureManagerPresence(accounts: AccountProfile[]): AccountProfile[] {
  const activeManager = accounts.find((account) => account.role === "Manager" && !account.archived);
  if (activeManager) return accounts;

  const archivedManagerIndex = accounts.findIndex((account) => account.role === "Manager");
  if (archivedManagerIndex >= 0) {
    const next = [...accounts];
    next[archivedManagerIndex] = { ...next[archivedManagerIndex], archived: false };
    return next;
  }

  const username = generateUniqueUsername("manager", accounts);
  const fallbackManager = buildAccountRecord({
    firstName: "Restored",
    lastName: "Manager",
    username,
    password: "password123",
    email: `${username}@souksoft.local`,
    role: "Manager",
  });
  return [...accounts, fallbackManager];
}

/**
 * Hook exposing reusable account state and operations backed by localStorage.
 */
export function useAccounts(): {
  accounts: AccountProfile[];
  hasManager: boolean;
  createAccount: (payload: CreateAccountPayload) => { success: boolean; account?: AccountProfile; error?: string };
  updateAccount: (payload: UpdateAccountPayload) => { success: boolean; error?: string };
  archiveAccount: (id: string, archived: boolean) => void;
  deleteAccount: (id: string) => { success: boolean; error?: string };
  setAccounts: Dispatch<SetStateAction<AccountProfile[]>>;
} {
  const initialAccountsRef = useRef<AccountProfile[]>(readStoredAccounts());
  const [accounts, setAccounts] = useState<AccountProfile[]>(initialAccountsRef.current);

  useEffect(() => {
    setAccounts((previous) => ensureManagerPresence(previous));
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify(accounts));
  }, [accounts]);

  const hasManager = useMemo(
    () => accounts.some((account) => account.role === "Manager" && !account.archived),
    [accounts],
  );

  const createAccount = (payload: CreateAccountPayload) => {
    const validation = validateAccountPayload(payload);
    if (!validation.success) return validation;
    const normalizedUsername = normalizeUsername(payload.username);
    if (accounts.some((account) => account.username === normalizedUsername)) {
      return { success: false, error: "Username already exists." };
    }
    const newAccount = buildAccountRecord({ ...payload, username: normalizedUsername });
    setAccounts((previous) => [...previous, newAccount]);
    return { success: true, account: newAccount };
  };

  const updateAccount = (payload: UpdateAccountPayload) => {
    const validation = validateAccountPayload(payload);
    if (!validation.success) return validation;
    const normalizedUsername = normalizeUsername(payload.username);
    if (
      accounts.some(
        (account) => account.username === normalizedUsername && account.id !== payload.id,
      )
    ) {
      return { success: false, error: "Username already exists." };
    }
    setAccounts((previous) =>
      previous.map((account) =>
        account.id === payload.id
          ? buildAccountRecord({
              id: payload.id,
              archived: account.archived,
              firstName: payload.firstName,
              lastName: payload.lastName,
              username: normalizedUsername,
              email: payload.email,
              role: payload.role,
              password: payload.password,
              shift: payload.shift,
            })
          : account,
      ),
    );
    return { success: true };
  };

  const archiveAccount = (id: string, archived: boolean) => {
    setAccounts((previous) =>
      previous.map((account) => {
        if (account.id !== id) return account;
        if (account.role === "Manager" && archived) return account;
        return { ...account, archived };
      }),
    );
  };

  const deleteAccount = (id: string) => {
    const target = accounts.find((account) => account.id === id);
    if (!target) return { success: false, error: "Account not found." };
    if (target.role === "Manager") {
      return { success: false, error: "Manager accounts cannot be deleted." };
    }
    setAccounts((previous) => previous.filter((account) => account.id !== id));
    return { success: true };
  };

  return { accounts, hasManager, createAccount, updateAccount, archiveAccount, deleteAccount, setAccounts };
}
