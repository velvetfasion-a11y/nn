import { sendLaunchEmails } from "./sendLaunchEmails.js";

export {
  sendLaunchEmails,
  sendUserVerificationEmail,
  sendAdminSignupNotification,
  sendVerificationEmail,
} from "./sendLaunchEmails.js";

export async function handleLaunchSignup({ email }) {
  await sendLaunchEmails(email);
}

export async function handleProfileCreated({ email }) {
  await sendLaunchEmails(email);
}
