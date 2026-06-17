import { getFirestore, Timestamp } from "firebase-admin/firestore";

const TIMEZONE = "Europe/Stockholm";

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

function subscriberId(email) {
  return email.trim().toLowerCase().replace(/[^a-z0-9@._-]+/g, "_");
}

export async function recordLaunchSignup(email, name = {}) {
  const db = getFirestore();
  const normalized = email.trim().toLowerCase();
  const ref = db.collection("launch_subscribers").doc(subscriberId(normalized));
  const snap = await ref.get();
  const now = new Date();
  const isNew = !snap.exists();

  if (isNew) {
    await ref.set({
      email: normalized,
      firstName: name.firstName || "",
      lastName: name.lastName || "",
      createdAt: Timestamp.fromDate(now),
    });
  }

  const all = await db.collection("launch_subscribers").get();
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const todayStart = startOfTodayMs();

  let weekCount = 0;
  let todayCount = 0;

  all.forEach((doc) => {
    const createdAt = doc.data().createdAt?.toDate?.();
    if (!createdAt) return;
    const ts = createdAt.getTime();
    if (ts >= weekAgo) weekCount += 1;
    if (ts >= todayStart) todayCount += 1;
  });

  const subscribedAt = snap.exists()
    ? snap.data().createdAt?.toDate?.() || now
    : now;

  return {
    isNew,
    stats: {
      total_count: all.size,
      week_count: weekCount,
      today_count: todayCount,
    },
    subscriber_email: normalized,
    date: formatSignupDate(subscribedAt),
    time: formatSignupTime(subscribedAt),
  };
}
