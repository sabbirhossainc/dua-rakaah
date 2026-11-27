import { Fraunces, Inter, Noto_Sans_Bengali, Scheherazade_New } from "next/font/google";
import AccountWatcher from "@/app/components/AccountWatcher";
import BottomNav from "@/app/components/BottomNav";
import SettingsProvider from "@/app/components/SettingsProvider";
import SiteFooter from "@/app/components/SiteFooter";
import SiteHeader from "@/app/components/SiteHeader";
import SkipLink from "@/app/components/SkipLink";
import PwaProvider from "@/app/components/PwaProvider";
import SyncStarter from "@/app/components/SyncStarter";
import PreferencesApplier from "@/app/components/PreferencesApplier";
import { inlineScriptText } from "@/lib/preferences";
import "./globals.css";

// The typefaces (design D3). next/font serves them from the app's own origin, and the service worker saves them with
// the other build files. globals.css chooses among them by the language of the text.
const heading = Fraunces({
  subsets: ["latin", "latin-ext"],
  axes: ["opsz"],
  display: "swap",
  variable: "--font-heading",
});
const sans = Inter({
  subsets: ["latin", "latin-ext"],
  style: ["normal", "italic"],
  display: "swap",
  variable: "--font-sans",
});
const bangla = Noto_Sans_Bengali({
  subsets: ["bengali"],
  display: "swap",
  variable: "--font-bangla",
});
const arabic = Scheherazade_New({
  subsets: ["arabic"],
  weight: "400",
  display: "swap",
  variable: "--font-arabic",
});
const FONT_VARIABLES = [heading, sans, bangla, arabic].map((font) => font.variable).join(" ");

export const metadata = {
  title: {
    default: "Dua & Raka'ah | All Duas Collection",
    template: "%s | All Duas Collection",
  },
  description:
    "Browse Islamic duas (supplications) by category, with the Arabic text, transliteration and translation in English and Bangla.",
  icons: {
    icon: "/icons/dua-logo.svg",
  },
};

// The page may use the whole screen; the bottom bar adds the safe area below itself (design D5).
export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

// The shell every page shares (design D6). The document scrolls: the header is sticky and the bottom bar fixed.
export default function RootLayout({ children }) {
  return (
    <html lang="en" className={FONT_VARIABLES} suppressHydrationWarning>
      <head>
        {/* Applies the saved theme and Arabic size before the first paint (design D5). */}
        <script dangerouslySetInnerHTML={{ __html: inlineScriptText() }} />
      </head>
      <body className="flex min-h-dvh flex-col">
        <PwaProvider>
          <SyncStarter />
          <PreferencesApplier />
          <SettingsProvider>
            <SkipLink />
            <SiteHeader />
            <main id="main" tabIndex={-1} className="flex-1 pb-section outline-none">
              {children}
            </main>
            <SiteFooter />
            <BottomNav />
          </SettingsProvider>
          <AccountWatcher />
        </PwaProvider>
      </body>
    </html>
  );
}
