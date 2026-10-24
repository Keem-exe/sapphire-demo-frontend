import { ADMIN_KEYS } from "./api"

/**
 * Admin and student sessions are stored separately. An admin account is also an ordinary
 * user, so when they jump to the student app without a student session, reuse the admin
 * login rather than sending them back to the sign-in page. Existing student sessions are
 * left untouched.
 */
export function openStudentApp() {
  try {
    if (!localStorage.getItem("authToken")) {
      const token = localStorage.getItem(ADMIN_KEYS.token)
      const user = localStorage.getItem(ADMIN_KEYS.user)
      const refresh = localStorage.getItem(ADMIN_KEYS.refresh)
      if (token && user) {
        localStorage.setItem("authToken", token)
        localStorage.setItem("user", user)
        if (refresh) localStorage.setItem("refreshToken", refresh)
      }
    }
  } catch {
    // storage unavailable: the student app will show its own sign-in
  }
  // Full navigation: AuthProvider only reads localStorage on mount.
  window.location.assign("/dashboard")
}
