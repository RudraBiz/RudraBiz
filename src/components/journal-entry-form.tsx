"use client";

import { useState } from "react";

type AccountOption = { id: string; code: string; name: string };

type Line = { accountId: string; debit: string; credit: string; description: string };

function emptyLine(): Line {
  return { accountId: "", debit: "", credit: "", description: "" };
}

export function JournalEntryForm({
  action,
  accounts,
}: {
  action: (formData: FormData) => void;
  accounts: AccountOption[];
}) {
  const [lines, setLines] = useState<Line[]>([emptyLine(), emptyLine()]);

  function updateLine(index: number, patch: Partial<Line>) {
    setLines((prev) => prev.map((l, i) => (i === index ? { ...l, ...patch } : l)));
  }

  function addLine() {
    setLines((prev) => [...prev, emptyLine()]);
  }

  function removeLine(index: number) {
    setLines((prev) => (prev.length <= 2 ? prev : prev.filter((_, i) => i !== index)));
  }

  const totalDebit = lines.reduce((sum, l) => sum + (Number(l.debit) || 0), 0);
  const totalCredit = lines.reduce((sum, l) => sum + (Number(l.credit) || 0), 0);
  const isBalanced =
    Math.round(totalDebit * 100) === Math.round(totalCredit * 100) && totalDebit > 0;

  return (
    <form action={action} className="mt-8 space-y-6 rounded-lg border border-border bg-surface p-6">
      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="mb-1 block text-sm font-medium">Date</label>
          <input
            name="entryDate"
            type="date"
            required
            defaultValue={new Date().toISOString().slice(0, 10)}
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:border-accent focus:outline-none"
          />
        </div>
        <div className="col-span-2">
          <label className="mb-1 block text-sm font-medium">
            Description <span className="text-muted">(optional)</span>
          </label>
          <input
            name="description"
            placeholder="e.g. Owner capital contribution"
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:border-accent focus:outline-none"
          />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">
          Reference <span className="text-muted">(optional)</span>
        </label>
        <input
          name="reference"
          placeholder="Invoice #, check #, etc."
          className="w-full max-w-xs rounded-md border border-border bg-background px-3 py-2 text-sm focus:border-accent focus:outline-none"
        />
      </div>

      <div className="border-t border-border pt-5">
        <div className="mb-3 grid grid-cols-12 gap-2 text-xs font-medium text-muted">
          <div className="col-span-5">Account</div>
          <div className="col-span-2 text-right">Debit</div>
          <div className="col-span-2 text-right">Credit</div>
          <div className="col-span-2">Memo</div>
          <div className="col-span-1"></div>
        </div>

        <div className="space-y-2">
          {lines.map((line, i) => (
            <div key={i} className="grid grid-cols-12 items-center gap-2">
              <div className="col-span-5">
                <select
                  name={`lines[${i}].accountId`}
                  required
                  value={line.accountId}
                  onChange={(e) => updateLine(i, { accountId: e.target.value })}
                  className="w-full rounded-md border border-border bg-background px-2 py-2 text-sm focus:border-accent focus:outline-none"
                >
                  <option value="" disabled>
                    Select account
                  </option>
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.code} · {a.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-span-2">
                <input
                  name={`lines[${i}].debit`}
                  type="number"
                  step="0.01"
                  min="0"
                  value={line.debit}
                  onChange={(e) => updateLine(i, { debit: e.target.value, credit: "" })}
                  className="w-full rounded-md border border-border bg-background px-2 py-2 text-right text-sm focus:border-accent focus:outline-none"
                />
              </div>
              <div className="col-span-2">
                <input
                  name={`lines[${i}].credit`}
                  type="number"
                  step="0.01"
                  min="0"
                  value={line.credit}
                  onChange={(e) => updateLine(i, { credit: e.target.value, debit: "" })}
                  className="w-full rounded-md border border-border bg-background px-2 py-2 text-right text-sm focus:border-accent focus:outline-none"
                />
              </div>
              <div className="col-span-2">
                <input
                  name={`lines[${i}].description`}
                  value={line.description}
                  onChange={(e) => updateLine(i, { description: e.target.value })}
                  className="w-full rounded-md border border-border bg-background px-2 py-2 text-sm focus:border-accent focus:outline-none"
                />
              </div>
              <div className="col-span-1 text-right">
                {lines.length > 2 && (
                  <button
                    type="button"
                    onClick={() => removeLine(i)}
                    className="text-xs text-muted hover:text-ink"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={addLine}
          className="mt-3 text-sm text-accent hover:underline"
        >
          + Add line
        </button>

        <div className="mt-4 flex items-center justify-end gap-6 border-t border-border pt-4 text-sm">
          <span className="text-muted">
            Debits: <span className="font-mono">{totalDebit.toFixed(2)}</span>
          </span>
          <span className="text-muted">
            Credits: <span className="font-mono">{totalCredit.toFixed(2)}</span>
          </span>
          <span className={isBalanced ? "text-green-600" : "text-red-600"}>
            {isBalanced ? "Balanced" : "Out of balance"}
          </span>
        </div>
      </div>

      <div className="flex justify-end gap-3 border-t border-border pt-5">
        <button
          type="submit"
          disabled={!isBalanced}
          className="rounded-md bg-accent px-5 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
        >
          Post entry
        </button>
      </div>
    </form>
  );
}
