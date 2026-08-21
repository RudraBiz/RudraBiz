"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

type CompanyOption = {
  id: string;
  name: string;
};

export function CompanySwitcher({
  companies,
  activeCompanyId,
}: {
  companies: CompanyOption[];
  activeCompanyId: string | null;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [selected, setSelected] = useState(activeCompanyId ?? "");

  async function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const companyId = e.target.value;
    setSelected(companyId);

    const res = await fetch("/api/company/switch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ companyId }),
    });

    if (res.ok) {
      startTransition(() => {
        router.refresh();
      });
    }
  }

  if (companies.length === 0) {
    return null;
  }

  return (
    <select
      value={selected}
      onChange={handleChange}
      disabled={isPending}
      className="rounded-md border border-border bg-background px-3 py-1.5 text-sm focus:border-accent focus:outline-none disabled:opacity-50"
    >
      {companies.map((c) => (
        <option key={c.id} value={c.id}>
          {c.name}
        </option>
      ))}
    </select>
  );
}
