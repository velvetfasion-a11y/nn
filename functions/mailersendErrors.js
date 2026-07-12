export function parseMailerSendApiError(status, bodyText) {
  let parsed = null;
  try {
    parsed = JSON.parse(bodyText);
  } catch {
    parsed = null;
  }

  const message = String(parsed?.message || bodyText || "").trim();

  if (status === 403) {
    return (
      "MailerSend rejected the send (403). Your API token needs Email send permission — " +
      "create a new token in MailerSend with Full access → Email."
    );
  }

  if (
    status === 422 &&
    (message.includes("MS42225") || message.toLowerCase().includes("unique recipients limit"))
  ) {
    return (
      "MailerSend trial limit reached: trial accounts can only send to a few addresses. " +
      "Upgrade MailerSend (Settings → Billing → Free or Hobby plan) or complete identity verification."
    );
  }

  if (message) {
    return `MailerSend API error (${status}): ${message}`;
  }

  return `MailerSend API error (${status}).`;
}

export function isTrialRecipientLimitError(error) {
  const message = String(error?.message || error || "").toLowerCase();
  return (
    message.includes("ms42225") ||
    message.includes("unique recipients limit") ||
    message.includes("trial limit") ||
    message.includes("trial account")
  );
}

export function devRelaxTrialEnabled() {
  return process.env.MAILERSEND_DEV_RELAX_TRIAL === "true";
}
