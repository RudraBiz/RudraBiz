import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { requireCompanyMembership } from "@/lib/company-access";
import { ROLE_RANK, type RoleCode } from "@/lib/roles";
import { TopNav } from "@/components/top-nav";

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    OPEN: "bg-background text-muted",
    PAID: "bg-green-100 text-green-700",
    VOID: "bg-background text-muted line-through",
  };
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs ${styles[status] ?? ""}`}>
      {status}
    </span>
  );
}

export default async function BillsPage({
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

  const bills = await prisma.bill.findMany({
    where: { companyId: company.id },
    include: { vendor: true },
    orderBy: { billDate: "desc" },
  });

  return (
    <div className="flex min-h-full flex-col">
      <TopNav />
      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-10">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Bills</h1>
            <p className="mt-1 text-sm text-muted">{company.name}</p>
          </div>
          <div className="flex gap-2">
            <Link
              href={`/companies/${slug}/vendors`}
              className="rounded-md border border-border bg-surface px-4 py-2 text-sm font-medium hover:bg-background"
            >
              Vendors
            </Link>
            {canCreate && (
              <Link
                href={`/companies/${slug}/bills/new`}
                className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90"
              >
                + New bill
              </Link>
            )}
          </div>
        </div>

        {bills.length === 0 ? (
          <div className="mt-10 rounded-lg border border-dashed border-border bg-surface p-10 text-center">
            <p className="text-sm text-muted">No bills yet.</p>
          </div>
        ) : (
          <div className="mt-8 overflow-hidden rounded-lg border border-border bg-surface">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted">
                  <th className="px-5 py-3 font-medium">Bill #</th>
                  <th className="px-5 py-3 font-medium">Vendor</th>
                  <th className="px-5 py-3 font-medium">Date</th>
                  <th className="px-5 py-3 text-right font-medium">Total</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {bills.map((bill) => (
                  <tr key={bill.id} className="border-b border-border last:border-b-0">
                    <td className="px-5 py-3 font-mono text-xs">
                      <Link
                        href={`/companies/${slug}/bills/${bill.id}`}
                        className="text-accent hover:underline"
                      >
                        {bill.billNumber}
                      </Link>
                    </td>
                    <td className="px-5 py-3">{bill.vendor.name}</td>
                    <td className="px-5 py-3 text-muted">
                      {bill.billDate.toISOString().slice(0, 10)}
                    </td>
                    <td className="px-5 py-3 text-right font-mono">
                      {Number(bill.total).toFixed(2)}
                    </td>
                    <td className="px-5 py-3">
                      <StatusBadge status={bill.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
