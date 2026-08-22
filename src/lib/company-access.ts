import { notFound } from "next/navigation";
import { prisma } from "./prisma";
import { ROLE_RANK, type RoleCode } from "./roles";

/**
 * For use in page/layout components (not server actions). Returns the
 * membership row if the user belongs to the company, otherwise calls
 * notFound() — a non-member gets the same 404 as a company that doesn't
 * exist at all, rather than a 403 that would confirm the company's slug
 * is valid.
 */
export async function requireCompanyMembership(userId: string, companyId: string) {
  const membership = await prisma.companyUser.findFirst({
    where: { userId, companyId },
    include: { role: true },
  });

  if (!membership) {
    notFound();
  }

  return membership;
}

/**
 * Same as requireCompanyMembership, but also enforces a minimum role.
 * Use this to guard pages (like an edit form) that only ADMIN+ should
 * even be able to view — not just submit.
 */
export async function requireCompanyRole(
  userId: string,
  companyId: string,
  minRole: RoleCode
) {
  const membership = await requireCompanyMembership(userId, companyId);

  const userRank = ROLE_RANK.indexOf(membership.role.code as RoleCode);
  const requiredRank = ROLE_RANK.indexOf(minRole);

  if (userRank === -1 || userRank < requiredRank) {
    notFound();
  }

  return membership;
}
