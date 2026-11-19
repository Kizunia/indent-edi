"use client";

import { useRouter } from "next/navigation";
import { useEffect, useId, useState } from "react";
import { apiFetch, toApiError } from "@/lib/client/api";

interface DevUser {
  id: string;
  name: string;
  roles: string[];
}

// Dev-only user/role switcher (DEC-003). Renders nothing when the server answers
// 404 (production, or AUTH_PROVIDER=external).
export default function DevUserSwitcher() {
  const selectId = useId();
  const router = useRouter();
  const [users, setUsers] = useState<DevUser[] | null>(null);
  const [currentUserId, setCurrentUserId] = useState("");
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    apiFetch<{ users: DevUser[]; currentUserId: string }>("/api/dev/session", { signal: controller.signal })
      .then((data) => {
        setUsers(data.users);
        setCurrentUserId(data.currentUserId);
      })
      .catch(() => {}); // 404 outside dev: simply not shown
    return () => controller.abort();
  }, []);

  if (!users) return null;

  async function change(userId: string) {
    setFailed(false);
    try {
      await apiFetch("/api/dev/session", { method: "POST", json: { userId } });
      setCurrentUserId(userId);
      router.refresh(); // server components re-read everything as the new user
    } catch (err) {
      setFailed(toApiError(err).code !== "ABORTED");
    }
  }

  return (
    <div className="border-t border-white/10 px-4 py-2.5">
      <label htmlFor={selectId} className="mb-1 block text-[11px] text-white/70">
        Signed in as (dev)
      </label>
      <select
        id={selectId}
        value={currentUserId}
        onChange={(e) => change(e.target.value)}
        className="w-full rounded-[3px] bg-white px-1.5 py-1 text-[12.5px] text-[var(--ink)]"
      >
        {users.map((u) => (
          <option key={u.id} value={u.id}>
            {u.name}
          </option>
        ))}
      </select>
      {failed && (
        <p role="alert" className="mt-1 text-[11px] text-red-200">
          Could not switch user.
        </p>
      )}
    </div>
  );
}
