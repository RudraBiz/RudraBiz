import Link from "next/link";
import { notFound } from "next/navigation";
import { TopNav } from "@/components/top-nav";
import { getDelegate, getTableConfig } from "@/lib/master-tables";
import { createEntry, toggleActive } from "./actions";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Entry = Record<string, any>;

export default async function TableSettingsPage({
  params,
}: {
  params: Promise<{ table: string }>;
}) {
  const { table } = await params;
  const config = getTableConfig(table);
  if (!config) notFound();

  const delegate = getDelegate(table);
  const entries: Entry[] = await delegate.findMany({
    orderBy: [{ isActive: "desc" }, { name: "asc" }],
  });

  const listFields = config.fields.filter((f) => f.type !== "textarea");

  const createEntryForTable = createEntry.bind(null, table);

  return (
    <div className="flex min-h-full flex-col">
      <TopNav />
      <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-10">
        <Link href="/settings" className="text-sm text-muted hover:text-ink">
          ← All settings
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">
          {config.label}
        </h1>

        {entries.length === 0 ? (
          <p className="mt-6 text-sm text-muted">
            No {config.label.toLowerCase()} yet. Add the first one below.
          </p>
        ) : (
          <ul className="mt-6 divide-y divide-border rounded-lg border border-border bg-surface">
            {entries.map((entry) => (
              <li
                key={entry.id}
                className="flex items-center justify-between gap-3 px-5 py-3"
              >
                <div className="min-w-0">
                  <p className="font-medium">
                    {entry.name}
                    {!entry.isActive && (
                      <span className="ml-2 rounded-full bg-background px-2 py-0.5 text-xs font-normal text-muted">
                        Inactive
                      </span>
                    )}
                  </p>
                  <p className="truncate text-xs text-muted">
                    {listFields
                      .filter((f) => f.key !== "name")
                      .map((f) => `${f.label}: ${entry[f.key] ?? "—"}`)
                      .join(" · ")}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-3 text-sm">
                  <Link
                    href={`/settings/${table}/${entry.id}/edit`}
                    className="text-accent hover:opacity-80"
                  >
                    Edit
                  </Link>
                  <form
                    action={toggleActive.bind(
                      null,
                      table,
                      entry.id,
                      !entry.isActive
                    )}
                  >
                    <button
                      type="submit"
                      className="text-muted hover:text-ink"
                    >
                      {entry.isActive ? "Deactivate" : "Activate"}
                    </button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        )}

        <form
          action={createEntryForTable}
          className="mt-8 space-y-4 rounded-lg border border-border bg-surface p-6"
        >
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
            Add {config.singular}
          </h2>
          {config.fields.map((field) => (
            <label key={field.key} className="block text-sm">
              <span className="mb-1 block font-medium text-ink">
                {field.label}
                {field.required && <span className="text-danger"> *</span>}
              </span>
              {field.type === "textarea" ? (
                <textarea
                  name={field.key}
                  rows={2}
                  className="w-full rounded-md border border-border bg-white px-3 py-2 text-sm outline-none focus:border-accent focus:ring-1 focus:ring-accent"
                />
              ) : (
                <input
                  type={field.type === "number" ? "number" : "text"}
                  name={field.key}
                  required={field.required}
                  defaultValue={field.defaultValue as string | number | undefined}
                  className="w-full rounded-md border border-border bg-white px-3 py-2 text-sm outline-none focus:border-accent focus:ring-1 focus:ring-accent"
                />
              )}
              {field.hint && (
                <span className="mt-1 block text-xs text-muted">
                  {field.hint}
                </span>
              )}
            </label>
          ))}
          <div className="flex justify-end border-t border-border pt-4">
            <button
              type="submit"
              className="rounded-md bg-accent px-5 py-2 text-sm font-medium text-white hover:opacity-90"
            >
              Add {config.singular}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
