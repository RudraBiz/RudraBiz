import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { requireCompanyRole } from "@/lib/company-access";
import { TopNav } from "@/components/top-nav";
import { createCustomer } from "../actions";

export default async function NewCustomerPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const user = await getCurrentUser();

  const company = await prisma.company.findUnique({ where: { slug } });
  if (!company) notFound();

  await requireCompanyRole(user.id, company.id, "STAFF");

  const createWithSlug = createCustomer.bind(null, slug);

  return (
    <div className="flex min-h-full flex-col">
      <TopNav />
      <main className="mx-auto w-full max-w-xl flex-1 px-6 py-10">
        <h1 className="text-2xl font-semibold tracking-tight">New customer</h1>
        <p className="mt-1 text-sm text-muted">{company.name}</p>

        <form
          action={createWithSlug}
          className="mt-8 space-y-4 rounded-lg border border-border bg-surface p-6"
        >
          <div>
            <label className="mb-1 block text-sm font-medium">Name</label>
            <input
              name="name"
              required
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:border-accent focus:outline-none"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium">
                Email <span className="text-muted">(optional)</span>
              </label>
              <input
                name="email"
                type="email"
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:border-accent focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">
                Phone <span className="text-muted">(optional)</span>
              </label>
              <input
                name="phone"
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:border-accent focus:outline-none"
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">
              Address <span className="text-muted">(optional)</span>
            </label>
            <textarea
              name="address"
              rows={2}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:border-accent focus:outline-none"
            />
          </div>
          <div className="flex justify-end border-t border-border pt-4">
            <button
              type="submit"
              className="rounded-md bg-accent px-5 py-2 text-sm font-medium text-white hover:opacity-90"
            >
              Save customer
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
