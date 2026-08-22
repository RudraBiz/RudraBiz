"use client";

import { useState } from "react";

type VendorOption = { id: string; name: string };
type AccountOption = { id: string; code: string; name: string };

type Line = {
  description: string;
  quantity: string;
  unitPrice: string;
  expenseAccountId: string;
};

function emptyLine(): Line {
  return { description: "", quantity: "1", unitPrice: "", expenseAccountId: "" };
}

export function BillForm({
  action,
  vendors,
  expenseAccounts,
}: {
  action: (formData: FormData) => void;
  vendors: VendorOption[];
  expenseAccounts: AccountOption[];
}) {
  const [lines, setLines] = useState<Line[]>([emptyLine()]);

  function updateLine(index: number, patch: Partial<Line>) {
    setLines((prev) => prev.map((l, i) => (i === index ? { ...l, ...patch } : l)));
  }
  function addLine() {
    setLines((prev) => [...prev, emptyLine()]);
  }
  function removeLine(index: number) {
    setLines((prev) => (prev.length <= 1 ? prev : prev.filter((_, i) => i !== index)));
  }

  const total = lines.reduce(
    (sum, l) => sum + (Number(l.quantity) || 0) * (Number(l.unitPrice) || 0),
    0
  );

  return (
    <form action={action} className="mt-8 space-y-6 rounded-lg border border-border bg-surface p-6">
      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="mb-1 block text-sm font-medium">Vendor</label>
          <select
            name="vendorId"
            required
            defaultValue=""
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:border-accent focus:outline-none"
          >
            <option value="" disabled>
              Select vendor
            </option>
            {vendors.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Bill date</label>
          <input
            name="billDate"
            type="date"
            required
            defaultValue={new Date().toISOString().slice(0, 10)}
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:border-accent focus:outline-none"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">
            Due date <span className="text-muted">(optional)</span>
          </label>
          <input
            name="dueDate"
            type="date"
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:border-accent focus:outline-none"
          />
        </div>
      </div>

      <div className="border-t border-border pt-5">
        <div className="mb-3 grid grid-cols-12 gap-2 text-xs font-medium text-muted">
          <div className="col-span-4">Description</div>
          <div className="col-span-2 text-right">Qty</div>
          <div className="col-span-2 text-right">Unit price</div>
          <div className="col-span-3">Expense account</div>
          <div className="col-span-1"></div>
        </div>

        <div className="space-y-2">
          {lines.map((line, i) => (
            <div key={i} className="grid grid-cols-12 items-center gap-2">
              <div className="col-span-4">
                <input
                  name={`lines[${i}].description`}
                  required
                  value={line.description}
                  onChange={(e) => updateLine(i, { description: e.target.value })}
                  className="w-full rounded-md border border-border bg-background px-2 py-2 text-sm focus:border-accent focus:outline-none"
                />
              </div>
              <div className="col-span-2">
                <input
                  name={`lines[${i}].quantity`}
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={line.quantity}
                  onChange={(e) => updateLine(i, { quantity: e.target.value })}
                  className="w-full rounded-md border border-border bg-background px-2 py-2 text-right text-sm focus:border-accent focus:outline-none"
                />
              </div>
              <div className="col-span-2">
                <input
                  name={`lines[${i}].unitPrice`}
                  type="number"
                  step="0.01"
                  min="0"
                  value={line.unitPrice}
                  onChange={(e) => updateLine(i, { unitPrice: e.target.value })}
                  className="w-full rounded-md border border-border bg-background px-2 py-2 text-right text-sm focus:border-accent focus:outline-none"
                />
              </div>
              <div className="col-span-3">
                <select
                  name={`lines[${i}].expenseAccountId`}
                  required
                  value={line.expenseAccountId}
                  onChange={(e) => updateLine(i, { expenseAccountId: e.target.value })}
                  className="w-full rounded-md border border-border bg-background px-2 py-2 text-sm focus:border-accent focus:outline-none"
                >
                  <option value="" disabled>
                    Select account
                  </option>
                  {expenseAccounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.code} · {a.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-span-1 text-right">
                {lines.length > 1 && (
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

        <div className="mt-4 flex justify-end border-t border-border pt-4 text-sm">
          <span>
            Total: <span className="font-mono font-medium">{total.toFixed(2)}</span>
          </span>
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">
          Notes <span className="text-muted">(optional)</span>
        </label>
        <textarea
          name="notes"
          rows={2}
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:border-accent focus:outline-none"
        />
      </div>

      <div className="flex justify-end gap-3 border-t border-border pt-5">
        <button
          type="submit"
          className="rounded-md bg-accent px-5 py-2 text-sm font-medium text-white hover:opacity-90"
        >
          Create bill
        </button>
      </div>
    </form>
  );
}
