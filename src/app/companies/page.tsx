import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { TopNav } from "@/components/top-nav";

export default async function CompaniesPage() {
  const user = await getCurrentUser();

  const memberships = await prisma.companyUser.findMany({
    where: { userId: user.id },
    include: {
      role: true,
      company: { include: { companyStatus: true } },
    },
    orderBy: { joinedAt: "asc" },
  });

  return (
    <div className="flex min-h-full flex-col">
      <TopNav />
      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-10">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              Your companies
            </h1>
            <p className="mt-1 text-sm text-muted">
              Pick a company to work in, or create a new one.
            </p>
          </div>
          <Link
            href="/companies/new"
            className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90"
          >
            + New company
          </Link>
        </div>

        {memberships.length === 0 ? (
          <div className="mt-10 rounded-lg border border-dashed border-border bg-surface p-10 text-center">
            <p className="text-sm text-muted">
              No companies yet. Create your first one to get started.
            </p>
            <Link
              href="/companies/new"
              className="mt-4 inline-block rounded-md bg-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90"
            >
              Create a company
            </Link>
          </div>
        ) : (
          <ul className="mt-8 divide-y divide-border rounded-lg border border-border bg-surface">
            {memberships.map((m) => (
              <li key={m.id}>
                <Link
                  href={`/companies/${m.company.slug}`}
                  className="flex items-center justify-between px-5 py-4 hover:bg-background"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-md bg-accent-soft text-accent font-semibold">
                      {m.company.name.charAt(0).toUpperCase()}
                    </span>
                    <div>
                      <p className="font-medium">{m.company.name}</p>
                      <p className="text-xs text-muted">
                        {m.role.name} · {m.company.companyStatus.name}
                      </p>
                    </div>
                  </div>
                  <span className="text-sm text-muted">View →</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
