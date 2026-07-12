import { sendLaunchEmails, sendUserVerificationEmail } from "./sendLaunchEmails.js";

export {
  sendLaunchEmails,
  sendUserVerificationEmail,
  sendAdminSignupNotification,
  sendVerificationEmail,
  verifyMailerSendToken,
} from "./sendLaunchEmails.js";

export async function handleLaunchSignup({ email, isNew = true, signup = {} }) {
  const meta = {
    date: signup.date,
    time: signup.time,
    stats: signup.stats,
  };

  if (isNew) {
    await sendLaunchEmails(email, meta);
    return;
  }

  await sendUserVerificationEmail(email);
}

export async function handleProfileCreated({ email, isNew = true, signup = {} }) {
  const meta = {
    date: signup.date,
    time: signup.time,
    stats: signup.stats,
  };

  if (isNew) {
    await sendLaunchEmails(email, meta);
    return;
  }

  await sendUserVerificationEmail(email);
}
