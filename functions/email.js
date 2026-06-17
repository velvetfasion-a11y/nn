import { sendLaunchEmails, sendUserVerificationEmail } from "./sendLaunchEmails.js";

export async function handleLaunchSignup({ email, isNew = true }) {
  if (isNew) {
    await sendLaunchEmails(email);
    return;
  }

  await sendUserVerificationEmail(email);
}

export async function handleProfileCreated({ email, isNew = true }) {
  if (isNew) {
    await sendLaunchEmails(email);
    return;
  }

  await sendUserVerificationEmail(email);
}
