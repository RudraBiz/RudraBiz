import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { requireCompanyRole } from "@/lib/company-access";
import { TopNav } from "@/components/top-nav";
import { InvoiceForm } from "@/components/invoice-form";
import { createInvoice } from "../actions";

export default async function NewInvoicePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const user = await getCurrentUser();

  const company = await prisma.company.findUnique({ where: { slug } });
  if (!company) notFound();

  await requireCompanyRole(user.id, company.id, "ACCOUNTANT");

  const [customers, revenueAccounts] = await Promise.all([
    prisma.customer.findMany({
      where: { companyId: company.id, isActive: true },
      orderBy: { name: "asc" },
    }),
    prisma.account.findMany({
      where: { companyId: company.id, isActive: true, accountType: { code: "INCOME" } },
      orderBy: { code: "asc" },
    }),
  ]);

  const createWithSlug = createInvoice.bind(null, slug);

  return (
    <div className="flex min-h-full flex-col">
      <TopNav />
      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-10">
        <h1 className="text-2xl font-semibold tracking-tight">New invoice</h1>
        <p className="mt-1 text-sm text-muted">{company.name}</p>

        {customers.length === 0 ? (
          <div className="mt-8 rounded-lg border border-dashed border-border bg-surface p-8 text-center text-sm text-muted">
            You need at least one customer before creating an invoice.{" "}
            <Link href={`/companies/${slug}/customers/new`} className="text-accent hover:underline">
              Add a customer
            </Link>
          </div>
        ) : revenueAccounts.length === 0 ? (
          <div className="mt-8 rounded-lg border border-dashed border-border bg-surface p-8 text-center text-sm text-muted">
            You need at least one Income account in your Chart of Accounts
            before creating an invoice.{" "}
            <Link href={`/companies/${slug}/accounts/new`} className="text-accent hover:underline">
              Add an account
            </Link>
          </div>
        ) : (
          <InvoiceForm
            action={createWithSlug}
            customers={customers}
            revenueAccounts={revenueAccounts}
          />
        )}
      </main>
    </div>
  );
}
