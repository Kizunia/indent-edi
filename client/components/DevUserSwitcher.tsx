"use client";

import { useEffect, useId, useState } from "react";

interface DevUser {
  id: string;
  name: string;
  roles: string[];
}

// Dev-only user/role switcher (DEC-003). It renders nothing when the server
// answers 404 (production, or AUTH_PROVIDER=external).
export default function DevUserSwitcher() {
  const selectId = useId();
  const [users, setUsers] = useState<DevUser[] | null>(null);
  const [currentUserId, setCurrentUserId] = useState("");
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/dev/session")
      .then(async (res) => {
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled) {
          setUsers(data.users);
          setCurrentUserId(data.currentUserId);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  if (!users) return null;

  async function change(userId: string) {
    setFailed(false);
    try {
      const res = await fetch("/api/dev/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      if (!res.ok) throw new Error("switch failed");
      setCurrentUserId(userId);
      // Pages still fetch on the client; reload so every view re-reads as the new user.
      window.location.reload();
    } catch {
      setFailed(true);
    }
  }

  return (
    <div style={{ padding: "10px 18px", borderTop: "1px solid rgba(255,255,255,0.12)" }}>
      <label htmlFor={selectId} style={{ display: "block", fontSize: 11, color: "rgba(255,255,255,0.6)", marginBottom: 4 }}>
        Signed in as (dev)
      </label>
      <select
        id={selectId}
        value={currentUserId}
        onChange={(e) => change(e.target.value)}
        style={{ width: "100%", fontSize: 12.5, padding: "4px 6px" }}
      >
        {users.map((u) => (
          <option key={u.id} value={u.id}>
            {u.name}
          </option>
        ))}
      </select>
      {failed && (
        <div role="alert" style={{ fontSize: 11, color: "#ffb4b4", marginTop: 4 }}>
          Could not switch user.
        </div>
      )}
    </div>
  );
}
