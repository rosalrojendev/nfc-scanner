import type { Metadata, Viewport } from "next";
import Script from "next/script";
import "./globals.css";
import { ToastProvider } from "@/components/ui/toast";

export const metadata: Metadata = {
  title: "Anchor Tag Pro Mobile",
  description: "Roof anchor NFC + QR field inspection app",
  applicationName: "Anchor Tag Pro",
  formatDetection: { telephone: false, email: false, address: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f7f6f2" },
    { media: "(prefers-color-scheme: dark)", color: "#171614" },
  ],
};

const themeBootScript = `(function(){try{var t=localStorage.getItem('atp-theme');if(!t){t=window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';}document.documentElement.setAttribute('data-theme',t);}catch(e){}})();`;

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" data-theme="light" suppressHydrationWarning>
      <body>
        <Script
          id="atp-theme-boot"
          strategy="beforeInteractive"
        >
          {themeBootScript}
        </Script>
        <ToastProvider>
          <a href="#main" className="sr-only">
            Skip to content
          </a>
          {children}
        </ToastProvider>
      </body>
    </html>
  );
}
