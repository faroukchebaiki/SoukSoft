import type {
  AccountProfile,
  CreateAccountPayload,
  LoginPayload,
  RegisterPayload,
  UserRole,
} from "@/types";

const DEFAULT_SHIFT = "08:00 - 16:00";

/**
 * Normalize usernames to a consistent lowercase, trimmed form.
 */
export function normalizeUsername(username: string): string {
  return username.trim().toLowerCase();
}

/**
 * Build a fully shaped account record from partial payload data.
 */
export function buildAccountRecord(payload: {
  id?: string;
  firstName: string;
  lastName: string;
  username: string;
  password: string;
  email: string;
  role: UserRole;
  shift?: string;
  archived?: boolean;
}): AccountProfile {
  const firstName = payload.firstName.trim();
  const lastName = payload.lastName.trim();
  const username = normalizeUsername(payload.username);
  return {
    id: payload.id ?? crypto.randomUUID?.() ?? `USR-${Date.now()}`,
    firstName,
    lastName,
    username,
    password: payload.password,
    name: `${firstName} ${lastName}`.trim(),
    role: payload.role,
    email: payload.email.trim(),
    avatarInitials: `${firstName[0] ?? ""}${lastName[0] ?? ""}`.toUpperCase(),
    shift: payload.shift || DEFAULT_SHIFT,
    archived: Boolean(payload.archived),
  };
}

/**
 * Validate login credentials against available accounts.
 */
export function validateLogin(
  accounts: AccountProfile[],
  payload: LoginPayload,
): { success: boolean; account?: AccountProfile; error?: string } {
  const normalized = normalizeUsername(payload.username);
  const account = accounts.find(
    (user) => user.username.toLowerCase() === normalized && user.password === payload.password,
  );
  if (!account) return { success: false, error: "Invalid username or password." };
  if (account.archived) return { success: false, error: "This account is archived." };
  return { success: true, account };
}

/**
 * Build a manager account during the registration flow.
 */
export function buildManagerRegistration(payload: RegisterPayload): AccountProfile {
  return buildAccountRecord({
    firstName: payload.firstName,
    lastName: payload.lastName,
    username: payload.username,
    password: payload.password,
    email: `${normalizeUsername(payload.username)}@souksoft.local`,
    role: "Manager",
  });
}

/**
 * Quick field-level validation for account creation/update operations.
 */
export function validateAccountPayload(
  payload: CreateAccountPayload,
): { success: boolean; error?: string } {
  if (!payload.firstName.trim() || !payload.lastName.trim()) {
    return { success: false, error: "Please provide a first and last name." };
  }
  if (!payload.username.trim() || !payload.email.trim()) {
    return { success: false, error: "Username and email are required." };
  }
  if (!payload.password) {
    return { success: false, error: "A password is required." };
  }
  return { success: true };
}
