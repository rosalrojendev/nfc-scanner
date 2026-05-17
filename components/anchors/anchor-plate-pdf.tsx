"use client";

import * as React from "react";
import {
  Document,
  Page,
  Text,
  View,
  Image,
  StyleSheet,
} from "@react-pdf/renderer";
import type { Anchor } from "@/lib/types";

// Plate dimensions are 75mm × 50mm — a common stock size for anodized
// aluminum / laser-engraved tags. react-pdf works in PDF points (1 mm =
// 2.83465 pt). Page is rendered at exact final size so the file goes
// straight to an engraver without scaling.
const MM = 2.83465;
const PAGE_W = 75 * MM;
const PAGE_H = 50 * MM;

const styles = StyleSheet.create({
  page: {
    width: PAGE_W,
    height: PAGE_H,
    padding: 3 * MM,
    fontFamily: "Helvetica",
    color: "#000",
  },
  topRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 1.5 * MM,
  },
  idGroup: {
    flexDirection: "column",
    maxWidth: 38 * MM,
  },
  brand: {
    fontSize: 6,
    color: "#444",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  anchorId: {
    fontSize: 22,
    fontWeight: 700,
    marginTop: 1 * MM,
    letterSpacing: 0.5,
  },
  loc: {
    fontSize: 7.5,
    color: "#333",
    marginTop: 0.5 * MM,
  },
  nfcStamp: {
    width: 9 * MM,
    height: 9 * MM,
    borderRadius: 1.5 * MM,
    borderWidth: 1,
    borderColor: "#000",
    borderStyle: "solid",
    alignItems: "center",
    justifyContent: "center",
  },
  nfcN: { fontSize: 12, fontWeight: 700 },
  nfcLabel: { fontSize: 4.5, marginTop: 0.2 * MM, letterSpacing: 0.5 },

  body: {
    flexDirection: "row",
    flexGrow: 1,
    alignItems: "center",
    gap: 3 * MM,
  },
  qr: {
    width: 28 * MM,
    height: 28 * MM,
  },
  bodyText: {
    flex: 1,
    gap: 1.5 * MM,
  },
  hint: {
    fontSize: 7,
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  meta: {
    fontSize: 6,
    color: "#444",
  },
  warn: {
    marginTop: 1 * MM,
    fontSize: 6,
    color: "#000",
    borderTopWidth: 0.5,
    borderTopColor: "#000",
    borderTopStyle: "solid",
    paddingTop: 1 * MM,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 5,
    color: "#555",
    marginTop: 1 * MM,
  },
});

export interface AnchorPlatePdfProps {
  anchor: Anchor;
  qrPngDataUrl: string;
}

export function AnchorPlatePdf({ anchor, qrPngDataUrl }: AnchorPlatePdfProps) {
  return (
    <Document title={`Anchor plate ${anchor.id}`} producer="Anchor Tag Pro">
      <Page size={{ width: PAGE_W, height: PAGE_H }} style={styles.page}>
        <View style={styles.topRow}>
          <View style={styles.idGroup}>
            <Text style={styles.brand}>Anchor Tag Pro</Text>
            <Text style={styles.anchorId}>{anchor.id}</Text>
            <Text style={styles.loc}>
              {anchor.building}
              {anchor.location ? ` · ${anchor.location}` : ""}
            </Text>
          </View>
          <View style={styles.nfcStamp}>
            <Text style={styles.nfcN}>N</Text>
            <Text style={styles.nfcLabel}>TAP</Text>
          </View>
        </View>

        <View style={styles.body}>
          {/* eslint-disable-next-line jsx-a11y/alt-text */}
          <Image src={qrPngDataUrl} style={styles.qr} />
          <View style={styles.bodyText}>
            <Text style={styles.hint}>Scan QR or tap NFC</Text>
            <Text style={styles.meta}>
              Opens this anchor&apos;s record in Anchor Tag Pro. Works with
              your phone&apos;s built-in camera.
            </Text>
            {anchor.drawing ? (
              <Text style={styles.meta}>Drawing ref: {anchor.drawing}</Text>
            ) : null}
            <Text style={styles.warn}>Do not paint or remove</Text>
          </View>
        </View>

        <View style={styles.footer}>
          <Text>Asset ID: {anchor.id}</Text>
          <Text>EC level H · 30% recoverable</Text>
        </View>
      </Page>
    </Document>
  );
}
