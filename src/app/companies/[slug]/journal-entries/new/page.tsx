import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { requireCompanyRole } from "@/lib/company-access";
import { TopNav } from "@/components/top-nav";
import { JournalEntryForm } from "@/components/journal-entry-form";
import { createJournalEntry } from "../actions";

export default async function NewJournalEntryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const user = await getCurrentUser();

  const company = await prisma.company.findUnique({ where: { slug } });
  if (!company) notFound();

  await requireCompanyRole(user.id, company.id, "ACCOUNTANT");

  const accounts = await prisma.account.findMany({
    where: { companyId: company.id, isActive: true },
    orderBy: { code: "asc" },
  });

  const createWithSlug = createJournalEntry.bind(null, slug);

  return (
    <div className="flex min-h-full flex-col">
      <TopNav />
      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-10">
        <h1 className="text-2xl font-semibold tracking-tight">
          New journal entry
        </h1>
        <p className="mt-1 text-sm text-muted">{company.name}</p>

        {accounts.length < 2 ? (
          <div className="mt-8 rounded-lg border border-dashed border-border bg-surface p-8 text-center text-sm text-muted">
            You need at least two accounts in your Chart of Accounts before
            you can post a journal entry.
          </div>
        ) : (
          <JournalEntryForm action={createWithSlug} accounts={accounts} />
        )}
      </main>
    </div>
  );
}
