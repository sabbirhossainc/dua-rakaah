import { Inter } from "next/font/google";
import Topbar from "@/app/components/Topbar";
import RightBar from "@/app/components/RightBar";
import LeftBar from "@/app/components/LeftBar";
import PwaProvider from "@/app/components/PwaProvider";
import SyncStarter from "@/app/components/SyncStarter";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata = {
  title: {
    default: "Dua & Ruqyah | All Duas Collection",
    template: "%s | All Duas Collection",
  },
  description:
    "Browse Islamic duas (supplications) by category, with the Arabic text, transliteration and translation in English and Bangla.",
  icons: {
    icon: "/icons/dua-logo.svg",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="bg-[#ebeef2] relative">
        <PwaProvider>
          <SyncStarter />
          <div
            className={`${inter.variable} z-0 lg:fixed lg:inset-x-0 xl:fixed xl:inset-x-0 xl:p-6 xl:pb-0 2xl:px-10 2xl:pt-6 2xl:fixed 2xl:inset-x-0`}
          >
            <div className="relative grid gap-6 sm:gap-0 xl:grid-rows-[46px_1fr] 2xl:grid-rows-[46px_1fr] z-0 xl:grid-cols-[105px_350px_1fr] 2xl:grid-cols-[105px_350px_1fr_270px]">
              <div className="row-span-full hidden xl:block xl:z-[-1] 2xl:block 2xl:z-[-1]">
                <LeftBar />
              </div>
              <div className="xl:col-start-2 xl:col-span-full 2xl:col-start-2 2xl:col-span-full 2xl:z-[-1]">
                <Topbar />
              </div>
              {/* main part */}
              <div className="md:z-[-3] lg:gap-6 lg:z-[-2] xl:gap-x-6 2xl:gap-x-6 2xl:z-[-1] grid sm:mx-auto md:mx-auto lg:w-[96%] lg:mx-auto mt-6 2xl:col-span-2">
                {children}
              </div>
              <div className="hidden 2xl:block 2xl:col-start-4 z-[-2] my-6">
                <RightBar />
              </div>
              <main className="hidden"></main>
            </div>
          </div>
        </PwaProvider>
      </body>
    </html>
  );
}
