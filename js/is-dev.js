export function isLocalDev() {
  if (import.meta.env?.DEV === true) return true;
  const host = window.location.hostname;
  return host === "localhost" || host === "127.0.0.1";
}
