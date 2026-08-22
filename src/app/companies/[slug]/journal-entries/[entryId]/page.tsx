import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { requireCompanyMembership } from "@/lib/company-access";
import { ROLE_RANK, type RoleCode } from "@/lib/roles";
import { TopNav } from "@/components/top-nav";
import { reverseJournalEntry } from "../actions";

export default async function JournalEntryDetailPage({
  params,
}: {
  params: Promise<{ slug: string; entryId: string }>;
}) {
  const { slug, entryId } = await params;
  const user = await getCurrentUser();

  const company = await prisma.company.findUnique({ where: { slug } });
  if (!company) notFound();

  const membership = await requireCompanyMembership(user.id, company.id);
  const canReverse =
    ROLE_RANK.indexOf(membership.role.code as RoleCode) >=
    ROLE_RANK.indexOf("ACCOUNTANT");

  const entry = await prisma.journalEntry.findFirst({
    where: { id: entryId, companyId: company.id },
    include: {
      lines: { include: { account: true }, orderBy: { lineOrder: "asc" } },
      createdBy: true,
      reversedEntry: true,
      reversalEntry: true,
    },
  });

  if (!entry) notFound();

  const totalDebit = entry.lines.reduce((s, l) => s + Number(l.debit), 0);
  const totalCredit = entry.lines.reduce((s, l) => s + Number(l.credit), 0);

  const reverseWithIds = reverseJournalEntry.bind(null, slug, entry.id);

  return (
    <div className="flex min-h-full flex-col">
      <TopNav />
      <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-10">
        <Link
          href={`/companies/${slug}/journal-entries`}
          className="text-sm text-muted hover:text-ink"
        >
          ← Journal entries
        </Link>

        <div className="mt-4 flex items-start justify-between">
          <div>
            <h1 className="font-mono text-2xl font-semibold tracking-tight">
              {entry.entryNumber}
            </h1>
            <p className="mt-1 text-sm text-muted">
              {entry.entryDate.toISOString().slice(0, 10)}
              {entry.reference && ` · Ref: ${entry.reference}`}
            </p>
          </div>

          {canReverse && !entry.reversalEntry && !entry.reversedEntry && (
            <form action={reverseWithIds}>
              <button
                type="submit"
                className="rounded-md border border-border bg-surface px-4 py-2 text-sm font-medium hover:bg-background"
              >
                Reverse entry
              </button>
            </form>
          )}
        </div>

        {entry.description && (
          <p className="mt-3 text-sm">{entry.description}</p>
        )}

        {entry.reversedEntry && (
          <p className="mt-2 text-xs text-muted">
            Reverses{" "}
            <Link
              href={`/companies/${slug}/journal-entries/${entry.reversedEntry.id}`}
              className="text-accent hover:underline"
            >
              {entry.reversedEntry.entryNumber}
            </Link>
          </p>
        )}
        {entry.reversalEntry && (
          <p className="mt-2 text-xs text-muted">
            Reversed by{" "}
            <Link
              href={`/companies/${slug}/journal-entries/${entry.reversalEntry.id}`}
              className="text-accent hover:underline"
            >
              {entry.reversalEntry.entryNumber}
            </Link>
          </p>
        )}

        <div className="mt-6 overflow-hidden rounded-lg border border-border bg-surface">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted">
                <th className="px-5 py-3 font-medium">Account</th>
                <th className="px-5 py-3 font-medium">Memo</th>
                <th className="px-5 py-3 text-right font-medium">Debit</th>
                <th className="px-5 py-3 text-right font-medium">Credit</th>
              </tr>
            </thead>
            <tbody>
              {entry.lines.map((line) => (
                <tr key={line.id} className="border-b border-border last:border-b-0">
                  <td className="px-5 py-3">
                    <span className="font-mono text-xs text-muted">
                      {line.account.code}
                    </span>{" "}
                    {line.account.name}
                  </td>
                  <td className="px-5 py-3 text-muted">
                    {line.description ?? "—"}
                  </td>
                  <td className="px-5 py-3 text-right font-mono">
                    {Number(line.debit) > 0 ? Number(line.debit).toFixed(2) : ""}
                  </td>
                  <td className="px-5 py-3 text-right font-mono">
                    {Number(line.credit) > 0 ? Number(line.credit).toFixed(2) : ""}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-border font-medium">
                <td className="px-5 py-3" colSpan={2}>
                  Total
                </td>
                <td className="px-5 py-3 text-right font-mono">
                  {totalDebit.toFixed(2)}
                </td>
                <td className="px-5 py-3 text-right font-mono">
                  {totalCredit.toFixed(2)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        <p className="mt-4 text-xs text-muted">
          Created by {entry.createdBy.name ?? entry.createdBy.email}
        </p>
      </main>
    </div>
  );
}
