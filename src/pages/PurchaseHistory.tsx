import { Clock9, History as HistoryIcon, Home, ReceiptText, Trash2, X } from "lucide-react";
import { type FormEvent, useEffect, useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/format";
import { AUDIT_LOG_EVENT, AUDIT_STORAGE_KEY, getAuditLog } from "@/lib/auditLog";
import type { AuditLogEntry, PurchaseHistoryEntry } from "@/types";

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
  const [historyEntries, setHistoryEntries] = useState(entries);
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<EditReceiptFormState>(emptyEditForm);
  const [auditEntries, setAuditEntries] = useState<AuditLogEntry[]>(() => getAuditLog());

  useEffect(() => {
    setHistoryEntries(entries);
  }, [entries]);

  useEffect(() => {
    const syncAudit = () => setAuditEntries(getAuditLog());
    syncAudit();
    window.addEventListener(AUDIT_LOG_EVENT, syncAudit);
    const handleStorage = (event: StorageEvent) => {
      if (event.key === AUDIT_STORAGE_KEY) {
        syncAudit();
      }
    };
    window.addEventListener("storage", handleStorage);
    return () => {
      window.removeEventListener(AUDIT_LOG_EVENT, syncAudit);
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

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

  const totalCollected = historyEntries.reduce((sum, entry) => sum + entry.total, 0);

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
    const parsedTotal = Number(editForm.total);
    const totalValue = Number.isFinite(parsedTotal) ? parsedTotal : selectedEntry.total;
    setHistoryEntries((prev) =>
      prev.map((entry) =>
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
      ),
    );
    handleCloseDetail();
  };

  const handleDeleteEntry = () => {
    if (!selectedEntry) return;
    setHistoryEntries((prev) => prev.filter((entry) => entry.id !== selectedEntry.id));
    handleCloseDetail();
  };

  const latestAuditEntries = auditEntries.slice(0, 10);

  return (
    <main className="page-shell flex-1 overflow-hidden px-6 py-6 lg:px-8">
      <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">History</h1>
          <p className="text-sm text-muted-foreground">
            Every purchase logged with timestamps, payment methods, and cashier notes.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className="w-fit gap-2">
            <HistoryIcon className="h-4 w-4" />
            {historyEntries.length} receipts today
          </Badge>
          <Button variant="secondary" className="gap-2 rounded-full" onClick={onGoHome}>
            <Home className="h-4 w-4" />
            Home (Esc)
          </Button>
        </div>
      </header>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Total collected</CardTitle>
            <CardDescription>Sum of all validated baskets</CardDescription>
          </CardHeader>
          <CardContent className="text-3xl font-semibold tracking-tight">
            {formatCurrency(totalCollected)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Average ticket</CardTitle>
            <CardDescription>Across {entries.length} purchases</CardDescription>
          </CardHeader>
          <CardContent className="text-3xl font-semibold tracking-tight">
            {historyEntries.length > 0 ? formatCurrency(totalCollected / historyEntries.length) : "—"}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Last receipt</CardTitle>
            <CardDescription>Time the most recent basket closed</CardDescription>
          </CardHeader>
          <CardContent className="flex items-center gap-2 text-3xl font-semibold tracking-tight">
            <Clock9 className="h-6 w-6 text-muted-foreground" />
            {historyEntries[0]?.completedAt ?? "—"}
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ReceiptText className="h-5 w-5 text-muted-foreground" />
            Purchase log
          </CardTitle>
          <CardDescription>
            Most recent receipts appear first. Use the register export to retrieve more history.
          </CardDescription>
        </CardHeader>
        <CardContent className="rounded-md border p-0">
          <div className="max-h-[65vh] overflow-auto">
            <table className="min-w-full divide-y divide-border text-sm">
              <thead className="sticky top-0 z-10 bg-muted/50 text-left text-xs uppercase text-muted-foreground backdrop-blur">
                <tr>
                  <th className="px-4 py-2 font-medium">Receipt</th>
                  <th className="px-4 py-2 font-medium">Cashier</th>
                  <th className="px-4 py-2 font-medium text-right">Items</th>
                  <th className="px-4 py-2 font-medium text-right">Total</th>
                  <th className="px-4 py-2 font-medium text-right">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border bg-background">
                {historyEntries.map((entry) => (
                  <tr
                    key={entry.id}
                    className="cursor-pointer transition-colors hover:bg-muted/40"
                    onClick={() => handleSelectEntry(entry)}
                  >
                    <td className="px-4 py-3 font-medium">{entry.id}</td>
                    <td className="px-4 py-3">{entry.cashier}</td>
                    <td className="px-4 py-3 text-right">{entry.items}</td>
                    <td className="px-4 py-3 text-right font-semibold">
                      {formatCurrency(entry.total)}
                    </td>
                    <td className="px-4 py-3 text-right">{entry.completedAt}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Catalog audit trail</CardTitle>
          <CardDescription>
            Recent actions from the product builder, imports, and undo operations.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {latestAuditEntries.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No catalog updates logged yet. Manual edits and imports will appear here.
            </p>
          ) : (
            <ul className="space-y-3">
              {latestAuditEntries.map((entry) => (
                <li key={entry.id} className="rounded-2xl border bg-card/60 p-4">
                  <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline" className="uppercase">
                          {entry.action}
                        </Badge>
                        <p className="font-semibold">{entry.summary}</p>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {entry.actor} · {new Date(entry.timestamp).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  {entry.details?.length ? (
                    <ul className="mt-3 list-disc space-y-1 pl-5 text-xs text-muted-foreground">
                      {entry.details.map((detail, index) => (
                        <li key={`${entry.id}-${index}`}>{detail}</li>
                      ))}
                    </ul>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {selectedEntry ? (
        <div className="fixed inset-0 z-50 flex items-stretch justify-end bg-black/70">
          <div className="flex h-full w-full max-w-5xl">
            <Card className="flex h-full flex-1 flex-col rounded-none rounded-l-[2rem]">
              <CardHeader className="flex flex-col gap-4 pb-0 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <CardTitle className="text-2xl">
                    Receipt {selectedEntry.id}
                  </CardTitle>
                  <CardDescription>
                    Logged at {selectedEntry.completedAt} · Sold by {selectedEntry.cashier}
                  </CardDescription>
                </div>
                <Button variant="ghost" onClick={handleCloseDetail} className="gap-2">
                  <X className="h-4 w-4" />
                  Close
                </Button>
              </CardHeader>
              <CardContent className="flex-1 space-y-6 overflow-y-auto pt-6 pr-1">
                <div className="flex flex-col gap-6 lg:flex-row">
                  <section className="flex-1 space-y-6">
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      <div className="rounded-2xl border bg-card/60 p-4">
                        <p className="text-xs uppercase text-muted-foreground">Customer</p>
                        <p className="text-base font-semibold text-card-foreground">
                          {selectedEntry.customerName ?? "Walk-in guest"}
                        </p>
                        {selectedEntry.customerId ? (
                          <p className="text-xs text-muted-foreground">
                            ID: {selectedEntry.customerId}
                          </p>
                        ) : null}
                      </div>
                      <div className="rounded-2xl border bg-card/60 p-4">
                        <p className="text-xs uppercase text-muted-foreground">Items</p>
                        <p className="text-base font-semibold text-card-foreground">
                          {selectedEntry.items}
                        </p>
                      </div>
                      <div className="rounded-2xl border bg-card/60 p-4">
                        <p className="text-xs uppercase text-muted-foreground">Total</p>
                        <p className="text-base font-semibold text-card-foreground">
                          {formatCurrency(selectedEntry.total)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Δ {formatCurrency(selectedEntry.total - lineSubtotal)}
                        </p>
                      </div>
                    </div>

                    <div className="rounded-2xl border">
                      <div className="flex items-center justify-between border-b px-4 py-2 text-xs uppercase text-muted-foreground">
                        <span>Line items</span>
                        <span>{selectedEntry.lineItems?.length ?? 0} entries</span>
                      </div>
                      <div className="max-h-[45vh] overflow-auto">
                        <table className="min-w-full text-sm">
                          <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
                            <tr>
                              <th className="px-4 py-2 text-left font-medium">Item</th>
                              <th className="px-4 py-2 text-left font-medium">SKU</th>
                              <th className="px-4 py-2 text-right font-medium">Qty</th>
                              <th className="px-4 py-2 text-right font-medium">Price</th>
                              <th className="px-4 py-2 text-right font-medium">Line total</th>
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
                                  No line items recorded for this receipt.
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
                      Manage receipt
                    </p>
                    <div className="grid gap-4">
                      <label className="text-sm font-medium">
                        Cashier
                        <input
                          className="mt-1 w-full rounded-xl border bg-background px-3 py-2 text-sm"
                          value={editForm.cashier}
                          onChange={(event) => handleEditFormChange("cashier", event.target.value)}
                        />
                      </label>
                      <label className="text-sm font-medium">
                        Customer name
                        <input
                          className="mt-1 w-full rounded-xl border bg-background px-3 py-2 text-sm"
                          value={editForm.customerName}
                          onChange={(event) =>
                            handleEditFormChange("customerName", event.target.value)
                          }
                        />
                      </label>
                      <label className="text-sm font-medium">
                        Customer ID
                        <input
                          className="mt-1 w-full rounded-xl border bg-background px-3 py-2 text-sm"
                          value={editForm.customerId}
                          onChange={(event) =>
                            handleEditFormChange("customerId", event.target.value)
                          }
                        />
                      </label>
                      <label className="text-sm font-medium">
                        Completed at
                        <input
                          className="mt-1 w-full rounded-xl border bg-background px-3 py-2 text-sm"
                          value={editForm.completedAt}
                          onChange={(event) =>
                            handleEditFormChange("completedAt", event.target.value)
                          }
                        />
                      </label>
                      <label className="text-sm font-medium">
                        Total amount (DA)
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
                      <p className="font-medium text-card-foreground">Summary</p>
                      <p>
                        Subtotal: <span className="font-semibold">{formatCurrency(lineSubtotal)}</span>
                      </p>
                      <p>
                        Recorded total:{" "}
                        <span className="font-semibold">{formatCurrency(selectedEntry.total)}</span>
                      </p>
                      <p>
                        Adjustment:{" "}
                        <span className="font-semibold">
                          {formatCurrency(selectedEntry.total - lineSubtotal)}
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
                        Delete receipt
                      </Button>
                      <div className="flex flex-wrap justify-end gap-3">
                        <Button type="button" variant="outline" onClick={handleCloseDetail}>
                          Cancel
                        </Button>
                        <Button type="submit" className="gap-2">
                          Save changes
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
