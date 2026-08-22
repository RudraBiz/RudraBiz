import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { requireCompanyRole } from "@/lib/company-access";
import { getOrSeedAccountTypes } from "@/lib/account-types";
import { TopNav } from "@/components/top-nav";
import { AccountForm } from "@/components/account-form";
import { updateAccount } from "../../actions";

export default async function EditAccountPage({
  params,
}: {
  params: Promise<{ slug: string; accountId: string }>;
}) {
  const { slug, accountId } = await params;
  const user = await getCurrentUser();

  const company = await prisma.company.findUnique({ where: { slug } });
  if (!company) notFound();

  await requireCompanyRole(user.id, company.id, "ACCOUNTANT");

  const account = await prisma.account.findFirst({
    where: { id: accountId, companyId: company.id },
  });
  if (!account) notFound();

  const [accountTypes, existingAccounts] = await Promise.all([
    getOrSeedAccountTypes(),
    prisma.account.findMany({
      where: { companyId: company.id, isActive: true },
      orderBy: { code: "asc" },
    }),
  ]);

  const updateWithIds = updateAccount.bind(null, slug, accountId);

  return (
    <div className="flex min-h-full flex-col">
      <TopNav />
      <main className="mx-auto w-full max-w-xl flex-1 px-6 py-10">
        <h1 className="text-2xl font-semibold tracking-tight">
          Edit account
        </h1>
        <p className="mt-1 text-sm text-muted">
          {company.name} · {account.code}
        </p>

        {account.isSystemAccount && (
          <div className="mt-4 rounded-md border border-dashed border-border bg-background px-3 py-2 text-xs text-muted">
            This is a system account. Some fields may be restricted.
          </div>
        )}

        <AccountForm
          action={updateWithIds}
          accountTypes={accountTypes}
          existingAccounts={existingAccounts}
          excludeAccountId={account.id}
          cancelHref={`/companies/${slug}/accounts`}
          defaultValues={{
            code: account.code,
            name: account.name,
            description: account.description,
            accountTypeId: account.accountTypeId,
            parentAccountId: account.parentAccountId,
            openingBalance: account.openingBalance.toString(),
            openingBalanceAsOf: account.openingBalanceAsOf
              ? account.openingBalanceAsOf.toISOString().slice(0, 10)
              : null,
          }}
        />
      </main>
    </div>
  );
}
