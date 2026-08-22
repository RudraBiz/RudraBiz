import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { requireCompanyMembership } from "@/lib/company-access";
import { ROLE_RANK, type RoleCode } from "@/lib/roles";
import { TopNav } from "@/components/top-nav";

export default async function VendorsPage({
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
    ROLE_RANK.indexOf("STAFF");

  const vendors = await prisma.vendor.findMany({
    where: { companyId: company.id },
    orderBy: { name: "asc" },
  });

  return (
    <div className="flex min-h-full flex-col">
      <TopNav />
      <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-10">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Vendors</h1>
            <p className="mt-1 text-sm text-muted">{company.name}</p>
          </div>
          {canCreate && (
            <Link
              href={`/companies/${slug}/vendors/new`}
              className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90"
            >
              + New vendor
            </Link>
          )}
        </div>

        {vendors.length === 0 ? (
          <div className="mt-10 rounded-lg border border-dashed border-border bg-surface p-10 text-center">
            <p className="text-sm text-muted">No vendors yet.</p>
          </div>
        ) : (
          <div className="mt-8 divide-y divide-border rounded-lg border border-border bg-surface">
            {vendors.map((v) => (
              <div key={v.id} className="flex items-center justify-between px-5 py-3 text-sm">
                <div>
                  <p className="font-medium">{v.name}</p>
                  {v.email && <p className="text-xs text-muted">{v.email}</p>}
                </div>
                {!v.isActive && <span className="text-xs text-muted">inactive</span>}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
