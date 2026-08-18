import Link from "next/link";
import { notFound } from "next/navigation";
import { TopNav } from "@/components/top-nav";
import { getDelegate, getTableConfig } from "@/lib/master-tables";
import { updateEntry } from "../../actions";

export default async function EditEntryPage({
  params,
}: {
  params: Promise<{ table: string; id: string }>;
}) {
  const { table, id } = await params;
  const config = getTableConfig(table);
  if (!config) notFound();

  const delegate = getDelegate(table);
  const entry = await delegate.findUnique({ where: { id } });
  if (!entry) notFound();

  const updateEntryForId = updateEntry.bind(null, table, id);

  return (
    <div className="flex min-h-full flex-col">
      <TopNav />
      <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-10">
        <Link
          href={`/settings/${table}`}
          className="text-sm text-muted hover:text-ink"
        >
          ← {config.label}
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">
          Edit {config.singular}
        </h1>

        <form
          action={updateEntryForId}
          className="mt-6 space-y-4 rounded-lg border border-border bg-surface p-6"
        >
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
                  defaultValue={entry[field.key] ?? ""}
                  className="w-full rounded-md border border-border bg-white px-3 py-2 text-sm outline-none focus:border-accent focus:ring-1 focus:ring-accent"
                />
              ) : (
                <input
                  type={field.type === "number" ? "number" : "text"}
                  name={field.key}
                  required={field.required}
                  defaultValue={entry[field.key] ?? ""}
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

          <label className="flex items-center gap-2 border-t border-border pt-4 text-sm">
            <input
              type="checkbox"
              name="isActive"
              defaultChecked={entry.isActive}
              className="h-4 w-4"
            />
            Active
          </label>

          <div className="flex justify-end gap-3 border-t border-border pt-4">
            <Link
              href={`/settings/${table}`}
              className="rounded-md px-4 py-2 text-sm font-medium text-muted hover:text-ink"
            >
              Cancel
            </Link>
            <button
              type="submit"
              className="rounded-md bg-accent px-5 py-2 text-sm font-medium text-white hover:opacity-90"
            >
              Save changes
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
