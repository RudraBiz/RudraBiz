"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getDelegate, getTableConfig } from "@/lib/master-tables";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { getRoleId } from "@/lib/roles";
import { requireRole, ForbiddenError } from "@/lib/permissions";

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

export async function createCompany(formData: FormData) {
  const user = await getCurrentUser();

  const name = String(formData.get("name") ?? "").trim();
  if (!name) throw new Error("Company name is required");

  const slug = await uniqueSlug(name);
  const activeStatusId = await getStatusId("ACTIVE");
  const ownerRoleId = await getRoleId("OWNER");

  // First company for this user becomes their default — later companies don't.
  const existingMembershipCount = await prisma.companyUser.count({
    where: { userId: user.id },
  });

  const company = await prisma.company.create({
    data: {
      slug,
      name,
      legalName: emptyToNull(formData.get("legalName")),
      companyTypeId: String(formData.get("companyTypeId")),
      industry: emptyToNull(formData.get("industry")),
      registrationNumber: emptyToNull(formData.get("registrationNumber")),
      taxId: emptyToNull(formData.get("taxId")),

      email: emptyToNull(formData.get("email")),
      phone: emptyToNull(formData.get("phone")),
      website: emptyToNull(formData.get("website")),
      addressLine: emptyToNull(formData.get("addressLine")),
      city: emptyToNull(formData.get("city")),
      state: emptyToNull(formData.get("state")),
      zip: emptyToNull(formData.get("zip")),
      countryId: String(formData.get("countryId")),

      baseCurrencyId: String(formData.get("baseCurrencyId")),
      fiscalYearStartMonth: Number(formData.get("fiscalYearStartMonth") ?? 1),
      accountingMethodId: String(formData.get("accountingMethodId")),

      taxRegistered: formData.get("taxRegistered") === "on",
      taxFilingFrequencyId: emptyToNull(formData.get("taxFilingFrequencyId")),

      companyStatusId: activeStatusId,
    },
  });

  // The creator must be linked as a member, or the company they just made
  // would never show up in their own /companies list.
  await prisma.companyUser.create({
    data: {
      userId: user.id,
      companyId: company.id,
      companyUserRoleId: ownerRoleId,
      isDefault: existingMembershipCount === 0,
    },
  });

  revalidatePath("/", "layout");
  redirect(`/companies/${slug}`);
}

export async function updateCompany(slug: string, formData: FormData) {
  const user = await getCurrentUser();

  const company = await prisma.company.findUnique({ where: { slug } });
  if (!company) throw new Error("Company not found");

  await requireRole(user.id, company.id, "ADMIN");

  await prisma.company.update({
    where: { slug },
    data: {
      name: String(formData.get("name") ?? "").trim(),
      legalName: emptyToNull(formData.get("legalName")),
      companyTypeId: String(formData.get("companyTypeId")),
      industry: emptyToNull(formData.get("industry")),
      registrationNumber: emptyToNull(formData.get("registrationNumber")),
      taxId: emptyToNull(formData.get("taxId")),

      email: emptyToNull(formData.get("email")),
      phone: emptyToNull(formData.get("phone")),
      website: emptyToNull(formData.get("website")),
      addressLine: emptyToNull(formData.get("addressLine")),
      city: emptyToNull(formData.get("city")),
      state: emptyToNull(formData.get("state")),
      zip: emptyToNull(formData.get("zip")),
      countryId: String(formData.get("countryId")),

      // baseCurrencyId intentionally omitted — locked after creation
      fiscalYearStartMonth: Number(formData.get("fiscalYearStartMonth") ?? 1),
      accountingMethodId: String(formData.get("accountingMethodId")),

      taxRegistered: formData.get("taxRegistered") === "on",
      taxFilingFrequencyId: emptyToNull(formData.get("taxFilingFrequencyId")),
    },
  });

  revalidatePath("/", "layout");
  redirect(`/companies/${slug}`);
}

export async function archiveCompany(slug: string) {
  const user = await getCurrentUser();

  const company = await prisma.company.findUnique({ where: { slug } });
  if (!company) throw new Error("Company not found");

  await requireRole(user.id, company.id, "OWNER");

  const archivedStatusId = await getStatusId("ARCHIVED");

  await prisma.company.update({
    where: { slug },
    data: { companyStatusId: archivedStatusId },
  });

  revalidatePath("/", "layout");
  redirect("/companies");
}

/**
 * Adds an existing user (by email) to a company with the given role.
 * Only ADMIN or OWNER members can invite. The invited person must already
 * have a RudraBiz account — there's no email-invite flow yet, so if they
 * don't have one, this returns an error message instead of throwing, so
 * the calling form can display it inline.
 */
export async function inviteUserToCompany(
  companyId: string,
  email: string,
  roleCode: Parameters<typeof getRoleId>[0]
): Promise<{ error?: string }> {
  const inviter = await getCurrentUser();

  try {
    await requireRole(inviter.id, companyId, "ADMIN");
  } catch (err) {
    if (err instanceof ForbiddenError) {
      return { error: err.message };
    }
    throw err;
  }

  const invitedUser = await prisma.user.findUnique({
    where: { email: email.trim() },
  });

  if (!invitedUser) {
    return {
      error: `No RudraBiz account found for ${email}. They need to register first.`,
    };
  }

  const alreadyMember = await prisma.companyUser.findFirst({
    where: { userId: invitedUser.id, companyId },
  });
  if (alreadyMember) {
    return { error: `${email} is already a member of this company.` };
  }

  const roleId = await getRoleId(roleCode);

  await prisma.companyUser.create({
    data: {
      userId: invitedUser.id,
      companyId,
      companyUserRoleId: roleId,
      invitedById: inviter.id,
      isDefault: false,
    },
  });

  revalidatePath(`/companies`);
  return {};
}

function emptyToNull(v: FormDataEntryValue | null): string | null {
  const s = v == null ? "" : String(v).trim();
  return s === "" ? null : s;
}

async function getStatusId(code: string): Promise<string> {
  const status = await prisma.companyStatus.findUnique({ where: { code } });
  if (!status) throw new Error(`Missing CompanyStatus seed row for code "${code}"`);
  return status.id;
}

async function uniqueSlug(name: string): Promise<string> {
  const base = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  let slug = base || "company";
  let n = 1;
  while (await prisma.company.findUnique({ where: { slug } })) {
    slug = `${base}-${++n}`;
  }
  return slug;
}
