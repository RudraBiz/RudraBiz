import Link from "next/link";
import { TopNav } from "@/components/top-nav";
import { TABLES, getDelegate } from "@/lib/master-tables";

export default async function SettingsPage() {
  const counts = await Promise.all(
    TABLES.map(async (t) => {
      const delegate = getDelegate(t.slug);
      const [total, active] = await Promise.all([
        delegate.count(),
        delegate.count({ where: { isActive: true } }),
      ]);
      return { slug: t.slug, total, active };
    })
  );

  return (
    <div className="flex min-h-full flex-col">
      <TopNav />
      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-10">
        <h1 className="text-2xl font-semibold tracking-tight">
          Global settings
        </h1>
        <p className="mt-1 text-sm text-muted">
          Manage the dropdown options used across companies — set these up
          before creating your first company.
        </p>

        <ul className="mt-8 divide-y divide-border rounded-lg border border-border bg-surface">
          {TABLES.map((t) => {
            const c = counts.find((c) => c.slug === t.slug)!;
            return (
              <li key={t.slug}>
                <Link
                  href={`/settings/${t.slug}`}
                  className="flex items-center justify-between px-5 py-4 hover:bg-background"
                >
                  <div>
                    <p className="font-medium">{t.label}</p>
                    <p className="text-xs text-muted">
                      {c.active} active · {c.total} total
                    </p>
                  </div>
                  <span className="text-sm text-muted">Manage →</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </main>
    </div>
  );
}
