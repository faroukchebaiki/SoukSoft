import type { ReceiptSettings, UnitType } from "@/types";
import { formatCurrency } from "@/lib/format";

export interface ReceiptPreviewItem {
  id?: string;
  name: string;
  qty: number;
  unit?: UnitType | string;
  price: number;
  discountValue?: number;
  sku?: string;
}

interface ReceiptPreviewProps {
  settings: ReceiptSettings;
  items: ReceiptPreviewItem[];
  receiptId?: string;
  cashier?: string;
  customer?: string;
  paymentMethod?: string;
  completedAt?: string;
  className?: string;
  compact?: boolean;
  showFooter?: boolean;
}

function formatQty(value: number, unit?: UnitType | string) {
  if (unit === "kg") return `${value.toFixed(2)} kg`;
  return `${value} ${unit ?? "pcs"}`;
}

export function ReceiptPreview({
  settings,
  items,
  receiptId,
  completedAt,
  className,
  compact = false,
  showFooter = true,
}: ReceiptPreviewProps) {
  const paperWidthPx = settings.paperWidth === 58 ? 230 : 320;

  const subtotal = items.reduce((sum, item) => sum + item.price * item.qty, 0);
  const discounts = items.reduce((sum, item) => sum + (item.discountValue ?? 0), 0);
  const total = subtotal - discounts;

  return (
    <div
      className={`receipt-ticket ${className ?? ""}`}
      style={{ width: `${paperWidthPx}px`, maxWidth: "100%" }}
    >
      <div className="text-center">
        {settings.logoData ? (
          <img
            src={settings.logoData}
            alt={`${settings.storeName} logo`}
            className="mx-auto mb-2 h-12 w-auto object-contain"
          />
        ) : null}
        <div className="text-sm font-semibold uppercase tracking-wide">{settings.storeName}</div>
        {settings.addressLine1 ? (
          <div className="text-[11px] text-muted-foreground">{settings.addressLine1}</div>
        ) : null}
        {settings.addressLine2 ? (
          <div className="text-[11px] text-muted-foreground">{settings.addressLine2}</div>
        ) : null}
        {(settings.phone || settings.website) ? (
          <div className="text-[11px] text-muted-foreground">
            {[settings.phone, settings.website].filter(Boolean).join(" · ")}
          </div>
        ) : null}
        {settings.taxId ? (
          <div className="text-[11px] text-muted-foreground">RC: {settings.taxId}</div>
        ) : null}
      </div>

      <div className="receipt-divider" />

      <div className="space-y-[6px] text-[11px]">
        <div className="flex justify-between">
          <span>Reçu</span>
          <span className="font-semibold">{receiptId ?? "En cours"}</span>
        </div>
        {completedAt ? (
          <div className="flex justify-between">
            <span>Date</span>
            <span>{completedAt}</span>
          </div>
        ) : null}
      </div>

      <div className="receipt-divider" />

      <div className="overflow-hidden rounded-md border border-dashed border-border">
        <table className="w-full text-[11px]">
          <thead className="bg-muted/60 text-left uppercase text-[10px] text-muted-foreground">
            <tr>
              <th className="px-2 py-1 font-semibold">Article</th>
              <th className="px-2 py-1 text-right font-semibold">Qté</th>
              <th className="px-2 py-1 text-right font-semibold">PU</th>
              <th className="px-2 py-1 text-right font-semibold">Total</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => {
              const lineTotal = item.price * item.qty - (item.discountValue ?? 0);
              return (
                <tr key={item.id ?? item.name} className="border-t border-dashed border-border">
                  <td className="px-2 py-[6px]">
                    <div className="font-medium">{item.name}</div>
                    {item.sku ? (
                      <div className="text-[10px] uppercase text-muted-foreground">{item.sku}</div>
                    ) : null}
                  </td>
                  <td className="px-2 py-[6px] text-right">{formatQty(item.qty, item.unit)}</td>
                  <td className="px-2 py-[6px] text-right">{formatCurrency(item.price)}</td>
                  <td className="px-2 py-[6px] text-right font-semibold">
                    {formatCurrency(lineTotal)}
                  </td>
                </tr>
              );
            })}
            {items.length === 0 ? (
              <tr>
                <td className="px-2 py-3 text-center text-muted-foreground" colSpan={4}>
                  Ajouter des articles pour voir l&apos;aperçu du reçu.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <div className="receipt-divider" />

      <div className="space-y-1 text-[11px]">
        <div className="flex justify-between">
          <span>Sous-total</span>
          <span>{formatCurrency(subtotal)}</span>
        </div>
        {discounts > 0 ? (
          <div className="flex justify-between">
            <span>Remises</span>
            <span>- {formatCurrency(discounts)}</span>
          </div>
        ) : null}
        <div className="flex justify-between text-sm font-semibold">
          <span>Total TTC</span>
          <span>{formatCurrency(total)}</span>
        </div>
      </div>

      {showFooter ? (
        <>
          <div className="receipt-divider" />
          <div className={`text-center text-[11px] ${compact ? "space-y-1" : "space-y-2"}`}>
            {settings.thanksMessage ? (
              <p className="font-semibold uppercase tracking-wide">{settings.thanksMessage}</p>
            ) : null}
            {settings.footerNote ? (
              <p className="text-muted-foreground">{settings.footerNote}</p>
            ) : null}
          </div>
        </>
      ) : null}
    </div>
  );
}
