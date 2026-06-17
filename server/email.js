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
    personalization: [
      {
        email: to,
        data,
      },
    ],
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
    const isRecipientLimit =
      error.message.includes("MS42225") || error.message.includes("unique recipients");
    console.warn("Verification template failed:", error.message);
    if (isRecipientLimit) {
      throw error;
    }
    const transport = getSmtpTransport();
    await transport.sendMail({
      from: `"${FROM_NAME()}" <${FROM_EMAIL()}>`,
      to: email,
      subject: "Welcome to Jamil & Jamila",
      html: `
        <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto; color: #111;">
          <h1 style="text-transform: uppercase; letter-spacing: 0.04em;">Jamil &amp; Jamila</h1>
          <p>Hi ${person},</p>
          <p>Thank you for joining us. You're on the list for launch updates and new collections.</p>
          <p>We'll be in touch soon.</p>
        </div>
      `,
    });
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
    console.warn("Registration template failed, using SMTP fallback:", error.message);
    const transport = getSmtpTransport();
    await transport.sendMail({
      from: `"${FROM_NAME()}" <${FROM_EMAIL()}>`,
      to: ADMIN_EMAIL(),
      subject: `Ny prenumerant: ${signup.subscriber_email}`,
      html: `
        <div style="font-family: sans-serif; max-width: 560px; color: #111;">
          <h2>Ny prenumerant</h2>
          <p><strong>E-post:</strong> ${signup.subscriber_email}</p>
          <p><strong>Datum:</strong> ${signup.date} · ${signup.time}</p>
          <p><strong>Totalt på listan:</strong> ${signup.stats.total_count}</p>
          <p><strong>Senaste 7 dagar:</strong> ${signup.stats.week_count}</p>
          <p><strong>Idag:</strong> ${signup.stats.today_count}</p>
        </div>
      `,
    });
  }
}

async function sendProfileAdminNotification({ userEmail, userName }) {
  const person = displayName(userName?.firstName, userName?.lastName, userEmail);

  if (API_TOKEN()) {
    const response = await fetch("https://api.mailersend.com/v1/email", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${API_TOKEN()}`,
      },
      body: JSON.stringify({
        from: { email: FROM_EMAIL(), name: FROM_NAME() },
        to: [{ email: ADMIN_EMAIL() }],
        subject: `New profile: ${person}`,
        text: `New profile\n\nName: ${person}\nEmail: ${userEmail}`,
        html: `
          <div style="font-family: sans-serif; max-width: 560px; color: #111;">
            <h2>New profile</h2>
            <p><strong>Name:</strong> ${person}</p>
            <p><strong>Email:</strong> ${userEmail}</p>
          </div>
        `,
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`MailerSend admin email failed (${response.status}): ${body}`);
    }
    return;
  }

  const transport = getSmtpTransport();
  await transport.sendMail({
    from: `"${FROM_NAME()}" <${FROM_EMAIL()}>`,
    to: ADMIN_EMAIL(),
    subject: `New profile: ${person}`,
    text: `New profile\n\nName: ${person}\nEmail: ${userEmail}`,
    html: `
      <div style="font-family: sans-serif; max-width: 560px; color: #111;">
        <h2>New profile</h2>
        <p><strong>Name:</strong> ${person}</p>
        <p><strong>Email:</strong> ${userEmail}</p>
      </div>
    `,
  });
}

export async function handleLaunchSignup({ email, name, signup }) {
  let userEmailError = null;
  let adminEmailError = null;

  try {
    await sendVerificationEmail({ email, name });
  } catch (error) {
    userEmailError = error;
    console.warn("User welcome email failed:", error.message);
  }

  try {
    await sendLaunchAdminNotification(signup);
  } catch (error) {
    adminEmailError = error;
    console.warn("Admin notification failed:", error.message);
  }

  if (userEmailError && adminEmailError) {
    throw adminEmailError;
  }
}

export async function handleProfileCreated({ email, name }) {
  await sendVerificationEmail({ email, name });
  await sendProfileAdminNotification({ userEmail: email, userName: name });
}
