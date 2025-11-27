import { useEffect, useState } from "react";

import { RECEIPT_SETTINGS_KEY } from "@/constants/storageKeys";
import type { ReceiptSettings } from "@/types";

const defaultReceiptSettings: ReceiptSettings = {
  storeName: "SoukSoft Market",
  addressLine1: "12 Rue Emir Abdelkader",
  addressLine2: "Algiers, DZ",
  phone: "+213 555 123 456",
  website: "souksoft.dz",
  taxId: "RC-00001234",
  thanksMessage: "Merci pour votre visite !",
  footerNote: "Les retours sont acceptés sous 7 jours avec reçu.",
};

function readStoredReceiptSettings(): ReceiptSettings {
  if (typeof window === "undefined") return defaultReceiptSettings;
  try {
    const raw = window.localStorage.getItem(RECEIPT_SETTINGS_KEY);
    if (!raw) return defaultReceiptSettings;
    const parsed = JSON.parse(raw) as ReceiptSettings;
    return { ...defaultReceiptSettings, ...parsed };
  } catch {
    return defaultReceiptSettings;
  }
}

export function useReceiptSettings() {
  const [settings, setSettings] = useState<ReceiptSettings>(() => readStoredReceiptSettings());

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(RECEIPT_SETTINGS_KEY, JSON.stringify(settings));
  }, [settings]);

  const updateSettings = (partial: Partial<ReceiptSettings>) =>
    setSettings((prev) => ({ ...prev, ...partial }));

  const resetSettings = () => setSettings(defaultReceiptSettings);

  return { settings, updateSettings, resetSettings, defaults: defaultReceiptSettings };
}
