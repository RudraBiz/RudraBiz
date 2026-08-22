type AccountTypeOption = { id: string; name: string; code: string };
type ExistingAccountOption = { id: string; code: string; name: string };

export function AccountForm({
  action,
  accountTypes,
  existingAccounts,
  cancelHref,
  defaultValues,
  excludeAccountId,
}: {
  action: (formData: FormData) => void;
  accountTypes: AccountTypeOption[];
  existingAccounts: ExistingAccountOption[];
  cancelHref: string;
  defaultValues?: {
    code?: string;
    name?: string;
    description?: string | null;
    accountTypeId?: string;
    parentAccountId?: string | null;
    openingBalance?: string;
    openingBalanceAsOf?: string | null;
  };
  // When editing, exclude the account itself from the parent dropdown —
  // an account can't be its own parent.
  excludeAccountId?: string;
}) {
  const parentOptions = existingAccounts.filter((a) => a.id !== excludeAccountId);

  return (
    <form
      action={action}
      className="mt-8 space-y-5 rounded-lg border border-border bg-surface p-6"
    >
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="mb-1 block text-sm font-medium">Code</label>
          <input
            name="code"
            required
            defaultValue={defaultValues?.code}
            placeholder="1000"
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:border-accent focus:outline-none"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Account type</label>
          <select
            name="accountTypeId"
            required
            defaultValue={defaultValues?.accountTypeId ?? ""}
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:border-accent focus:outline-none"
          >
            <option value="" disabled>
              Select type
            </option>
            {accountTypes.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">Name</label>
        <input
          name="name"
          required
          defaultValue={defaultValues?.name}
          placeholder="Cash on hand"
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:border-accent focus:outline-none"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">
          Parent account <span className="text-muted">(optional)</span>
        </label>
        <select
          name="parentAccountId"
          defaultValue={defaultValues?.parentAccountId ?? ""}
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:border-accent focus:outline-none"
        >
          <option value="">None — top level</option>
          {parentOptions.map((a) => (
            <option key={a.id} value={a.id}>
              {a.code} · {a.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">
          Description <span className="text-muted">(optional)</span>
        </label>
        <textarea
          name="description"
          defaultValue={defaultValues?.description ?? ""}
          rows={2}
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:border-accent focus:outline-none"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="mb-1 block text-sm font-medium">
            Opening balance
          </label>
          <input
            name="openingBalance"
            type="number"
            step="0.01"
            defaultValue={defaultValues?.openingBalance ?? "0"}
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:border-accent focus:outline-none"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">
            As of <span className="text-muted">(optional)</span>
          </label>
          <input
            name="openingBalanceAsOf"
            type="date"
            defaultValue={defaultValues?.openingBalanceAsOf ?? ""}
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:border-accent focus:outline-none"
          />
        </div>
      </div>

      <div className="flex justify-end gap-3 border-t border-border pt-5">
        <a
          href={cancelHref}
          className="rounded-md px-4 py-2 text-sm font-medium text-muted hover:text-ink"
        >
          Cancel
        </a>
        <button
          type="submit"
          className="rounded-md bg-accent px-5 py-2 text-sm font-medium text-white hover:opacity-90"
        >
          Save account
        </button>
      </div>
    </form>
  );
}
