/**
 * Maps raw Supabase Auth error objects or strings to friendly, professional UI messages.
 * Prevents raw database or internal exception traces from being exposed to end users.
 */
export function mapAuthError(
  error: { message?: string; code?: string; status?: number } | Error | string | null | undefined
): string {
  if (!error) return "An unexpected error occurred. Please try again.";

  const message = typeof error === "string" ? error : error.message || "";
  const code = typeof error === "object" && error !== null && "code" in error ? String(error.code) : "";
  const lowerMsg = message.toLowerCase();

  if (code === "otp_expired" || lowerMsg.includes("expired") || lowerMsg.includes("token has expired")) {
    return "This link is invalid or has expired. Please request a new link.";
  }

  if (lowerMsg.includes("invalid login credentials") || lowerMsg.includes("invalid credentials")) {
    return "Invalid email or password. Please check your credentials and try again.";
  }

  if (lowerMsg.includes("email not confirmed") || lowerMsg.includes("confirm your email")) {
    return "Please check your inbox and verify your email address before signing in.";
  }

  if (lowerMsg.includes("user already registered") || lowerMsg.includes("already been registered")) {
    return "An account with this email address already exists. Please sign in instead.";
  }

  if (lowerMsg.includes("password should be at least")) {
    return "Password must be at least 6 characters long.";
  }

  if (lowerMsg.includes("rate limit") || lowerMsg.includes("too many requests")) {
    return "Too many requests. Please wait a moment before trying again.";
  }

  if (lowerMsg.includes("failed to fetch") || lowerMsg.includes("networkerror")) {
    return "Unable to connect to the server. Please check your internet connection.";
  }

  return message || "An unexpected error occurred. Please try again.";
}
