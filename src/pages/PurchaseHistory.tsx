import { Home, ReceiptText, Trash2, X } from "lucide-react";
import { type FormEvent, useEffect, useMemo, useState } from "react";

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
  const [_auditEntries, setAuditEntries] = useState<AuditLogEntry[]>(() => getAuditLog());

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
  const todayTotal = totalCollected;
  const todayAverage = historyEntries.length > 0 ? todayTotal / historyEntries.length : 0;

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
    const parsedTotal = Number.parseFloat(editForm.total);
    const totalValue =
      editForm.total.trim() !== "" && Number.isFinite(parsedTotal) && parsedTotal >= 0
        ? parsedTotal
        : selectedEntry.total;
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

  return (
    <main className="page-shell flex h-screen flex-1 flex-col overflow-hidden px-6 pt-6 pb-0 lg:px-8">
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
          <CardHeader className="flex flex-row items-center justify-between gap-3">
            <CardTitle className="whitespace-nowrap">Total encaissé</CardTitle>
            <span className="text-2xl font-semibold tracking-tight">
              {formatCurrency(totalCollected)}
            </span>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-3">
            <CardTitle className="whitespace-nowrap">Total encaissé aujourd&apos;hui</CardTitle>
            <span className="text-2xl font-semibold tracking-tight">
              {historyEntries.length > 0 ? formatCurrency(todayTotal) : "—"}
            </span>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-3">
            <CardTitle className="whitespace-nowrap">Moyenne du jour</CardTitle>
            <span className="text-2xl font-semibold tracking-tight">
              {historyEntries.length > 0 ? formatCurrency(todayAverage) : "—"}
            </span>
          </CardHeader>
        </Card>
      </div>

      <Card className="mt-6 flex min-h-0 flex-col">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ReceiptText className="h-5 w-5 text-muted-foreground" />
            Journal des tickets
          </CardTitle>
          <CardDescription>
            Les tickets les plus récents sont listés en premier.
          </CardDescription>
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
                  {historyEntries.length === 0 ? (
                    <tr>
                      <td
                        className="border border-border px-4 py-6 text-center text-sm text-muted-foreground"
                        colSpan={7}
                      >
                        Aucun ticket pour le moment.
                      </td>
                    </tr>
                  ) : (
                    historyEntries.map((entry, index) => {
                      const basketNumber = historyEntries.length - index;
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
                          <td className="border border-border px-3 py-2 text-right">{entry.completedAt}</td>
                        </tr>
                      );
                    })
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
                          {formatCurrency(selectedEntry.total)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Δ {formatCurrency(selectedEntry.total - lineSubtotal)}
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
                        <span className="font-semibold">{formatCurrency(selectedEntry.total)}</span>
                      </p>
                      <p>
                        Ajustement :{" "}
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
