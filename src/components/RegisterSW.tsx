"use client";

import { useEffect } from "react";
import { pruneOldEntries } from "@/lib/storage";

// Check if a scheduled notification is due and show it via the service worker
function checkScheduledNotification(registration: ServiceWorkerRegistration) {
  try {
    const raw = localStorage.getItem("regulate-notification-scheduled");
    if (!raw) return;

    const scheduled = JSON.parse(raw);
    const now = Date.now();

    // Not time yet
    if (now < scheduled.time) return;

    // Check if the user already dismissed the check-back (opened the app since scheduling)
    const checkBack = localStorage.getItem("regulate-check-back");
    if (!checkBack) {
      // Check-back was already dismissed — user opened the app. Don't notify.
      localStorage.removeItem("regulate-notification-scheduled");
      return;
    }

    // Permission must still be granted
    if (Notification.permission !== "granted") {
      localStorage.removeItem("regulate-notification-scheduled");
      return;
    }

    // Show the notification via the service worker
    const activeWorker = registration.active;
    if (activeWorker) {
      activeWorker.postMessage({
        type: "SHOW_NOTIFICATION",
        payload: {
          title: "How are you doing?",
          body: "Just checking in. Tap to open Regulate.",
          icon: "/icons/icon-192.png",
          tag: "regulate-check-back",
          data: { url: "/" },
        },
      });
    }

    // Clear the schedule — one notification only
    localStorage.removeItem("regulate-notification-scheduled");
  } catch {
    // Silently fail — notifications are an enhancement
  }
}

export default function RegisterSW() {
  useEffect(() => {
    // Prune old entries on app load
    pruneOldEntries("regulate-sos-history", 200);
    pruneOldEntries("regulate-journal", 500);

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/" })
        .then((registration) => {
          // Check for updates every 30 minutes
          setInterval(() => {
            registration.update();
          }, 30 * 60 * 1000);

          // Check for scheduled notifications every 5 minutes
          // Also check once on load (in case notification came due while page was closed)
          checkScheduledNotification(registration);
          setInterval(() => {
            checkScheduledNotification(registration);
          }, 5 * 60 * 1000);

          // When a new SW is waiting, tell it to activate immediately
          registration.addEventListener("updatefound", () => {
            const newWorker = registration.installing;
            if (!newWorker) return;

            newWorker.addEventListener("statechange", () => {
              if (
                newWorker.state === "installed" &&
                navigator.serviceWorker.controller
              ) {
                // New version available — activate it on next navigation
                // No disruptive reload; the user gets the new version next time
              }
            });
          });
        })
        .catch(() => {
          // Service worker registration failed — app still works without it
        });
    }
  }, []);

  return null;
}
