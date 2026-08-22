"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { requireRole } from "@/lib/permissions";

function emptyToNull(v: FormDataEntryValue | null): string | null {
  const s = v == null ? "" : String(v).trim();
  return s === "" ? null : s;
}

async function getCompanyOrThrow(slug: string) {
  const company = await prisma.company.findUnique({ where: { slug } });
  if (!company) throw new Error("Company not found");
  return company;
}

export async function createVendor(companySlug: string, formData: FormData) {
  const user = await getCurrentUser();
  const company = await getCompanyOrThrow(companySlug);

  await requireRole(user.id, company.id, "STAFF");

  const name = String(formData.get("name") ?? "").trim();
  if (!name) throw new Error("Vendor name is required.");

  await prisma.vendor.create({
    data: {
      companyId: company.id,
      name,
      email: emptyToNull(formData.get("email")),
      phone: emptyToNull(formData.get("phone")),
      address: emptyToNull(formData.get("address")),
    },
  });

  revalidatePath(`/companies/${companySlug}/vendors`);
  redirect(`/companies/${companySlug}/vendors`);
}
