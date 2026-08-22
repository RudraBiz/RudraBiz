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

/**
 * Walks up the parent chain starting at candidateParentId to make sure
 * accountId (the account being edited) isn't its own ancestor — prevents
 * creating a cycle in the hierarchy (e.g. A → parent B → parent A).
 */
async function wouldCreateCycle(
  companyId: string,
  accountId: string,
  candidateParentId: string
): Promise<boolean> {
  let currentId: string | null = candidateParentId;
  const visited = new Set<string>();

  while (currentId) {
    if (currentId === accountId) return true;
    if (visited.has(currentId)) return true; // defensive: existing bad data
    visited.add(currentId);

    const current: { parentAccountId: string | null } | null =
      await prisma.account.findFirst({
        where: { id: currentId, companyId },
        select: { parentAccountId: true },
      });

    if (!current) return false; // parent chain leaves the company or ends
    currentId = current.parentAccountId;
  }

  return false;
}

export async function createAccount(companySlug: string, formData: FormData) {
  const user = await getCurrentUser();
  const company = await getCompanyOrThrow(companySlug);

  await requireRole(user.id, company.id, "ACCOUNTANT");

  const code = String(formData.get("code") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const accountTypeId = String(formData.get("accountTypeId") ?? "");
  const parentAccountId = emptyToNull(formData.get("parentAccountId"));

  if (!code || !name || !accountTypeId) {
    throw new Error("Code, name, and account type are required.");
  }

  if (parentAccountId) {
    const parent = await prisma.account.findFirst({
      where: { id: parentAccountId, companyId: company.id },
    });
    if (!parent) {
      throw new Error("Selected parent account does not belong to this company.");
    }
  }

  const openingBalanceRaw = formData.get("openingBalance");
  const openingBalance =
    openingBalanceRaw && String(openingBalanceRaw).trim() !== ""
      ? String(openingBalanceRaw).trim()
      : "0";
  const openingBalanceAsOfRaw = emptyToNull(formData.get("openingBalanceAsOf"));

  await prisma.account.create({
    data: {
      companyId: company.id,
      code,
      name,
      description: emptyToNull(formData.get("description")),
      accountTypeId,
      parentAccountId,
      openingBalance,
      openingBalanceAsOf: openingBalanceAsOfRaw ? new Date(openingBalanceAsOfRaw) : null,
    },
  });

  revalidatePath(`/companies/${companySlug}/accounts`);
  redirect(`/companies/${companySlug}/accounts`);
}

export async function updateAccount(
  companySlug: string,
  accountId: string,
  formData: FormData
) {
  const user = await getCurrentUser();
  const company = await getCompanyOrThrow(companySlug);

  await requireRole(user.id, company.id, "ACCOUNTANT");

  const existing = await prisma.account.findFirst({
    where: { id: accountId, companyId: company.id },
  });
  if (!existing) throw new Error("Account not found in this company.");

  const code = String(formData.get("code") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const accountTypeId = String(formData.get("accountTypeId") ?? "");
  const parentAccountId = emptyToNull(formData.get("parentAccountId"));

  if (!code || !name || !accountTypeId) {
    throw new Error("Code, name, and account type are required.");
  }

  if (parentAccountId) {
    if (parentAccountId === accountId) {
      throw new Error("An account cannot be its own parent.");
    }

    const parent = await prisma.account.findFirst({
      where: { id: parentAccountId, companyId: company.id },
    });
    if (!parent) {
      throw new Error("Selected parent account does not belong to this company.");
    }

    if (await wouldCreateCycle(company.id, accountId, parentAccountId)) {
      throw new Error("That parent would create a circular hierarchy.");
    }
  }

  const openingBalanceRaw = formData.get("openingBalance");
  const openingBalance =
    openingBalanceRaw && String(openingBalanceRaw).trim() !== ""
      ? String(openingBalanceRaw).trim()
      : "0";
  const openingBalanceAsOfRaw = emptyToNull(formData.get("openingBalanceAsOf"));

  await prisma.account.update({
    where: { id: accountId },
    data: {
      code,
      name,
      description: emptyToNull(formData.get("description")),
      accountTypeId,
      parentAccountId,
      openingBalance,
      openingBalanceAsOf: openingBalanceAsOfRaw ? new Date(openingBalanceAsOfRaw) : null,
    },
  });

  revalidatePath(`/companies/${companySlug}/accounts`);
  redirect(`/companies/${companySlug}/accounts`);
}

export async function toggleAccountActive(
  companySlug: string,
  accountId: string,
  nextIsActive: boolean
) {
  const user = await getCurrentUser();
  const company = await getCompanyOrThrow(companySlug);

  // Deactivating an account is a step above routine edits — require ADMIN.
  await requireRole(user.id, company.id, "ADMIN");

  const existing = await prisma.account.findFirst({
    where: { id: accountId, companyId: company.id },
  });
  if (!existing) throw new Error("Account not found in this company.");

  if (existing.isSystemAccount) {
    throw new Error("System accounts can't be deactivated.");
  }

  await prisma.account.update({
    where: { id: accountId },
    data: { isActive: nextIsActive },
  });

  revalidatePath(`/companies/${companySlug}/accounts`);
}
