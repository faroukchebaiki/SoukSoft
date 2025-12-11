import { Home, ReceiptText, Trash2, X } from "lucide-react";
import { Fragment, type FormEvent, useCallback, useEffect, useMemo, useState } from "react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/format";
import { logAuditEvent } from "@/lib/auditLog";
import {
  getStoredPurchaseHistory,
  persistPurchaseHistory,
  PURCHASE_HISTORY_EVENT,
  PURCHASE_HISTORY_STORAGE_KEY,
} from "@/lib/purchaseHistoryStorage";
import type { PurchaseHistoryEntry } from "@/types";

interface EditReceiptFormState {
  cashier: string;
  customerName: string;
  customerId: string;
  completedAt: string;
  total: string;
  notes: string;
}

const emptyEditForm: EditReceiptFormState = {
  cashier: "",
  customerName: "",
  customerId: "",
  completedAt: "",
  total: "",
  notes: "",
};

interface PurchaseHistoryProps {
  entries: PurchaseHistoryEntry[];
  onGoHome?: () => void;
}

export function PurchaseHistory({ entries, onGoHome }: PurchaseHistoryProps) {
  const [historyEntries, setHistoryEntries] = useState(() => getStoredPurchaseHistory(entries));
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<EditReceiptFormState>(emptyEditForm);
  const [filters, setFilters] = useState<{
    query: string;
    cashier: string;
    client: string;
    payment: string;
    dateFrom: string;
    dateTo: string;
    hourFrom: string;
    hourTo: string;
    minTotal: string;
    maxTotal: string;
  }>({
    query: "",
    cashier: "",
    client: "",
    payment: "",
    dateFrom: "",
    dateTo: "",
    hourFrom: "",
    hourTo: "",
    minTotal: "",
    maxTotal: "",
  });

  useEffect(() => {
    const syncHistory = () => setHistoryEntries(getStoredPurchaseHistory(entries));
    syncHistory();
    const handleStorage = (event: StorageEvent) => {
      if (event.key === PURCHASE_HISTORY_STORAGE_KEY) {
        syncHistory();
      }
    };
    window.addEventListener(PURCHASE_HISTORY_EVENT, syncHistory);
    window.addEventListener("storage", handleStorage);
    return () => {
      window.removeEventListener(PURCHASE_HISTORY_EVENT, syncHistory);
      window.removeEventListener("storage", handleStorage);
    };
  }, [entries]);

  useEffect(() => {
    if (!onGoHome) return;
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !event.metaKey && !event.ctrlKey && !event.altKey) {
        event.preventDefault();
        onGoHome();
      }
    };

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [onGoHome]);

  const selectedEntry = useMemo(
    () => historyEntries.find((entry) => entry.id === selectedEntryId) ?? null,
    [historyEntries, selectedEntryId],
  );

  const orderedEntries = useMemo(() => {
    return [...historyEntries].sort((a, b) => {
      const timeDiff = b.completedAt.localeCompare(a.completedAt);
      if (timeDiff !== 0) return timeDiff;
      return b.id.localeCompare(a.id);
    });
  }, [historyEntries]);

  const lineSubtotal = useMemo(() => {
    if (!selectedEntry) return 0;
    if (!selectedEntry.lineItems) return selectedEntry.total;
    return selectedEntry.lineItems.reduce((sum, item) => sum + item.price * item.qty, 0);
  }, [selectedEntry]);

  useEffect(() => {
    if (!selectedEntry) {
      setEditForm(emptyEditForm);
      return;
    }
    setEditForm({
      cashier: selectedEntry.cashier,
      customerName: selectedEntry.customerName ?? "",
      customerId: selectedEntry.customerId ?? "",
      completedAt: selectedEntry.completedAt,
      total: String(selectedEntry.total),
      notes: selectedEntry.notes ?? "",
    });
  }, [selectedEntry]);

  const parsedEditTotal = useMemo(() => {
    const parsed = Number.parseFloat(editForm.total);
    if (editForm.total.trim() === "") return null;
    if (!Number.isFinite(parsed) || parsed < 0) return null;
    return parsed;
  }, [editForm.total]);

  const displayedTotal = selectedEntry ? parsedEditTotal ?? selectedEntry.total : 0;
  const displayedAdjustment = displayedTotal - lineSubtotal;

  const totalCollected = historyEntries.reduce((sum, entry) => sum + entry.total, 0);
  const todayTotal = totalCollected;
  const todayAverage = historyEntries.length > 0 ? todayTotal / historyEntries.length : 0;
  const todayLabel = useMemo(() => {
    return new Date().toLocaleDateString("fr-DZ", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }, []);

  const resolveDateLabel = useCallback(
    (value: string) => {
      const trimmed = value.trim();
      const parsedFull = Date.parse(trimmed);
      if (Number.isFinite(parsedFull)) {
        return new Date(parsedFull).toLocaleDateString("fr-DZ", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        });
      }
      const datePart = trimmed.split(" ")[0];
      const parsedDate = Date.parse(datePart);
      if (Number.isFinite(parsedDate)) {
        return new Date(parsedDate).toLocaleDateString("fr-DZ", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        });
      }
      return todayLabel;
    },
    [todayLabel],
  );

  const formatHour = useCallback((value: string) => {
    const match = value.trim().match(/(\d{1,2}:\d{2})/);
    return match ? match[1] : value;
  }, []);

  const parseEntryDateTime = useCallback(
    (entry: PurchaseHistoryEntry) => {
      const hourText = formatHour(entry.completedAt);
      const [maybeDate] = entry.completedAt.split(" ");
      const safeDate = /^\d{4}-\d{2}-\d{2}$/.test(maybeDate) ? maybeDate : new Date().toISOString().slice(0, 10);
      return new Date(`${safeDate}T${hourText.length === 5 ? hourText : "00:00"}:00`);
    },
    [formatHour],
  );

  const filteredEntries = useMemo(() => {
    const dateFrom = filters.dateFrom ? new Date(`${filters.dateFrom}T00:00:00`) : null;
    const dateTo = filters.dateTo ? new Date(`${filters.dateTo}T23:59:59`) : null;
    const hourFrom = filters.hourFrom ? filters.hourFrom.split(":").map(Number) : null;
    const hourTo = filters.hourTo ? filters.hourTo.split(":").map(Number) : null;
    const minTotal = filters.minTotal ? Number.parseFloat(filters.minTotal) : null;
    const maxTotal = filters.maxTotal ? Number.parseFloat(filters.maxTotal) : null;
    const query = filters.query.trim().toLowerCase();

    return orderedEntries.filter((entry) => {
      const dt = parseEntryDateTime(entry);
      if (dateFrom && dt < dateFrom) return false;
      if (dateTo && dt > dateTo) return false;

      const minutes = dt.getHours() * 60 + dt.getMinutes();
      if (hourFrom && hourFrom.length === 2) {
        const target = (hourFrom[0] ?? 0) * 60 + (hourFrom[1] ?? 0);
        if (minutes < target) return false;
      }
      if (hourTo && hourTo.length === 2) {
        const target = (hourTo[0] ?? 0) * 60 + (hourTo[1] ?? 0);
        if (minutes > target) return false;
      }

      if (minTotal !== null && Number.isFinite(minTotal) && entry.total < minTotal) return false;
      if (maxTotal !== null && Number.isFinite(maxTotal) && entry.total > maxTotal) return false;

      if (filters.cashier && entry.cashier !== filters.cashier) return false;
      if (filters.payment && entry.paymentMethod !== filters.payment) return false;
      if (filters.client) {
        const clientName = entry.customerName ?? "Client de passage";
        if (!clientName.toLowerCase().includes(filters.client.toLowerCase())) return false;
      }

      if (query) {
        const target = `${entry.id} ${entry.cashier} ${entry.customerName ?? ""} ${entry.notes ?? ""}`.toLowerCase();
        if (!target.includes(query)) return false;
      }

      return true;
    });
  }, [filters, orderedEntries, parseEntryDateTime]);

  const filteredIndexMap = useMemo(() => {
    const map = new Map<string, number>();
    for (let index = 0; index < filteredEntries.length; index += 1) {
      map.set(filteredEntries[index]?.id, index);
    }
    return map;
  }, [filteredEntries]);

  const filteredDateGroups = useMemo(() => {
    const groups: Array<{ label: string; entries: PurchaseHistoryEntry[] }> = [];
    filteredEntries.forEach((entry) => {
      const label = resolveDateLabel(entry.completedAt);
      const last = groups[groups.length - 1];
      if (last && last.label === label) {
        last.entries.push(entry);
      } else {
        groups.push({ label, entries: [entry] });
      }
    });
    return groups;
  }, [filteredEntries, resolveDateLabel]);

  const cashiers = useMemo(
    () => Array.from(new Set(historyEntries.map((entry) => entry.cashier))),
    [historyEntries],
  );
  const paymentMethods = useMemo(
    () => Array.from(new Set(historyEntries.map((entry) => entry.paymentMethod))),
    [historyEntries],
  );

  const handleSelectEntry = (entry: PurchaseHistoryEntry) => {
    setSelectedEntryId(entry.id);
  };

  const handleEditFormChange = (key: keyof EditReceiptFormState, value: string) => {
    setEditForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleCloseDetail = () => {
    setSelectedEntryId(null);
  };

  const handleUpdateEntry = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedEntry) return;
    const totalValue = parsedEditTotal ?? selectedEntry.total;
    setHistoryEntries((prev) => {
      const next = prev.map((entry) =>
        entry.id === selectedEntry.id
          ? {
              ...entry,
              cashier: editForm.cashier || entry.cashier,
              customerName: editForm.customerName || undefined,
              customerId: editForm.customerId || undefined,
              completedAt: editForm.completedAt || entry.completedAt,
              total: totalValue,
              notes: editForm.notes || undefined,
            }
          : entry,
      );
      persistPurchaseHistory(next);
      return next;
    });
    logAuditEvent({
      action: "update",
      actor: editForm.cashier || selectedEntry.cashier,
      summary: `Ticket ${selectedEntry.id} mis à jour`,
      details: [
        `Total: ${formatCurrency(totalValue)}`,
        `Client: ${editForm.customerName || selectedEntry.customerName || "Client de passage"}`,
      ],
    });
    handleCloseDetail();
  };

  const handleDeleteEntry = () => {
    if (!selectedEntry) return;
    setHistoryEntries((prev) => {
      const next = prev.filter((entry) => entry.id !== selectedEntry.id);
      persistPurchaseHistory(next);
      return next;
    });
    logAuditEvent({
      action: "delete",
      actor: selectedEntry.cashier,
      summary: `Ticket ${selectedEntry.id} supprimé`,
      details: [`Total: ${formatCurrency(selectedEntry.total)}`],
    });
    handleCloseDetail();
  };

  return (
    <main className="page-shell flex h-screen flex-1 flex-col overflow-hidden px-6 pt-6 pb-4 lg:px-8">
      <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Historique</h1>
          <p className="text-sm text-muted-foreground">
            Chaque vente enregistrée avec horodatage, moyen de paiement et notes du caissier.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="secondary" className="gap-2 rounded-full" onClick={onGoHome}>
            <Home className="h-4 w-4" />
            Home (Esc)
          </Button>
        </div>
      </header>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-3 px-4 py-2">
            <CardTitle className="whitespace-nowrap">Total encaissé</CardTitle>
            <span className="text-2xl font-semibold tracking-tight">
              {formatCurrency(totalCollected)}
            </span>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-3 px-4 py-2">
            <CardTitle className="whitespace-nowrap">Total encaissé aujourd&apos;hui</CardTitle>
            <span className="text-2xl font-semibold tracking-tight">
              {historyEntries.length > 0 ? formatCurrency(todayTotal) : "—"}
            </span>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-3 px-4 py-2">
            <CardTitle className="whitespace-nowrap">Moyenne du jour</CardTitle>
            <span className="text-2xl font-semibold tracking-tight">
              {historyEntries.length > 0 ? formatCurrency(todayAverage) : "—"}
            </span>
          </CardHeader>
        </Card>
      </div>

      <Card className="mt-4 flex min-h-0 flex-col">
        <CardHeader className="pb-3">
          <div className="flex items-start gap-3">
            <div className="mt-1 hidden h-9 w-9 items-center justify-center rounded-xl bg-muted/70 text-muted-foreground sm:flex">
              <ReceiptText className="h-4 w-4" />
            </div>
            <div className="flex-1">
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                <label className="flex flex-col gap-1 text-xs">
                  <span className="font-medium text-muted-foreground">Recherche</span>
                  <input
                    className="rounded-lg border bg-background px-3 py-2 text-sm"
                    placeholder="Ticket, client, note..."
                    value={filters.query}
                    onChange={(event) => setFilters((prev) => ({ ...prev, query: event.target.value }))}
                  />
                </label>
                <label className="flex flex-col gap-1 text-xs">
                  <span className="font-medium text-muted-foreground">Caissier</span>
                  <select
                    className="rounded-lg border bg-background px-3 py-2 text-sm"
                    value={filters.cashier}
                    onChange={(event) => setFilters((prev) => ({ ...prev, cashier: event.target.value }))}
                  >
                    <option value="">Tous</option>
                    {cashiers.map((name) => (
                      <option key={name} value={name}>
                        {name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex flex-col gap-1 text-xs">
                  <span className="font-medium text-muted-foreground">Client</span>
                  <input
                    className="rounded-lg border bg-background px-3 py-2 text-sm"
                    placeholder="Nom client"
                    value={filters.client}
                    onChange={(event) => setFilters((prev) => ({ ...prev, client: event.target.value }))}
                  />
                </label>
                <label className="flex flex-col gap-1 text-xs">
                  <span className="font-medium text-muted-foreground">Paiement</span>
                  <select
                    className="rounded-lg border bg-background px-3 py-2 text-sm"
                    value={filters.payment}
                    onChange={(event) => setFilters((prev) => ({ ...prev, payment: event.target.value }))}
                  >
                    <option value="">Tous</option>
                    {paymentMethods.map((method) => (
                      <option key={method} value={method}>
                        {method}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <label className="flex flex-col gap-1 text-xs">
                    <span className="font-medium text-muted-foreground">Date de</span>
                    <input
                      type="date"
                      className="rounded-lg border bg-background px-3 py-2 text-sm"
                      value={filters.dateFrom}
                      onChange={(event) => setFilters((prev) => ({ ...prev, dateFrom: event.target.value }))}
                    />
                  </label>
                  <label className="flex flex-col gap-1 text-xs">
                    <span className="font-medium text-muted-foreground">Date à</span>
                    <input
                      type="date"
                      className="rounded-lg border bg-background px-3 py-2 text-sm"
                      value={filters.dateTo}
                      onChange={(event) => setFilters((prev) => ({ ...prev, dateTo: event.target.value }))}
                    />
                  </label>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <label className="flex flex-col gap-1 text-xs">
                    <span className="font-medium text-muted-foreground">Heure de</span>
                    <input
                      type="time"
                      className="rounded-lg border bg-background px-3 py-2 text-sm"
                      value={filters.hourFrom}
                      onChange={(event) => setFilters((prev) => ({ ...prev, hourFrom: event.target.value }))}
                    />
                  </label>
                  <label className="flex flex-col gap-1 text-xs">
                    <span className="font-medium text-muted-foreground">Heure à</span>
                    <input
                      type="time"
                      className="rounded-lg border bg-background px-3 py-2 text-sm"
                      value={filters.hourTo}
                      onChange={(event) => setFilters((prev) => ({ ...prev, hourTo: event.target.value }))}
                    />
                  </label>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <label className="flex flex-col gap-1 text-xs">
                    <span className="font-medium text-muted-foreground">Total min</span>
                    <input
                      type="number"
                      min="0"
                      className="rounded-lg border bg-background px-3 py-2 text-sm"
                      value={filters.minTotal}
                      onChange={(event) => setFilters((prev) => ({ ...prev, minTotal: event.target.value }))}
                    />
                  </label>
                  <label className="flex flex-col gap-1 text-xs">
                    <span className="font-medium text-muted-foreground">Total max</span>
                    <input
                      type="number"
                      min="0"
                      className="rounded-lg border bg-background px-3 py-2 text-sm"
                      value={filters.maxTotal}
                      onChange={(event) => setFilters((prev) => ({ ...prev, maxTotal: event.target.value }))}
                    />
                  </label>
                </div>
                <div className="flex items-end">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() =>
                      setFilters({
                        query: "",
                        cashier: "",
                        client: "",
                        payment: "",
                        dateFrom: "",
                        dateTo: "",
                        hourFrom: "",
                        hourTo: "",
                        minTotal: "",
                        maxTotal: "",
                      })
                    }
                  >
                    Réinitialiser
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex min-h-0 flex-1 flex-col rounded-md border p-0">
          <div className="flex min-h-0 flex-1 flex-col">
            <div className="flex-1 overflow-auto">
              <table className="min-w-full border border-border border-separate border-spacing-0 text-sm">
                <thead className="sticky top-0 z-10 bg-muted/50 text-left text-xs uppercase text-muted-foreground backdrop-blur">
                  <tr>
                    <th className="border border-border px-3 py-2 font-medium">Ticket</th>
                    <th className="border border-border px-3 py-2 text-center font-medium">Panier</th>
                    <th className="border border-border px-3 py-2 font-medium">Caissier</th>
                    <th className="border border-border px-3 py-2 font-medium">Client</th>
                    <th className="border border-border px-3 py-2 text-right font-medium">Articles</th>
                    <th className="border border-border px-3 py-2 text-right font-medium">Total</th>
                    <th className="border border-border px-3 py-2 text-right font-medium">Heure</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEntries.length === 0 ? (
                    <tr>
                      <td
                        className="border border-border px-4 py-6 text-center text-sm text-muted-foreground"
                        colSpan={7}
                      >
                        Aucun ticket pour le moment.
                      </td>
                    </tr>
                  ) : (
                    filteredDateGroups.map((group) => (
                      <Fragment key={group.label}>
                        <tr
                          className="sticky top-9 z-30 bg-muted text-foreground shadow-sm"
                          aria-label={`Tickets du ${group.label}`}
                        >
                          <td
                            colSpan={7}
                            className="relative border border-border bg-muted px-3 py-2 before:absolute before:inset-0 before:bg-muted before:content-['']"
                          >
                            <div className="relative z-10 flex items-center gap-3 text-[11px] uppercase tracking-[0.25em]">
                              <span className="h-[2px] flex-1 rounded-full bg-border" aria-hidden="true" />
                              <span className="rounded-full border border-border/70 bg-card px-3 py-1 text-foreground">
                                {group.label}
                              </span>
                              <span className="h-[2px] flex-1 rounded-full bg-border" aria-hidden="true" />
                            </div>
                          </td>
                        </tr>
                        {group.entries.map((entry, index) => {
                          const position = filteredIndexMap.get(entry.id) ?? index;
                          const basketNumber = filteredEntries.length - position;
                          return (
                            <tr
                              key={entry.id}
                              className="cursor-pointer transition-colors hover:bg-muted/40"
                              onClick={() => handleSelectEntry(entry)}
                            >
                              <td className="border border-border px-3 py-2 font-semibold">{entry.id}</td>
                              <td className="border border-border px-3 py-2 text-center text-muted-foreground">
                                {basketNumber}
                              </td>
                              <td className="border border-border px-3 py-2">{entry.cashier}</td>
                              <td className="border border-border px-3 py-2 text-muted-foreground">
                                {entry.customerName ?? "Client de passage"}
                              </td>
                              <td className="border border-border px-3 py-2 text-right">{entry.items}</td>
                              <td className="border border-border px-3 py-2 text-right font-semibold">
                                {formatCurrency(entry.total)}
                              </td>
                              <td className="border border-border px-3 py-2 text-right">
                                {formatHour(entry.completedAt)}
                              </td>
                            </tr>
                          );
                        })}
                      </Fragment>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </CardContent>
      </Card>

      {selectedEntry ? (
        <div className="fixed inset-0 z-50 flex items-stretch justify-end bg-black/70">
          <div className="flex h-full w-full max-w-5xl">
            <Card className="flex h-full flex-1 flex-col rounded-none rounded-l-[2rem]">
              <CardHeader className="flex flex-col gap-4 pb-0 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <CardTitle className="text-2xl">
                    Ticket {selectedEntry.id}
                  </CardTitle>
                  <CardDescription>
                    Enregistré à {selectedEntry.completedAt} · Vendu par {selectedEntry.cashier}
                  </CardDescription>
                </div>
                <Button variant="ghost" onClick={handleCloseDetail} className="gap-2">
                  <X className="h-4 w-4" />
                  Fermer
                </Button>
              </CardHeader>
              <CardContent className="flex-1 space-y-6 overflow-y-auto pt-6 pr-1">
                <div className="flex flex-col gap-6 lg:flex-row">
                  <section className="flex-1 space-y-6">
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      <div className="rounded-2xl border bg-card/60 p-4">
                        <p className="text-xs uppercase text-muted-foreground">Client</p>
                        <p className="text-base font-semibold text-card-foreground">
                          {selectedEntry.customerName ?? "Client de passage"}
                        </p>
                        {selectedEntry.customerId ? (
                          <p className="text-xs text-muted-foreground">
                            ID : {selectedEntry.customerId}
                          </p>
                        ) : null}
                      </div>
                      <div className="rounded-2xl border bg-card/60 p-4">
                        <p className="text-xs uppercase text-muted-foreground">Articles</p>
                        <p className="text-base font-semibold text-card-foreground">
                          {selectedEntry.items}
                        </p>
                      </div>
                      <div className="rounded-2xl border bg-card/60 p-4">
                        <p className="text-xs uppercase text-muted-foreground">Total</p>
                        <p className="text-base font-semibold text-card-foreground">
                          {formatCurrency(displayedTotal)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Δ {formatCurrency(displayedAdjustment)}
                        </p>
                      </div>
                    </div>

                    <div className="rounded-2xl border">
                      <div className="flex items-center justify-between border-b px-4 py-2 text-xs uppercase text-muted-foreground">
                        <span>Lignes d&apos;article</span>
                        <span>{selectedEntry.lineItems?.length ?? 0} entrées</span>
                      </div>
                      <div className="max-h-[45vh] overflow-auto">
                        <table className="min-w-full text-sm">
                          <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
                            <tr>
                              <th className="px-4 py-2 text-left font-medium">Article</th>
                              <th className="px-4 py-2 text-left font-medium">SKU</th>
                              <th className="px-4 py-2 text-right font-medium">Qté</th>
                              <th className="px-4 py-2 text-right font-medium">Prix</th>
                              <th className="px-4 py-2 text-right font-medium">Total ligne</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border bg-background">
                            {(selectedEntry.lineItems ?? []).map((item) => {
                              const lineTotal = item.qty * item.price;
                              return (
                                <tr key={`${selectedEntry.id}-${item.sku}`}>
                                  <td className="px-4 py-3 font-medium">{item.name}</td>
                                  <td className="px-4 py-3 text-muted-foreground">{item.sku}</td>
                                  <td className="px-4 py-3 text-right">
                                    {item.qty} {item.unit}
                                  </td>
                                  <td className="px-4 py-3 text-right">
                                    {formatCurrency(item.price)}
                                  </td>
                                  <td className="px-4 py-3 text-right font-semibold">
                                    {formatCurrency(lineTotal)}
                                  </td>
                                </tr>
                              );
                            })}
                            {(selectedEntry.lineItems?.length ?? 0) === 0 ? (
                              <tr>
                                <td
                                  className="px-4 py-4 text-center text-muted-foreground"
                                  colSpan={5}
                                >
                                  Aucune ligne enregistrée pour ce ticket.
                                </td>
                              </tr>
                            ) : null}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </section>

                  <form
                    className="flex-shrink-0 space-y-4 rounded-2xl border bg-card/60 p-4 lg:w-[360px]"
                    onSubmit={handleUpdateEntry}
                  >
                    <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
                      Gérer le ticket
                    </p>
                    <div className="grid gap-4">
                      <label className="text-sm font-medium">
                        Caissier
                        <input
                          className="mt-1 w-full rounded-xl border bg-background px-3 py-2 text-sm"
                          value={editForm.cashier}
                          onChange={(event) => handleEditFormChange("cashier", event.target.value)}
                        />
                      </label>
                      <label className="text-sm font-medium">
                        Nom client
                        <input
                          className="mt-1 w-full rounded-xl border bg-background px-3 py-2 text-sm"
                          value={editForm.customerName}
                          onChange={(event) =>
                            handleEditFormChange("customerName", event.target.value)
                          }
                        />
                      </label>
                      <label className="text-sm font-medium">
                        ID client
                        <input
                          className="mt-1 w-full rounded-xl border bg-background px-3 py-2 text-sm"
                          value={editForm.customerId}
                          onChange={(event) =>
                            handleEditFormChange("customerId", event.target.value)
                          }
                        />
                      </label>
                      <label className="text-sm font-medium">
                        Heure
                        <input
                          className="mt-1 w-full rounded-xl border bg-background px-3 py-2 text-sm"
                          value={editForm.completedAt}
                          onChange={(event) =>
                            handleEditFormChange("completedAt", event.target.value)
                          }
                        />
                      </label>
                      <label className="text-sm font-medium">
                        Montant total (DA)
                        <input
                          type="number"
                          min="0"
                          className="mt-1 w-full rounded-xl border bg-background px-3 py-2 text-sm"
                          value={editForm.total}
                          onChange={(event) => handleEditFormChange("total", event.target.value)}
                        />
                      </label>
                    </div>
                    <label className="text-sm font-medium">
                      Notes
                      <textarea
                        className="mt-1 w-full rounded-xl border bg-background px-3 py-2 text-sm"
                        rows={4}
                        value={editForm.notes}
                        onChange={(event) => handleEditFormChange("notes", event.target.value)}
                      />
                    </label>
                    <div className="rounded-2xl border bg-background/80 p-3 text-sm text-muted-foreground">
                      <p className="font-medium text-card-foreground">Synthèse</p>
                      <p>
                        Sous-total : <span className="font-semibold">{formatCurrency(lineSubtotal)}</span>
                      </p>
                      <p>
                        Total enregistré :{" "}
                        <span className="font-semibold">{formatCurrency(displayedTotal)}</span>
                      </p>
                      <p>
                        Ajustement :{" "}
                        <span className="font-semibold">
                          {formatCurrency(displayedAdjustment)}
                        </span>
                      </p>
                    </div>
                    <div className="flex flex-col gap-3">
                      <Button
                        type="button"
                        variant="destructive"
                        className="gap-2"
                        onClick={handleDeleteEntry}
                      >
                        <Trash2 className="h-4 w-4" />
                        Supprimer le ticket
                      </Button>
                      <div className="flex flex-wrap justify-end gap-3">
                        <Button type="button" variant="outline" onClick={handleCloseDetail}>
                          Annuler
                        </Button>
                        <Button type="submit" className="gap-2">
                          Enregistrer
                        </Button>
                      </div>
                    </div>
                  </form>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      ) : null}
    </main>
  );
}
