import { invoke } from "@tauri-apps/api/core";

interface PrintOptions {
  preview?: boolean;
  paperWidth?: 58 | 80;
  printerName?: string;
}

const isTauri = typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

/**
 * Send receipt HTML to a printer. Uses a native Tauri command when preview is off,
 * otherwise falls back to an in-app iframe to show the print dialog with correct sizing.
 */
export async function printReceipt(html: string, options: PrintOptions = {}) {
  const preview = options.preview ?? true;
  const paperWidth = options.paperWidth ?? 80;
  const printerName = options.printerName;

  if (!isTauri || preview) {
    // Render into an iframe so we only print the provided markup.
    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "0";
    iframe.srcdoc = html;
    document.body.appendChild(iframe);

    await new Promise((resolve) => setTimeout(resolve, 50));
    iframe.contentWindow?.focus();
    iframe.contentWindow?.print();

    setTimeout(() => {
      iframe.remove();
    }, 500);
    return;
  }

  await invoke("print_receipt_html", { html, paperWidth, printerName });
}
