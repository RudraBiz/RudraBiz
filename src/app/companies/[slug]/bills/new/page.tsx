import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { requireCompanyRole } from "@/lib/company-access";
import { TopNav } from "@/components/top-nav";
import { BillForm } from "@/components/bill-form";
import { createBill } from "../actions";

export default async function NewBillPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const user = await getCurrentUser();

  const company = await prisma.company.findUnique({ where: { slug } });
  if (!company) notFound();

  await requireCompanyRole(user.id, company.id, "ACCOUNTANT");

  const [vendors, expenseAccounts] = await Promise.all([
    prisma.vendor.findMany({
      where: { companyId: company.id, isActive: true },
      orderBy: { name: "asc" },
    }),
    prisma.account.findMany({
      where: { companyId: company.id, isActive: true, accountType: { code: "EXPENSE" } },
      orderBy: { code: "asc" },
    }),
  ]);

  const createWithSlug = createBill.bind(null, slug);

  return (
    <div className="flex min-h-full flex-col">
      <TopNav />
      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-10">
        <h1 className="text-2xl font-semibold tracking-tight">New bill</h1>
        <p className="mt-1 text-sm text-muted">{company.name}</p>

        {vendors.length === 0 ? (
          <div className="mt-8 rounded-lg border border-dashed border-border bg-surface p-8 text-center text-sm text-muted">
            You need at least one vendor before creating a bill.{" "}
            <Link href={`/companies/${slug}/vendors/new`} className="text-accent hover:underline">
              Add a vendor
            </Link>
          </div>
        ) : expenseAccounts.length === 0 ? (
          <div className="mt-8 rounded-lg border border-dashed border-border bg-surface p-8 text-center text-sm text-muted">
            You need at least one Expense account in your Chart of Accounts
            before creating a bill.{" "}
            <Link href={`/companies/${slug}/accounts/new`} className="text-accent hover:underline">
              Add an account
            </Link>
          </div>
        ) : (
          <BillForm
            action={createWithSlug}
            vendors={vendors}
            expenseAccounts={expenseAccounts}
          />
        )}
      </main>
    </div>
  );
}
