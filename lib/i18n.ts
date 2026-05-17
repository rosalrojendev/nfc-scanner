"use client";

import * as React from "react";

export type Locale = "en" | "fr";

export const SUPPORTED_LOCALES: readonly Locale[] = ["en", "fr"] as const;
const STORAGE_KEY = "atp-locale";

// English is the source of truth — every translation key must exist here.
// Other languages may have partial coverage; missing keys fall back to the
// English string at render time (see useT below).
const en = {
  // ---- Language toggle itself ---------------------------------------
  "lang.english": "English",
  "lang.french": "Français",

  // ---- Settings: Appearance card -----------------------------------
  "settings.appearance.eyebrow": "Appearance",
  "settings.appearance.title": "Theme and accessibility",
  "settings.appearance.darkModeHint":
    "Dark mode is recommended for sun-bright roof conditions.",
  "settings.appearance.brandPaletteLabel": "Brand palette",
  "settings.appearance.brandPaletteHintAnchor": "Anchor",
  "settings.appearance.brandPaletteHintClassic": "Classic",
  "settings.appearance.brandPaletteHintBody":
    "is the current steel-teal branding. {classic} restores the warm cream + orange Kamloops Rope Access palette.",
  "settings.appearance.languageLabel": "Language",
  "settings.appearance.languageHint":
    "Choose the language of the app interface. Inspection records stay in whichever language they were entered.",

  // ---- Common buttons ----------------------------------------------
  "common.cancel": "Cancel",
  "common.save": "Save",
  "common.close": "Close",
  "common.delete": "Delete",
  "common.edit": "Edit",

  // ---- Topbar ------------------------------------------------------
  "topbar.signOut": "Sign out",
  "topbar.openScanner": "Open scanner",
  "topbar.openSettings": "Open settings",
  "topbar.logoutConfirmTitle": "Sign out of Anchor Tag Pro?",
  "topbar.logoutConfirmBody":
    "You'll be signed out as {name}. Any unsaved changes in open dialogs will be lost. You can sign back in anytime.",
  "topbar.staySignedIn": "Stay signed in",
  "topbar.signingOut": "Signing out…",
} as const;

export type TranslationKey = keyof typeof en;

const fr: Partial<Record<TranslationKey, string>> = {
  "lang.english": "Anglais",
  "lang.french": "Français",

  "settings.appearance.eyebrow": "Apparence",
  "settings.appearance.title": "Thème et accessibilité",
  "settings.appearance.darkModeHint":
    "Le mode sombre est recommandé en plein soleil sur les toits.",
  "settings.appearance.brandPaletteLabel": "Palette de marque",
  "settings.appearance.brandPaletteHintAnchor": "Anchor",
  "settings.appearance.brandPaletteHintClassic": "Classique",
  "settings.appearance.brandPaletteHintBody":
    "est la palette actuelle (bleu acier). {classic} restaure la palette crème et orange Kamloops Rope Access.",
  "settings.appearance.languageLabel": "Langue",
  "settings.appearance.languageHint":
    "Choisissez la langue de l'interface. Les rapports d'inspection restent dans la langue dans laquelle ils ont été saisis.",

  "common.cancel": "Annuler",
  "common.save": "Enregistrer",
  "common.close": "Fermer",
  "common.delete": "Supprimer",
  "common.edit": "Modifier",

  "topbar.signOut": "Déconnexion",
  "topbar.openScanner": "Ouvrir le scanner",
  "topbar.openSettings": "Ouvrir les paramètres",
  "topbar.logoutConfirmTitle": "Se déconnecter d'Anchor Tag Pro?",
  "topbar.logoutConfirmBody":
    "Vous serez déconnecté en tant que {name}. Les modifications non enregistrées dans les boîtes de dialogue ouvertes seront perdues. Vous pouvez vous reconnecter à tout moment.",
  "topbar.staySignedIn": "Rester connecté",
  "topbar.signingOut": "Déconnexion en cours…",
};

const DICTIONARIES: Record<Locale, Partial<Record<TranslationKey, string>>> = {
  en,
  fr,
};

function readLocale(): Locale {
  if (typeof document === "undefined") return "en";
  const attr = document.documentElement.getAttribute("data-locale");
  return attr === "fr" ? "fr" : "en";
}

function subscribeToLocale(callback: () => void): () => void {
  if (typeof window === "undefined" || typeof MutationObserver === "undefined") {
    return () => {};
  }
  const observer = new MutationObserver(callback);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-locale"],
  });
  return () => observer.disconnect();
}

export function useLocale(): Locale {
  return React.useSyncExternalStore(subscribeToLocale, readLocale, () => "en");
}

export function setLocale(locale: Locale): void {
  if (typeof document === "undefined") return;
  document.documentElement.setAttribute("data-locale", locale);
  try {
    localStorage.setItem(STORAGE_KEY, locale);
  } catch {
    // storage unavailable — silently continue
  }
}

// Lightweight {param} interpolation: t("greeting", { name: "Sarah" })
// matches `{name}` inside the translated string. Missing translations fall
// back to English, then to the raw key, so the UI never shows a blank.
export function useT() {
  const locale = useLocale();
  return React.useCallback(
    (key: TranslationKey, params?: Record<string, string | number>) => {
      const dict = DICTIONARIES[locale];
      const raw = dict[key] ?? en[key] ?? key;
      if (!params) return raw;
      return raw.replace(/\{(\w+)\}/g, (_, k) =>
        k in params ? String(params[k]) : `{${k}}`,
      );
    },
    [locale],
  );
}
