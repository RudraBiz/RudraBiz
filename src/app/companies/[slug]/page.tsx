import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { TopNav } from "@/components/top-nav";
import { InviteMemberForm } from "@/components/invite-member-form";
import { ROLE_RANK, type RoleCode } from "@/lib/roles";

export default async function CompanyDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const user = await getCurrentUser();

  const company = await prisma.company.findUnique({
    where: { slug },
    include: {
      companyType: true,
      country: true,
      baseCurrency: true,
      accountingMethod: true,
      companyStatus: true,
      taxFilingFrequency: true,
      companyUsers: { include: { role: true, user: true } },
    },
  });

  if (!company) notFound();

  const myMembership = company.companyUsers.find((cu) => cu.userId === user.id);

  // Non-members must not see this company's details or member list at all —
  // treat it the same as a company that doesn't exist.
  if (!myMembership) notFound();

  const canManageMembers =
    ROLE_RANK.indexOf(myMembership.role.code as RoleCode) >=
    ROLE_RANK.indexOf("ADMIN");

  return (
    <div className="flex min-h-full flex-col">
      <TopNav />
      <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-10">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-semibold tracking-tight">
                {company.name}
              </h1>
              <StatusBadge status={company.companyStatus.name} />
            </div>
            <p className="mt-1 text-sm text-muted">
              {company.slug} · Your role: {myMembership.role.name}
            </p>
          </div>
          <div className="flex gap-2">
            <Link
              href={`/companies/${company.slug}/journal-entries`}
              className="rounded-md border border-border bg-surface px-4 py-2 text-sm font-medium hover:bg-background"
            >
              Journal entries
            </Link>
            <Link
              href={`/companies/${company.slug}/accounts`}
              className="rounded-md border border-border bg-surface px-4 py-2 text-sm font-medium hover:bg-background"
            >
              Chart of accounts
            </Link>
            <Link
              href={`/companies/${company.slug}/edit`}
              className="rounded-md border border-border bg-surface px-4 py-2 text-sm font-medium hover:bg-background"
            >
              Edit
            </Link>
          </div>
        </div>

        <div className="mt-8 space-y-6 rounded-lg border border-border bg-surface p-6">
          <Row label="Legal name" value={company.legalName} />
          <Row label="Company type" value={company.companyType.name} />
          <Row label="Industry" value={company.industry} />
          <Row label="Tax ID" value={company.taxId} />
          <Row label="Registration no." value={company.registrationNumber} />

          <hr className="border-border" />

          <Row label="Email" value={company.email} />
          <Row label="Phone" value={company.phone} />
          <Row label="Website" value={company.website} />
          <Row
            label="Address"
            value={[company.addressLine, company.city, company.state, company.zip]
              .filter(Boolean)
              .join(", ") || null}
          />
          <Row label="Country" value={company.country.name} />

          <hr className="border-border" />

          <Row
            label="Base currency"
            value={`${company.baseCurrency.name} (${company.baseCurrency.isoCode})`}
          />
          <Row
            label="Fiscal year start"
            value={monthName(company.fiscalYearStartMonth)}
          />
          <Row label="Accounting method" value={company.accountingMethod.name} />

          <hr className="border-border" />

          <Row
            label="Tax registered"
            value={company.taxRegistered ? "Yes" : "No"}
          />
          {company.taxRegistered && (
            <Row
              label="Filing frequency"
              value={company.taxFilingFrequency?.name ?? "—"}
            />
          )}
        </div>

        <div className="mt-8 rounded-lg border border-border bg-surface p-6">
          <h2 className="text-sm font-semibold tracking-tight">Members</h2>

          <ul className="mt-4 divide-y divide-border">
            {company.companyUsers.map((cu) => (
              <li key={cu.id} className="flex items-center justify-between py-3 text-sm">
                <div>
                  <p className="font-medium">{cu.user.name}</p>
                  <p className="text-xs text-muted">{cu.user.email}</p>
                </div>
                <span className="text-xs text-muted">{cu.role.name}</span>
              </li>
            ))}
          </ul>

          {canManageMembers && (
            <div className="mt-5 border-t border-border pt-5">
              <p className="mb-3 text-sm font-medium">Add a member</p>
              <InviteMemberForm companyId={company.id} />
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="flex justify-between gap-4 text-sm">
      <span className="text-muted">{label}</span>
      <span className="text-right font-medium text-ink">{value || "—"}</span>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const isActive = status.toLowerCase() === "active";
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
        isActive ? "bg-accent-soft text-accent" : "bg-background text-muted"
      }`}
    >
      {status}
    </span>
  );
}

function monthName(n: number) {
  const names = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];
  return names[n - 1] ?? String(n);
}
