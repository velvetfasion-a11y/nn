import {
  getRedirectResult,
  onAuthStateChanged,
} from "firebase/auth";
import { auth, persistenceReady } from "./firebase.js";

let authBootPromise = null;
let authListenerStarted = false;
const authListeners = new Set();
let bootOptions = { redirectResult: false };

function notifyAuthListeners(user) {
  authListeners.forEach((listener) => {
    try {
      listener(user);
    } catch (error) {
      console.warn("Auth listener failed:", error);
    }
  });
}

function startAuthListener() {
  if (authListenerStarted) return;
  authListenerStarted = true;

  onAuthStateChanged(auth, (user) => {
    notifyAuthListeners(user);
  });
}

function wait(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

export async function prepareAuthSession(options = {}) {
  if (options.redirectResult) {
    bootOptions.redirectResult = true;
  }

  if (!authBootPromise) {
    authBootPromise = (async () => {
      startAuthListener();

      try {
        await Promise.race([persistenceReady, wait(2500)]);
      } catch (error) {
        console.warn("persistenceReady:", error);
      }

      if (bootOptions.redirectResult) {
        try {
          await Promise.race([
            getRedirectResult(auth),
            wait(1500).then(() => {
              throw new Error("redirect-result-timeout");
            }),
          ]);
        } catch (error) {
          if (error?.message !== "redirect-result-timeout") {
            console.warn("getRedirectResult:", error);
          }
        }
      }

      await Promise.race([
        auth.authStateReady(),
        wait(4000).then(() => {
          throw new Error("auth-state-timeout");
        }),
      ]).catch((error) => {
        if (error?.message !== "auth-state-timeout") {
          throw error;
        }
        console.warn("auth.authStateReady() timed out — continuing");
      });
    })();
  }

  await authBootPromise;
}

export function subscribeAuthState(listener, options) {
  authListeners.add(listener);

  if (authListenerStarted) {
    listener(auth.currentUser);
  } else {
    prepareAuthSession(options)
      .then(() => listener(auth.currentUser))
      .catch((error) => {
        console.warn("Auth bootstrap failed:", error);
        listener(auth.currentUser);
      });
  }

  return () => authListeners.delete(listener);
}

export function wantsAdminRedirect() {
  const next = new URLSearchParams(window.location.search).get("next");
  return next === "admin.html" || next === "/admin.html";
}

export function clearNextQueryParam() {
  const url = new URL(window.location.href);
  if (!url.searchParams.has("next")) return;
  url.searchParams.delete("next");
  history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
}

export function redirectToAdminPanel() {
  const target = new URL("/admin.html", window.location.origin).toString();
  if (window.location.href === target) return;
  window.location.replace(target);
}
