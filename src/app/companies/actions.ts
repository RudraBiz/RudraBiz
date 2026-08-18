"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getDelegate, getTableConfig } from "@/lib/master-tables";

function buildData(table: string, formData: FormData) {
  const config = getTableConfig(table);
  if (!config) throw new Error(`Unknown master table: ${table}`);

  const data: Record<string, string | number | boolean | null> = {};
  for (const field of config.fields) {
    const raw = formData.get(field.key);
    if (field.type === "number") {
      data[field.key] = raw === null || raw === "" ? (field.defaultValue as number) ?? 0 : Number(raw);
    } else {
      const s = raw == null ? "" : String(raw).trim();
      if (s === "" && !field.required) {
        data[field.key] = null;
      } else {
        data[field.key] = s;
      }
    }
  }
  return data;
}

export async function createEntry(table: string, formData: FormData) {
  const delegate = getDelegate(table);
  const data = buildData(table, formData);

  await delegate.create({ data: { ...data, isActive: true } });

  // Master data feeds dropdowns on other pages (e.g. /companies/new) and
  // the /settings index counts — bust the whole cache tree, not just this
  // table's own page.
  revalidatePath("/", "layout");
  redirect(`/settings/${table}`);
}

export async function updateEntry(table: string, id: string, formData: FormData) {
  const delegate = getDelegate(table);
  const data = buildData(table, formData);
  const isActive = formData.get("isActive") === "on";

  await delegate.update({ where: { id }, data: { ...data, isActive } });

  revalidatePath("/", "layout");
  redirect(`/settings/${table}`);
}

export async function toggleActive(table: string, id: string, nextIsActive: boolean) {
  const delegate = getDelegate(table);
  await delegate.update({ where: { id }, data: { isActive: nextIsActive } });
  revalidatePath("/", "layout");
}
