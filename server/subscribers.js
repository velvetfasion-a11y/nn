import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, "data");
const DATA_FILE = path.join(DATA_DIR, "launch-subscribers.json");
const TIMEZONE = "Europe/Stockholm";

async function loadStore() {
  try {
    const raw = await readFile(DATA_FILE, "utf8");
    const parsed = JSON.parse(raw);
    return parsed?.subscribers && typeof parsed.subscribers === "object"
      ? parsed.subscribers
      : {};
  } catch {
    return {};
  }
}

async function saveStore(subscribers) {
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(DATA_FILE, JSON.stringify({ subscribers }, null, 2), "utf8");
}

function startOfTodayMs() {
  const now = new Date();
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);

  const year = parts.find((p) => p.type === "year")?.value;
  const month = parts.find((p) => p.type === "month")?.value;
  const day = parts.find((p) => p.type === "day")?.value;
  return Date.parse(`${year}-${month}-${day}T00:00:00`);
}

function formatSignupDate(date) {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: TIMEZONE,
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

function formatSignupTime(date) {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

function computeStats(subscribers) {
  const now = Date.now();
  const weekAgo = now - 7 * 24 * 60 * 60 * 1000;
  const todayStart = startOfTodayMs();

  let weekCount = 0;
  let todayCount = 0;

  for (const subscribedAt of Object.values(subscribers)) {
    const ts = Date.parse(subscribedAt);
    if (Number.isNaN(ts)) continue;
    if (ts >= weekAgo) weekCount += 1;
    if (ts >= todayStart) todayCount += 1;
  }

  return {
    total_count: Object.keys(subscribers).length,
    week_count: weekCount,
    today_count: todayCount,
  };
}

export async function recordLaunchSignup(email) {
  const normalized = email.trim().toLowerCase();
  const subscribers = await loadStore();
  const now = new Date();
  const isNew = !subscribers[normalized];

  if (isNew) {
    subscribers[normalized] = now.toISOString();
    await saveStore(subscribers);
  }

  const stats = computeStats(subscribers);
  const subscribedAt = new Date(subscribers[normalized] || now.toISOString());

  return {
    isNew,
    stats,
    subscriber_email: normalized,
    date: formatSignupDate(subscribedAt),
    time: formatSignupTime(subscribedAt),
  };
}
