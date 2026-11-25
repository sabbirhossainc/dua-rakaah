// A worker that removes the service worker (design D9). `npm run build` with SW_KILL=1 serves this file at
// /serwist/sw.js instead of app/sw.js. Devices that already have the app pick it up the next time they open it
// (the worker file is never cached by the browser), and it then deletes every file this app saved (the caches whose names start with "serwist-") and unregisters itself.
self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      await Promise.all(names.filter((name) => name.startsWith("serwist-")).map((name) => caches.delete(name)));
      await self.registration.unregister();
      // Reload the open pages. They come from the network now, because nothing controls them any more.
      const windows = await clients.matchAll({ type: "window" });
      for (const win of windows) win.navigate(win.url);
    })(),
  );
});
