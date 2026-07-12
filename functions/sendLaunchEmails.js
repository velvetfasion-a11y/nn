const API_TOKEN = () => process.env.MAILERSEND_API_TOKEN;

const USER_TEMPLATE_ID =
  process.env.MAILERSEND_VERIFICATION_TEMPLATE_ID || "3vz9dleyvn74kj50";
const USER_FROM_EMAIL = process.env.MAILERSEND_FROM_EMAIL || "info@jamiljamila.com";
const USER_FROM_NAME = process.env.MAILERSEND_FROM_NAME || "Jamil Jamila";
const USER_SUBJECT =
  process.env.MAILERSEND_VERIFICATION_SUBJECT ||
  "Grattis — Du är med! | Jamil Jamila";

const ADMIN_TEMPLATE_ID =
  process.env.MAILERSEND_REGISTRATION_TEMPLATE_ID || "pr9084zne0x4w63d";
const ADMIN_TO_EMAIL = process.env.MAILERSEND_ADMIN_EMAIL || "contact@jamiljamila.com";
const ADMIN_FROM_EMAIL =
  process.env.MAILERSEND_ADMIN_FROM_EMAIL || USER_FROM_EMAIL;
const ADMIN_FROM_NAME =
  process.env.MAILERSEND_ADMIN_FROM_NAME || "Jamil Jamila System";
const ADMIN_SUBJECT =
  process.env.MAILERSEND_ADMIN_SUBJECT || "Ny prenumerant! | Intern Notis";

const TIMEZONE = "Europe/Stockholm";

function requireApiToken() {
  const token = API_TOKEN();
  if (!token) {
    throw new Error("MAILERSEND_API_TOKEN is not configured");
  }
  return token;
}

function isValidEmail(email) {
  return typeof email === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

function formatSignupDate(date = new Date()) {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: TIMEZONE,
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

function formatSignupTime(date = new Date()) {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

function mailerSendErrorMessage(status, body) {
  const text = String(body || "");
  if (status === 401) {
    return "MailerSend rejected the API token (401). Check the MAILERSEND_API_TOKEN secret.";
  }
  if (status === 403) {
    return "MailerSend rejected the send (403). The API token needs Full access → Email.";
  }
  if (status === 422 && text.includes("MS42225")) {
    return "MailerSend trial recipient limit reached. Upgrade to the Free plan at mailersend.com to send welcome emails to new subscribers.";
  }
  return `MailerSend API error (${status}): ${text}`;
}

async function sendMailerSendTemplate({
  apiToken,
  fromEmail,
  fromName,
  toEmail,
  subject,
  templateId,
  personalizationData,
}) {
  const response = await fetch("https://api.mailersend.com/v1/email", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiToken}`,
    },
    body: JSON.stringify({
      from: { email: fromEmail, name: fromName },
      to: [{ email: toEmail }],
      subject,
      template_id: templateId,
      personalization: [
        {
          email: toEmail,
          data: personalizationData,
        },
      ],
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(mailerSendErrorMessage(response.status, body));
  }
}

export async function sendUserVerificationEmail(recipientEmail) {
  const to = recipientEmail.trim();
  if (!isValidEmail(to)) {
    throw new Error("A valid recipient email is required.");
  }

  const displayName = to.split("@")[0];

  await sendMailerSendTemplate({
    apiToken: requireApiToken(),
    fromEmail: USER_FROM_EMAIL,
    fromName: USER_FROM_NAME,
    toEmail: to,
    subject: USER_SUBJECT,
    templateId: USER_TEMPLATE_ID,
    personalizationData: {
      name: displayName,
      first_name: displayName,
      email: to,
      account_name: displayName,
    },
  });
}

export async function sendAdminSignupNotification(recipientEmail, meta = {}) {
  const subscriberEmail = recipientEmail.trim();
  if (!isValidEmail(subscriberEmail)) {
    throw new Error("A valid subscriber email is required.");
  }

  const stats = meta.stats || {};
  const now = new Date();

  await sendMailerSendTemplate({
    apiToken: requireApiToken(),
    fromEmail: ADMIN_FROM_EMAIL,
    fromName: ADMIN_FROM_NAME,
    toEmail: ADMIN_TO_EMAIL,
    subject: ADMIN_SUBJECT,
    templateId: ADMIN_TEMPLATE_ID,
    personalizationData: {
      subscriber_email: subscriberEmail,
      date: meta.date || formatSignupDate(now),
      time: meta.time || formatSignupTime(now),
      total_count: String(stats.total_count ?? meta.total_count ?? 1),
      week_count: String(stats.week_count ?? meta.week_count ?? 1),
      today_count: String(stats.today_count ?? meta.today_count ?? 1),
    },
  });
}

export async function sendLaunchEmails(recipientEmail, meta = {}) {
  const email = recipientEmail.trim();
  if (!isValidEmail(email)) {
    throw new Error("A valid email is required.");
  }

  try {
    await sendAdminSignupNotification(email, meta);
  } catch (error) {
    console.warn("Admin notification failed:", error?.message || error);
  }

  await sendUserVerificationEmail(email);
}

export async function sendVerificationEmail(recipientEmail) {
  return sendLaunchEmails(recipientEmail);
}
