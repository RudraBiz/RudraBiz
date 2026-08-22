"use client";

import { useState, useTransition } from "react";
import { inviteUserToCompany } from "@/app/companies/actions";
import type { RoleCode } from "@/lib/roles";

const ROLE_OPTIONS: { code: RoleCode; label: string }[] = [
  { code: "VIEWER", label: "Viewer" },
  { code: "STAFF", label: "Staff" },
  { code: "ACCOUNTANT", label: "Accountant" },
  { code: "ADMIN", label: "Admin" },
  { code: "OWNER", label: "Owner" },
];

export function InviteMemberForm({ companyId }: { companyId: string }) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<RoleCode>("STAFF");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    startTransition(async () => {
      const result = await inviteUserToCompany(companyId, email, role);
      if (result.error) {
        setError(result.error);
      } else {
        setSuccess(`${email} added as ${role.toLowerCase()}.`);
        setEmail("");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-3">
      <div className="flex-1 min-w-[200px]">
        <label className="mb-1 block text-sm font-medium">Email</label>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="teammate@example.com"
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:border-accent focus:outline-none"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">Role</label>
        <select
          value={role}
          onChange={(e) => setRole(e.target.value as RoleCode)}
          className="rounded-md border border-border bg-background px-3 py-2 text-sm focus:border-accent focus:outline-none"
        >
          {ROLE_OPTIONS.map((r) => (
            <option key={r.code} value={r.code}>
              {r.label}
            </option>
          ))}
        </select>
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
      >
        {isPending ? "Adding..." : "Add member"}
      </button>

      {error && <p className="w-full text-sm text-red-600">{error}</p>}
      {success && <p className="w-full text-sm text-green-600">{success}</p>}
    </form>
  );
}
