import { getConfig } from "@/lib/server/config";

export const metadata = { title: "Sign in · Organize Indent System" };

// Authentication belongs to another module (SRS 2.5, DEC-003). With an external
// provider and no session, users are sent to its login address when configured.
export default function NotSignedInPage() {
  const { authLoginUrl } = getConfig();
  return (
    <div className="mx-auto max-w-xl p-8 text-center">
      <h1 className="text-xl font-bold">You are not signed in</h1>
      <p className="mt-2 text-[var(--ink-soft)]">Please sign in and try again.</p>
      {authLoginUrl && (
        <a href={authLoginUrl} className="btn btn-primary mt-5">Sign in</a>
      )}
    </div>
  );
}
