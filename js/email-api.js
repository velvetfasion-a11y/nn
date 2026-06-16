export async function submitLaunchSignup(email, name = {}) {
  const response = await fetch("/api/notify-signup", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email,
      firstName: name.firstName || "",
      lastName: name.lastName || "",
    }),
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error || "Could not submit your email.");
  }
}

export async function submitProfileCreated(email, name = {}) {
  const response = await fetch("/api/profile-created", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email,
      firstName: name.firstName || "",
      lastName: name.lastName || "",
    }),
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error || "Could not send welcome email.");
  }
}
