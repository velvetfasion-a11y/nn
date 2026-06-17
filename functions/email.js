import nodemailer from "nodemailer";

const FROM_EMAIL = () => process.env.MAILERSEND_FROM_EMAIL || "noreply@jamiljamila.com";
const FROM_NAME = () => process.env.MAILERSEND_FROM_NAME || "Jamil & Jamila";
const ADMIN_EMAIL = () => process.env.MAILERSEND_ADMIN_EMAIL || "contact@jamiljamila.com";
const VERIFICATION_TEMPLATE_ID = () =>
  process.env.MAILERSEND_VERIFICATION_TEMPLATE_ID || "3vz9dleyvn74kj50";
const REGISTRATION_TEMPLATE_ID = () =>
  process.env.MAILERSEND_REGISTRATION_TEMPLATE_ID || "pr9084zne0x4w63d";
const API_TOKEN = () => process.env.MAILERSEND_API_TOKEN;

function getSmtpTransport() {
  return nodemailer.createTransport({
    host: process.env.MAILERSEND_SMTP_HOST,
    port: Number(process.env.MAILERSEND_SMTP_PORT || 587),
    secure: false,
    auth: {
      user: process.env.MAILERSEND_SMTP_USER,
      pass: process.env.MAILERSEND_SMTP_PASS,
    },
  });
}

function displayName(firstName, lastName, email) {
  const full = [firstName, lastName].filter(Boolean).join(" ").trim();
  if (full) return full;
  if (email) return email.split("@")[0];
  return "Friend";
}

async function sendMailerSendTemplate({ to, templateId, data, subject }) {
  if (!API_TOKEN()) {
    throw new Error("MAILERSEND_API_TOKEN is not configured");
  }

  const payload = {
    from: { email: FROM_EMAIL(), name: FROM_NAME() },
    to: [{ email: to }],
    template_id: templateId,
    personalization: [{ email: to, data }],
  };

  if (subject) {
    payload.subject = subject;
  }

  const response = await fetch("https://api.mailersend.com/v1/email", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${API_TOKEN()}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`MailerSend API error (${response.status}): ${body}`);
  }
}

async function sendVerificationEmail({ email, name }) {
  const person = displayName(name?.firstName, name?.lastName, email);

  try {
    await sendMailerSendTemplate({
      to: email,
      templateId: VERIFICATION_TEMPLATE_ID(),
      subject: "Welcome to Jamil & Jamila",
      data: {
        name: person,
        first_name: name?.firstName || person,
        email,
        account_name: person,
      },
    });
  } catch (error) {
    console.warn("Verification email failed:", error.message);
  }
}

async function sendLaunchAdminNotification(signup) {
  const templateData = {
    subscriber_email: signup.subscriber_email,
    date: signup.date,
    time: signup.time,
    total_count: String(signup.stats.total_count),
    week_count: String(signup.stats.week_count),
    today_count: String(signup.stats.today_count),
  };

  try {
    await sendMailerSendTemplate({
      to: ADMIN_EMAIL(),
      templateId: REGISTRATION_TEMPLATE_ID(),
      data: templateData,
      subject: `Ny prenumerant: ${signup.subscriber_email}`,
    });
  } catch (error) {
    console.warn("Admin registration email failed:", error.message);
    throw error;
  }
}

export async function handleLaunchSignup({ email, name, signup }) {
  await sendVerificationEmail({ email, name });
  await sendLaunchAdminNotification(signup);
}

export async function handleProfileCreated({ email, name }) {
  await sendVerificationEmail({ email, name });

  const person = displayName(name?.firstName, name?.lastName, email);
  await sendMailerSendTemplate({
    to: ADMIN_EMAIL(),
    templateId: REGISTRATION_TEMPLATE_ID(),
    data: {
      subscriber_email: email,
      date: new Intl.DateTimeFormat("sv-SE", {
        timeZone: "Europe/Stockholm",
        day: "numeric",
        month: "short",
        year: "numeric",
      }).format(new Date()),
      time: new Intl.DateTimeFormat("sv-SE", {
        timeZone: "Europe/Stockholm",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }).format(new Date()),
      total_count: "1",
      week_count: "1",
      today_count: "1",
    },
    subject: `New profile: ${person}`,
  });
}
