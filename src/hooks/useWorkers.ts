import { useEffect, useState } from "react";

import { ACCOUNT_WORKER_DEFAULTS, DEMO_WORKERS } from "@/constants/workers";
import { WORKERS_STORAGE_KEY } from "@/constants/storageKeys";
import type { AccountProfile, WorkerProfile } from "@/types";

/**
 * Load workers from localStorage with demo data as a fallback.
 */
function readStoredWorkers(): WorkerProfile[] {
  if (typeof window === "undefined") return DEMO_WORKERS;
  try {
    const raw = window.localStorage.getItem(WORKERS_STORAGE_KEY);
    if (!raw) return DEMO_WORKERS;
    const parsed = JSON.parse(raw) as WorkerProfile[];
    if (!Array.isArray(parsed)) return DEMO_WORKERS;
    return parsed.map((worker) => ({
      ...worker,
      contractType: worker.contractType ?? "Full-time",
      weeklyHours: worker.weeklyHours ?? 40,
      jobTitle: worker.jobTitle ?? worker.role,
    }));
  } catch {
    return DEMO_WORKERS;
  }
}

/**
 * Keep account-sourced workers aligned with the latest account records.
 */
function syncWorkersWithAccounts(workers: WorkerProfile[], accounts: AccountProfile[]): WorkerProfile[] {
  const existingMap = new Map(workers.map((worker) => [worker.id, worker]));
  const next: WorkerProfile[] = [];
  accounts.forEach((account) => {
    const found = existingMap.get(account.id);
    const defaults = ACCOUNT_WORKER_DEFAULTS[account.id] ?? {};
    next.push({
      id: account.id,
      firstName: account.firstName,
      lastName: account.lastName,
      role: account.role,
      salary: found?.salary ?? defaults.salary ?? 0,
      startDate: found?.startDate ?? defaults.startDate ?? new Date().toISOString().slice(0, 10),
      status: found?.status ?? "Active",
      jobTitle: found?.jobTitle ?? defaults.jobTitle ?? account.role,
      email: found?.email ?? defaults.email ?? account.email,
      address: found?.address ?? defaults.address ?? "",
      birthDate: found?.birthDate ?? "",
      emergencyContactName: found?.emergencyContactName ?? "",
      emergencyContactPhone: found?.emergencyContactPhone ?? "",
      contractType: found?.contractType ?? defaults.contractType ?? "Full-time",
      weeklyHours: found?.weeklyHours ?? defaults.weeklyHours ?? 40,
      department: found?.department ?? defaults.department ?? "Frontline",
      phone: found?.phone ?? defaults.phone ?? "",
      notes: found?.notes ?? "",
      photoData: found?.photoData,
      source: "account",
    });
    existingMap.delete(account.id);
  });
  existingMap.forEach((worker) => {
    if (worker.source === "manual") next.push(worker);
  });
  return next;
}

/**
 * Hook that exposes worker directory state with storage-backed persistence.
 */
export function useWorkers(accounts: AccountProfile[]): {
  workers: WorkerProfile[];
  upsertWorker: (worker: WorkerProfile) => void;
  deleteWorker: (id: string) => void;
} {
  const [workers, setWorkers] = useState<WorkerProfile[]>(() => readStoredWorkers());

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(WORKERS_STORAGE_KEY, JSON.stringify(workers));
  }, [workers]);

  useEffect(() => {
    setWorkers((previous) => syncWorkersWithAccounts(previous, accounts));
  }, [accounts]);

  const upsertWorker = (worker: WorkerProfile) => {
    setWorkers((previous) => {
      const exists = previous.some((entry) => entry.id === worker.id);
      if (exists) {
        return previous.map((entry) => (entry.id === worker.id ? worker : entry));
      }
      return [...previous, worker];
    });
  };

  const deleteWorker = (id: string) => {
    setWorkers((previous) => previous.filter((worker) => worker.id !== id));
  };

  return { workers, upsertWorker, deleteWorker };
}
