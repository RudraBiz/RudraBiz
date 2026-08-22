import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { requireCompanyMembership } from "@/lib/company-access";
import { ROLE_RANK, type RoleCode } from "@/lib/roles";
import { TopNav } from "@/components/top-nav";
import { toggleAccountActive } from "./actions";

type AccountRow = {
  id: string;
  code: string;
  name: string;
  isActive: boolean;
  isSystemAccount: boolean;
  parentAccountId: string | null;
  accountType: { name: string; code: string; sortOrder: number };
};

export default async function ChartOfAccountsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const user = await getCurrentUser();

  const company = await prisma.company.findUnique({ where: { slug } });
  if (!company) notFound();

  const membership = await requireCompanyMembership(user.id, company.id);
  const canEdit =
    ROLE_RANK.indexOf(membership.role.code as RoleCode) >=
    ROLE_RANK.indexOf("ACCOUNTANT");
  const canDeactivate =
    ROLE_RANK.indexOf(membership.role.code as RoleCode) >=
    ROLE_RANK.indexOf("ADMIN");

  const accounts: AccountRow[] = await prisma.account.findMany({
    where: { companyId: company.id },
    include: { accountType: true },
    orderBy: [{ code: "asc" }],
  });

  // Group by account type (in fixed type sort order), then build each
  // group's parent → children tree for indentation.
  const byType = new Map<string, AccountRow[]>();
  for (const acc of accounts) {
    const key = acc.accountType.code;
    if (!byType.has(key)) byType.set(key, []);
    byType.get(key)!.push(acc);
  }

  const typeGroups = Array.from(byType.values())
    .map((group) => ({ group, sortOrder: group[0].accountType.sortOrder }))
    .sort((a, b) => a.sortOrder - b.sortOrder);

  return (
    <div className="flex min-h-full flex-col">
      <TopNav />
      <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-10">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              Chart of accounts
            </h1>
            <p className="mt-1 text-sm text-muted">{company.name}</p>
          </div>
          {canEdit && (
            <Link
              href={`/companies/${slug}/accounts/new`}
              className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90"
            >
              + New account
            </Link>
          )}
        </div>

        {accounts.length === 0 ? (
          <div className="mt-10 rounded-lg border border-dashed border-border bg-surface p-10 text-center">
            <p className="text-sm text-muted">
              No accounts yet. Create your first one to get started.
            </p>
            {canEdit && (
              <Link
                href={`/companies/${slug}/accounts/new`}
                className="mt-4 inline-block rounded-md bg-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90"
              >
                Create an account
              </Link>
            )}
          </div>
        ) : (
          <div className="mt-8 space-y-6">
            {typeGroups.map(({ group }) => (
              <div
                key={group[0].accountType.code}
                className="rounded-lg border border-border bg-surface"
              >
                <div className="border-b border-border px-5 py-3 text-sm font-semibold">
                  {group[0].accountType.name}
                </div>
                <AccountTree
                  accounts={group}
                  slug={slug}
                  canEdit={canEdit}
                  canDeactivate={canDeactivate}
                />
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function AccountTree({
  accounts,
  slug,
  canEdit,
  canDeactivate,
}: {
  accounts: AccountRow[];
  slug: string;
  canEdit: boolean;
  canDeactivate: boolean;
}) {
  const byParent = new Map<string | null, AccountRow[]>();
  for (const acc of accounts) {
    const key = acc.parentAccountId;
    if (!byParent.has(key)) byParent.set(key, []);
    byParent.get(key)!.push(acc);
  }

  function renderLevel(parentId: string | null, depth: number): ReactNode[] {
    const children = byParent.get(parentId) ?? [];
    return children.flatMap((acc) => [
      <div
        key={acc.id}
        className="flex items-center justify-between px-5 py-3 text-sm border-b border-border last:border-b-0"
        style={{ paddingLeft: `${20 + depth * 20}px` }}
      >
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs text-muted">{acc.code}</span>
          <span className={acc.isActive ? "" : "text-muted line-through"}>
            {acc.name}
          </span>
          {acc.isSystemAccount && (
            <span className="rounded-full bg-background px-2 py-0.5 text-[10px] text-muted">
              system
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {canEdit && (
            <Link
              href={`/companies/${slug}/accounts/${acc.id}/edit`}
              className="text-xs text-accent hover:underline"
            >
              Edit
            </Link>
          )}
          {canDeactivate && !acc.isSystemAccount && (
            <form
              action={toggleAccountActive.bind(null, slug, acc.id, !acc.isActive)}
            >
              <button type="submit" className="text-xs text-muted hover:text-ink">
                {acc.isActive ? "Deactivate" : "Reactivate"}
              </button>
            </form>
          )}
        </div>
      </div>,
      ...renderLevel(acc.id, depth + 1),
    ]);
  }

  return <div>{renderLevel(null, 0)}</div>;
}
