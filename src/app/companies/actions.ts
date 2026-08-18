"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/dev-user";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

function slugify(name: string) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

async function uniqueSlug(base: string) {
  let slug = base || "company";
  let n = 1;
  while (await prisma.company.findUnique({ where: { slug } })) {
    n += 1;
    slug = `${base}-${n}`;
  }
  return slug;
}

export async function createCompany(formData: FormData) {
  const user = await getCurrentUser();

  const name = String(formData.get("name") ?? "").trim();
  if (!name) throw new Error("Company name is required");

  const slug = await uniqueSlug(slugify(name));

  // Look up default statuses/roles needed to create the record
  const activeStatus = await prisma.companyStatus.findUnique({
    where: { code: "PENDING_SETUP" },
  });
  const ownerRole = await prisma.companyUserRole.findUnique({
    where: { code: "OWNER" },
  });
  if (!activeStatus || !ownerRole) {
    throw new Error(
      "Required master data missing (company status / owner role). Check seed data."
    );
  }

  const taxRegistered = formData.get("taxRegistered") === "on";
  const taxFilingFrequencyId = formData.get("taxFilingFrequencyId");

  const company = await prisma.company.create({
    data: {
      name,
      slug,
      legalName: emptyToNull(formData.get("legalName")),
      registrationNumber: emptyToNull(formData.get("registrationNumber")),
      taxId: emptyToNull(formData.get("taxId")),
      industry: emptyToNull(formData.get("industry")),
      website: emptyToNull(formData.get("website")),
      email: emptyToNull(formData.get("email")),
      phone: emptyToNull(formData.get("phone")),
      addressLine: emptyToNull(formData.get("addressLine")),
      city: emptyToNull(formData.get("city")),
      state: emptyToNull(formData.get("state")),
      zip: emptyToNull(formData.get("zip")),
      fiscalYearStartMonth: Number(formData.get("fiscalYearStartMonth") ?? 1),
      taxRegistered,
      taxFilingFrequencyId: taxRegistered
        ? emptyToNull(taxFilingFrequencyId)
        : null,
      companyTypeId: String(formData.get("companyTypeId")),
      countryId: String(formData.get("countryId")),
      baseCurrencyId: String(formData.get("baseCurrencyId")),
      accountingMethodId: String(formData.get("accountingMethodId")),
      companyStatusId: activeStatus.id,
      companyUsers: {
        create: {
          userId: user.id,
          companyUserRoleId: ownerRole.id,
          isDefault: true,
        },
      },
    },
  });

  revalidatePath("/companies");
  redirect(`/companies/${company.slug}`);
}

export async function updateCompany(slug: string, formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) throw new Error("Company name is required");

  const taxRegistered = formData.get("taxRegistered") === "on";
  const taxFilingFrequencyId = formData.get("taxFilingFrequencyId");

  const updated = await prisma.company.update({
    where: { slug },
    data: {
      name,
      legalName: emptyToNull(formData.get("legalName")),
      registrationNumber: emptyToNull(formData.get("registrationNumber")),
      taxId: emptyToNull(formData.get("taxId")),
      industry: emptyToNull(formData.get("industry")),
      website: emptyToNull(formData.get("website")),
      email: emptyToNull(formData.get("email")),
      phone: emptyToNull(formData.get("phone")),
      addressLine: emptyToNull(formData.get("addressLine")),
      city: emptyToNull(formData.get("city")),
      state: emptyToNull(formData.get("state")),
      zip: emptyToNull(formData.get("zip")),
      fiscalYearStartMonth: Number(formData.get("fiscalYearStartMonth") ?? 1),
      taxRegistered,
      taxFilingFrequencyId: taxRegistered
        ? emptyToNull(taxFilingFrequencyId)
        : null,
      companyTypeId: String(formData.get("companyTypeId")),
      countryId: String(formData.get("countryId")),
      accountingMethodId: String(formData.get("accountingMethodId")),
      // Note: baseCurrencyId intentionally NOT updatable here —
      // locked once a company exists, per our earlier design decision.
    },
  });

  revalidatePath("/companies");
  revalidatePath(`/companies/${slug}`);
  redirect(`/companies/${updated.slug}`);
}

export async function archiveCompany(slug: string) {
  const archivedStatus = await prisma.companyStatus.findUnique({
    where: { code: "ARCHIVED" },
  });
  if (!archivedStatus) throw new Error("Archived status missing in master data");

  await prisma.company.update({
    where: { slug },
    data: { companyStatusId: archivedStatus.id },
  });

  revalidatePath("/companies");
  redirect("/companies");
}

function emptyToNull(value: FormDataEntryValue | null): string | null {
  const s = value == null ? "" : String(value).trim();
  return s === "" ? null : s;
}
