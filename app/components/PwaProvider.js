"use client";

// Registers the service worker, removes it where it must not run, and shows the update prompt (design D7, D8, D9).
import { SerwistProvider, useSerwist } from "@serwist/turbopack/react";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { langFromPathname } from "@/lib/content";
import UpdateBar from "./UpdateBar";

const WORKER_URL = "/serwist/sw.js";
const CACHE_PREFIX = "serwist-";

// No worker in development, so `npm run dev` always shows the current code. A SW_KILL build (design D9) must not
// register it either, or every page load would install the kill worker again.
const DISABLED = process.env.NODE_ENV !== "production" || process.env.NEXT_PUBLIC_SW_KILL === "1";

// Without this the browser may reuse an old copy of the worker file for up to a day.
const REGISTRATION_OPTIONS = { updateViaCache: "none" };

/** Removes this app's worker and caches from the browser. Other apps on the same origin are left alone. */
async function removeLeftovers() {
  if (!("serviceWorker" in navigator)) return;
  const registrations = await navigator.serviceWorker.getRegistrations();
  const ours = registrations.filter((reg) =>
    [reg.active, reg.waiting, reg.installing].some((worker) => worker?.scriptURL.endsWith(WORKER_URL)),
  );
  await Promise.all(ours.map((reg) => reg.unregister()));
  if ("caches" in window) {
    const names = await caches.keys();
    await Promise.all(names.filter((name) => name.startsWith(CACHE_PREFIX)).map((name) => caches.delete(name)));
  }
}

function UpdatePrompt() {
  const { serwist } = useSerwist();
  const lang = langFromPathname(usePathname());
  const [waiting, setWaiting] = useState(false);

  useEffect(() => {
    if (!serwist) return;
    // A new worker that finished installing and is waiting. `isUpdate` is false on the very first install.
    const onWaiting = (event) => {
      if (event.isUpdate) setWaiting(true);
    };
    serwist.addEventListener("waiting", onWaiting);
    navigator.serviceWorker.getRegistration("/").then((reg) => {
      // The event may already have fired before this effect ran, so look at the registration as well.
      if (reg?.waiting && navigator.serviceWorker.controller) setWaiting(true);
      // Browsers check for a new worker on a page load only about once a day. Ask on every full page load, so a
      // new version reaches readers soon after it is deployed. Offline, the request fails and that is fine.
      return reg?.update();
    }).catch(() => {});
    return () => serwist.removeEventListener?.("waiting", onWaiting);
  }, [serwist]);

  if (!waiting) return null;

  const reload = () => {
    let reloaded = false;
    const once = () => {
      if (!reloaded) {
        reloaded = true;
        location.reload();
      }
    };
    // The new worker takes control after SKIP_WAITING. Reload once, when it does.
    navigator.serviceWorker.addEventListener("controllerchange", once, { once: true });
    serwist.messageSkipWaiting();
    // If nothing happens (for example, the waiting worker is already gone), reload anyway.
    setTimeout(once, 4000);
  };

  return <UpdateBar lang={lang} onReload={reload} onDismiss={() => setWaiting(false)} />;
}

export default function PwaProvider({ children }) {
  useEffect(() => {
    if (DISABLED) removeLeftovers().catch(() => {});
  }, []);

  return (
    <SerwistProvider
      swUrl={WORKER_URL}
      disable={DISABLED}
      reloadOnOnline={false}
      cacheOnNavigation={false}
      options={REGISTRATION_OPTIONS}
    >
      {children}
      <UpdatePrompt />
    </SerwistProvider>
  );
}
