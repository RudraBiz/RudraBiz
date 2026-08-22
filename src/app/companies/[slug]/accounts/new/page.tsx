import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { requireCompanyRole } from "@/lib/company-access";
import { getOrSeedAccountTypes } from "@/lib/account-types";
import { TopNav } from "@/components/top-nav";
import { AccountForm } from "@/components/account-form";
import { createAccount } from "../actions";

export default async function NewAccountPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const user = await getCurrentUser();

  const company = await prisma.company.findUnique({ where: { slug } });
  if (!company) notFound();

  await requireCompanyRole(user.id, company.id, "ACCOUNTANT");

  const [accountTypes, existingAccounts] = await Promise.all([
    getOrSeedAccountTypes(),
    prisma.account.findMany({
      where: { companyId: company.id, isActive: true },
      orderBy: { code: "asc" },
    }),
  ]);

  const createWithSlug = createAccount.bind(null, slug);

  return (
    <div className="flex min-h-full flex-col">
      <TopNav />
      <main className="mx-auto w-full max-w-xl flex-1 px-6 py-10">
        <h1 className="text-2xl font-semibold tracking-tight">New account</h1>
        <p className="mt-1 text-sm text-muted">{company.name}</p>

        <AccountForm
          action={createWithSlug}
          accountTypes={accountTypes}
          existingAccounts={existingAccounts}
          cancelHref={`/companies/${slug}/accounts`}
        />
      </main>
    </div>
  );
}
