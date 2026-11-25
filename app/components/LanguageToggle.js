"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { switchLanguageHref } from "@/lib/content";

const ACTIVE = "bg-primary text-white rounded-md w-29 h-10 sm:w-full";
const INACTIVE = "text-black border border-solid border-[#cccdcf] rounded-md w-29 h-10 sm:w-full";

// The two language buttons. Rendered without `onSelect` as the static fallback in RightBar.
export function LanguageButtons({ active, onSelect }) {
  return (
    <div className="flex flex-row gap-x-3 mx-4 justify-center">
      <button
        type="button"
        aria-pressed={active === "en"}
        onClick={onSelect && (() => onSelect("en"))}
        className={active === "en" ? ACTIVE : INACTIVE}
      >
        English
      </button>
      <button
        type="button"
        aria-pressed={active === "bn"}
        onClick={onSelect && (() => onSelect("bn"))}
        className={active === "bn" ? ACTIVE : INACTIVE}
      >
        বাংলা
      </button>
    </div>
  );
}

// Takes the reader to the same page in the other language (design D7). The fragment is only
// known in the browser, so it is read when a button is clicked.
export default function LanguageToggle() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const active = /^\/bn(\/|$)/.test(pathname) ? "bn" : "en";

  function select(target) {
    if (target === active) return;
    router.push(
      switchLanguageHref(pathname, searchParams.toString(), window.location.hash, target)
    );
  }

  return <LanguageButtons active={active} onSelect={select} />;
}
