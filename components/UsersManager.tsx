"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Profile, Role } from "@/lib/types";

const ROLES: Role[] = ["admin", "staff", "viewer"];

export default function UsersManager({
  initialProfiles,
  currentUserId,
}: {
  initialProfiles: Profile[];
  currentUserId: string;
}) {
  const supabase = createClient();
  const [profiles, setProfiles] = useState<Profile[]>(initialProfiles);

  async function changeRole(id: string, role: Role) {
    const { error } = await supabase.from("profiles").update({ role }).eq("id", id);
    if (error) return alert(error.message);
    setProfiles((prev) => prev.map((p) => (p.id === id ? { ...p, role } : p)));
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-[28px] font-semibold text-ink">Users</h1>
        <p className="mt-1 text-[15px] text-muted">
          Manage who can access the portal and what they can do.
        </p>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-left text-[14px]">
          <thead>
            <tr className="border-b border-hairline bg-surface text-[12px] uppercase tracking-wide text-muted">
              <th className="px-5 py-3 font-medium">Name</th>
              <th className="px-5 py-3 font-medium">Joined</th>
              <th className="px-5 py-3 font-medium">Role</th>
            </tr>
          </thead>
          <tbody>
            {profiles.map((p) => (
              <tr key={p.id} className="border-b border-hairline last:border-0">
                <td className="px-5 py-3 font-medium text-ink">
                  {p.full_name || "—"} {p.id === currentUserId && <span className="text-muted">(you)</span>}
                </td>
                <td className="px-5 py-3 text-muted">{new Date(p.created_at).toLocaleDateString()}</td>
                <td className="px-5 py-3">
                  <select
                    className="input-field !py-1.5 text-[13px] w-36"
                    value={p.role}
                    onChange={(e) => changeRole(p.id, e.target.value as Role)}
                  >
                    {ROLES.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="mt-4 text-[13px] text-muted">
        <strong>Admin</strong> — full access incl. user management. <strong>Staff</strong> — manage
        stock &amp; recalls. <strong>Viewer</strong> — read-only.
      </p>
    </div>
  );
}
