import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { requireCompanyMembership } from "@/lib/company-access";
import { ROLE_RANK, type RoleCode } from "@/lib/roles";
import { TopNav } from "@/components/top-nav";

export default async function JournalEntriesPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const user = await getCurrentUser();

  const company = await prisma.company.findUnique({ where: { slug } });
  if (!company) notFound();

  const membership = await requireCompanyMembership(user.id, company.id);
  const canCreate =
    ROLE_RANK.indexOf(membership.role.code as RoleCode) >=
    ROLE_RANK.indexOf("ACCOUNTANT");

  const entries = await prisma.journalEntry.findMany({
    where: { companyId: company.id },
    include: { lines: true, reversedEntry: true, reversalEntry: true },
    orderBy: [{ entryDate: "desc" }, { entryNumber: "desc" }],
  });

  return (
    <div className="flex min-h-full flex-col">
      <TopNav />
      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-10">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              Journal entries
            </h1>
            <p className="mt-1 text-sm text-muted">{company.name}</p>
          </div>
          {canCreate && (
            <Link
              href={`/companies/${slug}/journal-entries/new`}
              className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90"
            >
              + New entry
            </Link>
          )}
        </div>

        {entries.length === 0 ? (
          <div className="mt-10 rounded-lg border border-dashed border-border bg-surface p-10 text-center">
            <p className="text-sm text-muted">No journal entries yet.</p>
            {canCreate && (
              <Link
                href={`/companies/${slug}/journal-entries/new`}
                className="mt-4 inline-block rounded-md bg-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90"
              >
                Post your first entry
              </Link>
            )}
          </div>
        ) : (
          <div className="mt-8 overflow-hidden rounded-lg border border-border bg-surface">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted">
                  <th className="px-5 py-3 font-medium">Entry #</th>
                  <th className="px-5 py-3 font-medium">Date</th>
                  <th className="px-5 py-3 font-medium">Description</th>
                  <th className="px-5 py-3 text-right font-medium">Amount</th>
                  <th className="px-5 py-3 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => {
                  const total = entry.lines.reduce(
                    (sum, l) => sum + Number(l.debit),
                    0
                  );
                  return (
                    <tr key={entry.id} className="border-b border-border last:border-b-0">
                      <td className="px-5 py-3 font-mono text-xs">
                        <Link
                          href={`/companies/${slug}/journal-entries/${entry.id}`}
                          className="text-accent hover:underline"
                        >
                          {entry.entryNumber}
                        </Link>
                      </td>
                      <td className="px-5 py-3 text-muted">
                        {entry.entryDate.toISOString().slice(0, 10)}
                      </td>
                      <td className="px-5 py-3">
                        {entry.description ?? <span className="text-muted">—</span>}
                        {entry.reversedEntry && (
                          <span className="ml-2 rounded-full bg-background px-2 py-0.5 text-[10px] text-muted">
                            reversal
                          </span>
                        )}
                        {entry.reversalEntry && (
                          <span className="ml-2 rounded-full bg-background px-2 py-0.5 text-[10px] text-muted">
                            reversed
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-right font-mono">
                        {total.toFixed(2)}
                      </td>
                      <td className="px-5 py-3"></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
