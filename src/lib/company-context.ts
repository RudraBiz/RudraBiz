import { cookies } from "next/headers";
import { prisma } from "./prisma";

const ACTIVE_COMPANY_COOKIE = "active_company_id";

/**
 * Resolves which company the current request should operate on.
 * 1. Checks the active_company_id cookie.
 * 2. Validates the user actually has a CompanyUser row for that company.
 * 3. Falls back to their isDefault company, then their earliest-joined
 *    company, if the cookie is missing, stale, or no longer valid.
 * Returns null if the user has no companies at all.
 */
export async function getActiveCompany(userId: string) {
  const cookieStore = await cookies();
  const cookieCompanyId = cookieStore.get(ACTIVE_COMPANY_COOKIE)?.value;

  if (cookieCompanyId) {
    const membership = await prisma.companyUser.findFirst({
      where: { userId, companyId: cookieCompanyId },
      include: { company: true },
    });
    if (membership) {
      return membership.company;
    }
  }

  // No valid cookie — prefer the user's marked default company.
  const defaultMembership = await prisma.companyUser.findFirst({
    where: { userId, isDefault: true },
    include: { company: true },
  });
  if (defaultMembership) {
    return defaultMembership.company;
  }

  // Otherwise fall back to the earliest company they joined.
  const firstMembership = await prisma.companyUser.findFirst({
    where: { userId },
    include: { company: true },
    orderBy: { joinedAt: "asc" },
  });

  return firstMembership?.company ?? null;
}

/**
 * Returns every company the user has access to, with role info,
 * for use in the company switcher UI.
 */
export async function getUserCompanies(userId: string) {
  const memberships = await prisma.companyUser.findMany({
    where: { userId },
    include: { company: true, role: true },
    orderBy: { joinedAt: "asc" },
  });

  return memberships.map((m) => ({
    company: m.company,
    role: m.role,
    isDefault: m.isDefault,
  }));
}

export { ACTIVE_COMPANY_COOKIE };
