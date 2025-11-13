import type { AuditLogEntry } from "@/types";

export const AUDIT_STORAGE_KEY = "souksoft-audit-log";
export const AUDIT_LOG_EVENT = "souksoft:audit-log-updated";
const MAX_AUDIT_LOG_ENTRIES = 200;

function isBrowser() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

export function getAuditLog(): AuditLogEntry[] {
  if (!isBrowser()) return [];
  try {
    const raw = window.localStorage.getItem(AUDIT_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as AuditLogEntry[];
    if (Array.isArray(parsed)) {
      return parsed;
    }
    return [];
  } catch {
    return [];
  }
}

function persistAuditLog(entries: AuditLogEntry[]) {
  if (!isBrowser()) return;
  window.localStorage.setItem(AUDIT_STORAGE_KEY, JSON.stringify(entries.slice(0, MAX_AUDIT_LOG_ENTRIES)));
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(AUDIT_LOG_EVENT));
  }
}

export interface AuditLogInput {
  action: AuditLogEntry["action"];
  actor: string;
  summary: string;
  details?: string[];
}

export function logAuditEvent(input: AuditLogInput) {
  if (!isBrowser()) return;
  const entry: AuditLogEntry = {
    id: crypto.randomUUID?.() ?? `AUD-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    timestamp: new Date().toISOString(),
    ...input,
  };
  const existing = getAuditLog();
  persistAuditLog([entry, ...existing]);
}

export function clearAuditLog() {
  if (!isBrowser()) return;
  window.localStorage.removeItem(AUDIT_STORAGE_KEY);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(AUDIT_LOG_EVENT));
  }
}
