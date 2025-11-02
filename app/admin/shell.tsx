"use client";
import AdminTournamentPanel from "./tournaments";

export default function AdminShell({ email, role }: { email: string; role: string }) {
  return (
    <>
      <div className="card flex items-center gap-3">
        <div className="text-sm font-medium">Panel administratora</div>
        <div className="ml-auto text-xs text-gray-500">{email} · {role.toUpperCase()}</div>
      </div>
      <AdminTournamentPanel />
    </>
  );
}
