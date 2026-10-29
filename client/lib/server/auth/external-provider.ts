import type { AuthProvider } from "./types";

// Placeholder for the real authentication module (SRS 2.5, 14). The auth team
// has not defined the mechanism (trusted headers, session cookie, JWT), so this
// returns "nobody signed in". A production build therefore grants no access
// until this provider is implemented (DEC-003, backlog B-05).
export const externalProvider: AuthProvider = {
  async getUser() {
    return null;
  },
};
