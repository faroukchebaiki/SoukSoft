import type { WorkerProfile } from "@/types";

/**
 * Default worker profile data seeded for account-based workers.
 */
export const ACCOUNT_WORKER_DEFAULTS: Record<string, Partial<WorkerProfile>> = {
  "USR-001": {
    salary: 150000,
    phone: "+213-550-100-001",
    email: "lina@souksoft.dz",
    address: "12 Rue Emir Abdelkader, Algiers",
    jobTitle: "Store Manager",
  },
  "USR-002": {
    salary: 85000,
    phone: "+213-550-200-002",
    email: "karim@souksoft.dz",
    jobTitle: "Senior Seller",
    startDate: "2023-04-10",
  },
  "USR-003": {
    salary: 92000,
    phone: "+213-550-300-003",
    email: "nadia@souksoft.dz",
    jobTitle: "Inventory Lead",
    startDate: "2022-09-01",
  },
};

/**
 * Demo workers that populate an empty worker directory.
 */
export const DEMO_WORKERS: WorkerProfile[] = [
  {
    id: "WRK-DEMO-1",
    firstName: "Yassine",
    lastName: "Boufaroua",
    role: "Inventory",
    jobTitle: "Cleaner",
    salary: 48000,
    startDate: "2023-11-15",
    status: "Active",
    contractType: "Full-time",
    weeklyHours: 40,
    department: "Operations",
    phone: "+213-551-400-010",
    notes: "Keeps backroom tidy and assists with closing.",
    source: "manual",
  },
  {
    id: "WRK-DEMO-2",
    firstName: "Amina",
    lastName: "Hamdi",
    role: "Seller",
    jobTitle: "Cashier",
    salary: 70000,
    startDate: "2024-02-01",
    status: "On leave",
    contractType: "Part-time",
    weeklyHours: 24,
    department: "Frontline",
    phone: "+213-552-222-222",
    emergencyContactName: "Sara Hamdi",
    emergencyContactPhone: "+213-661-222-222",
    notes: "Scheduled to return next month.",
    source: "manual",
  },
  {
    id: "WRK-DEMO-3",
    firstName: "Sofiane",
    lastName: "Kaci",
    role: "Inventory",
    jobTitle: "Stocker",
    salary: 62000,
    startDate: "2023-07-20",
    status: "Active",
    contractType: "Full-time",
    weeklyHours: 42,
    department: "Warehouse",
    phone: "+213-553-333-333",
    emergencyContactName: "Yacine Kaci",
    emergencyContactPhone: "+213-661-333-333",
    notes: "Handles receiving and barcode checks.",
    source: "manual",
  },
  {
    id: "WRK-DEMO-4",
    firstName: "Laila",
    lastName: "Cherif",
    role: "Seller",
    jobTitle: "Supervisor",
    salary: 98000,
    startDate: "2021-12-05",
    status: "Active",
    contractType: "Full-time",
    weeklyHours: 40,
    department: "Frontline",
    phone: "+213-554-444-444",
    email: "laila.cherif@souksoft.dz",
    notes: "Cross-trained on expiring items and counter.",
    source: "manual",
  },
];
