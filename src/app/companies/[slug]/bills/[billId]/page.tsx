import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { requireCompanyMembership } from "@/lib/company-access";
import { ROLE_RANK, type RoleCode } from "@/lib/roles";
import { TopNav } from "@/components/top-nav";
import { recordBillPayment, voidBill } from "../actions";

export default async function BillDetailPage({
  params,
}: {
  params: Promise<{ slug: string; billId: string }>;
}) {
  const { slug, billId } = await params;
  const user = await getCurrentUser();

  const company = await prisma.company.findUnique({ where: { slug } });
  if (!company) notFound();

  const membership = await requireCompanyMembership(user.id, company.id);
  const canRecordPayment =
    ROLE_RANK.indexOf(membership.role.code as RoleCode) >=
    ROLE_RANK.indexOf("ACCOUNTANT");
  const canVoid =
    ROLE_RANK.indexOf(membership.role.code as RoleCode) >= ROLE_RANK.indexOf("ADMIN");

  const bill = await prisma.bill.findFirst({
    where: { id: billId, companyId: company.id },
    include: {
      vendor: true,
      lines: { include: { expenseAccount: true }, orderBy: { sortOrder: "asc" } },
      payments: { orderBy: { paymentDate: "desc" } },
      journalEntry: true,
    },
  });
  if (!bill) notFound();

  const paidFromAccounts = await prisma.account.findMany({
    where: { companyId: company.id, isActive: true, accountType: { code: "ASSET" } },
    orderBy: { code: "asc" },
  });

  const remaining = Number(bill.total) - Number(bill.amountPaid);
  const recordPaymentWithIds = recordBillPayment.bind(null, slug, bill.id);
  const voidWithIds = voidBill.bind(null, slug, bill.id);

  return (
    <div className="flex min-h-full flex-col">
      <TopNav />
      <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-10">
        <Link href={`/companies/${slug}/bills`} className="text-sm text-muted hover:text-ink">
          ← Bills
        </Link>

        <div className="mt-4 flex items-start justify-between">
          <div>
            <h1 className="font-mono text-2xl font-semibold tracking-tight">
              {bill.billNumber}
            </h1>
            <p className="mt-1 text-sm text-muted">
              {bill.vendor.name} · {bill.billDate.toISOString().slice(0, 10)}
              {bill.dueDate && ` · Due ${bill.dueDate.toISOString().slice(0, 10)}`}
            </p>
          </div>
          <span className="rounded-full bg-background px-3 py-1 text-xs">
            {bill.status}
          </span>
        </div>

        {bill.notes && <p className="mt-3 text-sm">{bill.notes}</p>}

        <div className="mt-6 overflow-hidden rounded-lg border border-border bg-surface">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted">
                <th className="px-5 py-3 font-medium">Description</th>
                <th className="px-5 py-3 font-medium">Account</th>
                <th className="px-5 py-3 text-right font-medium">Qty</th>
                <th className="px-5 py-3 text-right font-medium">Unit price</th>
                <th className="px-5 py-3 text-right font-medium">Amount</th>
              </tr>
            </thead>
            <tbody>
              {bill.lines.map((line) => (
                <tr key={line.id} className="border-b border-border last:border-b-0">
                  <td className="px-5 py-3">{line.description}</td>
                  <td className="px-5 py-3 text-muted">{line.expenseAccount.name}</td>
                  <td className="px-5 py-3 text-right font-mono">
                    {Number(line.quantity).toFixed(2)}
                  </td>
                  <td className="px-5 py-3 text-right font-mono">
                    {Number(line.unitPrice).toFixed(2)}
                  </td>
                  <td className="px-5 py-3 text-right font-mono">
                    {Number(line.lineTotal).toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-border font-medium">
                <td className="px-5 py-3" colSpan={4}>
                  Total
                </td>
                <td className="px-5 py-3 text-right font-mono">
                  {Number(bill.total).toFixed(2)}
                </td>
              </tr>
              {Number(bill.amountPaid) > 0 && (
                <tr>
                  <td className="px-5 py-2 text-muted" colSpan={4}>
                    Paid
                  </td>
                  <td className="px-5 py-2 text-right font-mono text-muted">
                    {Number(bill.amountPaid).toFixed(2)}
                  </td>
                </tr>
              )}
            </tfoot>
          </table>
        </div>

        {bill.payments.length > 0 && (
          <div className="mt-6">
            <h2 className="text-sm font-semibold">Payments</h2>
            <ul className="mt-2 divide-y divide-border rounded-lg border border-border bg-surface">
              {bill.payments.map((p) => (
                <li key={p.id} className="flex justify-between px-5 py-3 text-sm">
                  <span className="text-muted">
                    {p.paymentDate.toISOString().slice(0, 10)}
                  </span>
                  <span className="font-mono">{Number(p.amount).toFixed(2)}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {canRecordPayment && bill.status !== "VOID" && remaining > 0.001 && (
          <div className="mt-6 rounded-lg border border-border bg-surface p-5">
            <h2 className="text-sm font-semibold">Record a payment</h2>
            <form action={recordPaymentWithIds} className="mt-3 flex flex-wrap items-end gap-3">
              <div>
                <label className="mb-1 block text-xs font-medium">Amount</label>
                <input
                  name="amount"
                  type="number"
                  step="0.01"
                  min="0.01"
                  max={remaining}
                  defaultValue={remaining.toFixed(2)}
                  required
                  className="w-32 rounded-md border border-border bg-background px-3 py-2 text-sm focus:border-accent focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium">Date</label>
                <input
                  name="paymentDate"
                  type="date"
                  required
                  defaultValue={new Date().toISOString().slice(0, 10)}
                  className="rounded-md border border-border bg-background px-3 py-2 text-sm focus:border-accent focus:outline-none"
                />
              </div>
              <div className="flex-1 min-w-[180px]">
                <label className="mb-1 block text-xs font-medium">Paid from</label>
                <select
                  name="paidFromAccountId"
                  required
                  defaultValue=""
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:border-accent focus:outline-none"
                >
                  <option value="" disabled>
                    Select account
                  </option>
                  {paidFromAccounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.code} · {a.name}
                    </option>
                  ))}
                </select>
              </div>
              <button
                type="submit"
                className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90"
              >
                Record payment
              </button>
            </form>
          </div>
        )}

        {canVoid && bill.status !== "VOID" && bill.payments.length === 0 && (
          <form action={voidWithIds} className="mt-6">
            <button
              type="submit"
              className="rounded-md border border-border bg-surface px-4 py-2 text-sm font-medium text-muted hover:bg-background"
            >
              Void bill
            </button>
          </form>
        )}
      </main>
    </div>
  );
}
