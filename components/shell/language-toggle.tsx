"use client";

import * as React from "react";
import { Segmented } from "@/components/ui/segmented";
import { type Locale, setLocale, useLocale } from "@/lib/i18n";

export function LanguageToggle() {
  const locale = useLocale();

  return (
    <Segmented<Locale>
      ariaLabel="Language"
      value={locale}
      onChange={setLocale}
      options={[
        { value: "en", label: "EN" },
        { value: "fr", label: "FR" },
      ]}
    />
  );
}
