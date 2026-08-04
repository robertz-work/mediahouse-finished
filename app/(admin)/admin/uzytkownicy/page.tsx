"use client";

/**
 * /admin/uzytkownicy — user management: list and role change.
 */

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import type { Role } from "@/lib/constants";

interface UserRow {
  id: string;
  email: string;
  name: string;
  role: Role;
  phone?: string;
  company?: string;
  createdAt: string;
}

const ROLE_LABELS: Record<Role, string> = {
  client: "Klient",
  representative: "Przedstawiciel",
  admin: "Administrator",
};

const ROLE_COLORS: Record<Role, string> = {
  client: "bg-blue-100 text-blue-700",
  representative: "bg-purple-100 text-purple-700",
  admin: "bg-pink-100 text-pink-700",
};

export default function AdminUsersPage() {
  const { data: session } = useSession();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [changing, setChanging] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/users")
      .then((r) => r.json())
      .then((data) => {
        setUsers(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  async function changeRole(userId: string, newRole: Role) {
    setChanging(userId);
    try {
      const res = await fetch(`/api/admin/users/${userId}/role`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole }),
      });
      if (res.ok) {
        const updated = await res.json();
        setUsers((prev) =>
          prev.map((u) => (u.id === userId ? { ...u, role: updated.role } : u))
        );
      }
    } finally {
      setChanging(null);
    }
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-slate-900">Użytkownicy</h1>

      {loading ? (
        <div className="py-20 text-center text-sm text-slate-400">
          Ładowanie…
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Imię</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Telefon</th>
                <th className="px-4 py-3">Firma</th>
                <th className="px-4 py-3">Rola</th>
                <th className="px-4 py-3">Dołączył</th>
                <th className="px-4 py-3">Zmień rolę</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map((u) => {
                const isMe = u.id === session?.user?.id;
                return (
                  <tr key={u.id} className="transition hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-900">
                      {u.name}
                      {isMe && (
                        <span className="ml-2 text-xs text-slate-400">
                          (Ty)
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{u.email}</td>
                    <td className="px-4 py-3 text-slate-600">
                      {u.phone || "–"}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {u.company || "–"}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${ROLE_COLORS[u.role]}`}
                      >
                        {ROLE_LABELS[u.role]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-500">
                      {new Date(u.createdAt).toLocaleDateString("pl-PL")}
                    </td>
                    <td className="px-4 py-3">
                      {isMe ? (
                        <span className="text-xs text-slate-400">—</span>
                      ) : (
                        <select
                          value={u.role}
                          disabled={changing === u.id}
                          onChange={(e) =>
                            changeRole(u.id, e.target.value as Role)
                          }
                          className="rounded-lg border border-slate-300 px-2 py-1 text-xs outline-none focus:border-pink-500 disabled:opacity-50"
                        >
                          <option value="client">Klient</option>
                          <option value="representative">Przedstawiciel</option>
                          <option value="admin">Administrator</option>
                        </select>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
