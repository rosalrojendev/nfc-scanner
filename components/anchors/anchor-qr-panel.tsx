"use client";

import * as React from "react";
import QRCode from "qrcode";
import { Button } from "@/components/ui/button";
import { Eyebrow } from "@/components/ui/card";
import {
  ChevronDown,
  Download,
  FileText,
  Loader2,
  Printer,
  QrCode,
} from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { buildTagUrl } from "@/lib/nfc-payload";
import type { Anchor } from "@/lib/types";

interface AnchorQrPanelProps {
  anchor: Anchor;
}

// High-error-correction so the printed plate survives bird droppings,
// scratches, paint splatter, and partial occlusion. Level H = 30%.
const QR_OPTS: QRCode.QRCodeToDataURLOptions = {
  errorCorrectionLevel: "H",
  margin: 2,
  width: 480,
  color: { dark: "#1a2129", light: "#ffffff" },
};

function triggerDownload(blobOrUrl: string | Blob, filename: string) {
  const url =
    typeof blobOrUrl === "string"
      ? blobOrUrl
      : URL.createObjectURL(blobOrUrl);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  if (typeof blobOrUrl !== "string") {
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}

export function AnchorQrPanel({ anchor }: AnchorQrPanelProps) {
  const { notify } = useToast();
  // Derived synchronously from anchor.id — no state, no effect needed.
  const tagUrl = React.useMemo(() => buildTagUrl(anchor.id), [anchor.id]);
  const [dataUrl, setDataUrl] = React.useState<string | null>(null);
  const [plateBusy, setPlateBusy] = React.useState(false);
  const [downloadMenuOpen, setDownloadMenuOpen] = React.useState(false);
  const downloadWrapRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    QRCode.toDataURL(tagUrl, QR_OPTS)
      .then((dataUrl) => {
        if (!cancelled) setDataUrl(dataUrl);
      })
      .catch((e) => {
        if (!cancelled) {
          notify(e instanceof Error ? e.message : "QR generation failed.", "error");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [tagUrl, notify]);

  React.useEffect(() => {
    if (!downloadMenuOpen) return;
    function onDocPointer(e: MouseEvent) {
      if (
        downloadWrapRef.current &&
        !downloadWrapRef.current.contains(e.target as Node)
      ) {
        setDownloadMenuOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setDownloadMenuOpen(false);
    }
    document.addEventListener("mousedown", onDocPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [downloadMenuOpen]);

  function downloadPng() {
    if (!dataUrl) return;
    triggerDownload(dataUrl, `qr-${anchor.id}.png`);
  }

  async function downloadSvg() {
    try {
      const svg = await QRCode.toString(tagUrl, {
        type: "svg",
        errorCorrectionLevel: "H",
        margin: 2,
        color: { dark: "#1a2129", light: "#ffffff" },
      });
      const blob = new Blob([svg], { type: "image/svg+xml" });
      triggerDownload(blob, `qr-${anchor.id}.svg`);
    } catch (e) {
      notify(e instanceof Error ? e.message : "SVG generation failed.", "error");
    }
  }

  async function downloadPlatePdf() {
    setPlateBusy(true);
    try {
      // Dynamic import keeps the @react-pdf bundle out of the main page.
      const [{ pdf }, { AnchorPlatePdf }] = await Promise.all([
        import("@react-pdf/renderer"),
        import("@/components/anchors/anchor-plate-pdf"),
      ]);
      // Generate a higher-resolution QR specifically for the plate PDF —
      // when rasterised inside the PDF at 75mm wide it benefits from extra
      // pixels.
      const platePngDataUrl = await QRCode.toDataURL(tagUrl, {
        errorCorrectionLevel: "H",
        margin: 0,
        width: 1200,
        color: { dark: "#000000", light: "#ffffff" },
      });
      const blob = await pdf(
        <AnchorPlatePdf anchor={anchor} qrPngDataUrl={platePngDataUrl} />,
      ).toBlob();
      triggerDownload(blob, `plate-${anchor.id}.pdf`);
      notify("Plate PDF ready.", "success");
    } catch (e) {
      notify(e instanceof Error ? e.message : "Plate PDF failed.", "error");
    } finally {
      setPlateBusy(false);
    }
  }

  function printNow() {
    if (!dataUrl) return;
    const w = window.open("", "_blank");
    if (!w) {
      notify("Allow pop-ups to use the quick print.", "error");
      return;
    }
    // Simple full-bleed print template — most useful for one-off paper
    // backups; the PDF below is the file you hand to an engraver.
    w.document.write(`<!doctype html><html><head><title>QR · ${anchor.id}</title>
<style>
  @page { size: auto; margin: 12mm; }
  body { font-family: -apple-system, system-ui, sans-serif; text-align: center; }
  h1 { font-size: 28pt; margin: 0; }
  p  { color: #555; margin: 4mm 0; }
  img { width: 60mm; height: 60mm; image-rendering: pixelated; }
  code { font-size: 10pt; color: #777; word-break: break-all; }
</style></head><body>
  <h1>${anchor.id}</h1>
  <p>${anchor.building} · ${anchor.location}</p>
  <img src="${dataUrl}" alt="QR" />
  <p><code>${tagUrl}</code></p>
  <script>window.onload=()=>setTimeout(()=>window.print(),100);</script>
</body></html>`);
    w.document.close();
  }

  return (
    <>
      <div className="grid gap-1">
        <Eyebrow>
          <QrCode size={12} className="inline mr-1" /> QR plate
        </Eyebrow>
        <h2 className="text-lg font-semibold tracking-tight">
          Generate a scannable code
        </h2>
        <p className="text-sm text-[var(--color-text-muted)]">
          Encodes the anchor URL with 30% error correction so the plate stays
          scannable through scratches, bird droppings, and partial paint
          splatter. Use the PDF for engraving on anodized aluminum.
        </p>
      </div>

      <div className="grid grid-cols-[160px_1fr] gap-4 items-start sm:items-center">
        <div
          className="rounded-2xl bg-white p-2 grid place-items-center"
          style={{ boxShadow: "var(--shadow-sm)" }}
        >
          {dataUrl ? (
            <img
              src={dataUrl}
              alt={`QR code for anchor ${anchor.id}`}
              className="w-full h-auto"
              style={{ imageRendering: "pixelated" }}
            />
          ) : (
            <span
              className="block w-full aspect-square skeleton"
              aria-label="Generating QR code"
            />
          )}
        </div>
        <div className="grid gap-2 text-sm">
          <div>
            <span className="text-[0.72rem] uppercase tracking-wider text-[var(--color-text-muted)] block">
              Encoded URL
            </span>
            <code className="text-xs break-all">{tagUrl}</code>
          </div>
          <div className="flex flex-wrap gap-2 pt-1">
            <div className="relative inline-flex" ref={downloadWrapRef}>
              <Button
                onClick={downloadPng}
                disabled={!dataUrl}
                size="sm"
                className="rounded-r-none border-r-0 pr-2.5"
              >
                <Download size={14} /> PNG
              </Button>
              <Button
                onClick={() => setDownloadMenuOpen((o) => !o)}
                aria-label="More download formats"
                aria-haspopup="menu"
                aria-expanded={downloadMenuOpen}
                disabled={!dataUrl}
                size="sm"
                className="rounded-l-none px-1.5"
              >
                <ChevronDown size={12} />
              </Button>
              {downloadMenuOpen ? (
                <div
                  role="menu"
                  className="absolute top-full right-0 mt-1 z-20 min-w-[180px] p-1 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-md)]"
                >
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setDownloadMenuOpen(false);
                      void downloadSvg();
                    }}
                    className="w-full text-left px-3 py-2 rounded-xl text-sm font-semibold hover:bg-[var(--color-surface-2)] inline-flex items-center gap-2 text-[var(--color-text)]"
                  >
                    <Download size={14} /> SVG
                    <span className="ml-auto text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-muted)]">
                      vector
                    </span>
                  </button>
                </div>
              ) : null}
            </div>
            <Button onClick={printNow} disabled={!dataUrl} size="sm">
              <Printer size={14} /> Quick print
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={downloadPlatePdf}
              disabled={plateBusy || !tagUrl}
            >
              {plateBusy ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <FileText size={14} />
              )}
              {plateBusy ? "Building…" : "Plate PDF (75 × 50 mm)"}
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
