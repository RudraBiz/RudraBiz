import { prisma } from "./prisma";

// NOTE: master_company_user_roles has no seed data yet as of this pass.
// Once you seed real role codes, update ROLE_RANK below to match them
// (lower index = lower privilege). This is the single place that encodes
// role hierarchy — everything else just calls requireRole().
const ROLE_RANK = ["VIEWER", "STAFF", "ACCOUNTANT", "ADMIN", "OWNER"] as const;

type RoleCode = (typeof ROLE_RANK)[number];

export class ForbiddenError extends Error {
  constructor(message = "You do not have permission to perform this action.") {
    super(message);
    this.name = "ForbiddenError";
  }
}

/**
 * Throws ForbiddenError if the user is not a member of the company,
 * or their role is below minRole. Returns the membership row (with
 * role included) on success.
 */
export async function requireRole(
  userId: string,
  companyId: string,
  minRole: RoleCode
) {
  const membership = await prisma.companyUser.findFirst({
    where: { userId, companyId },
    include: { role: true },
  });

  if (!membership) {
    throw new ForbiddenError("You do not have access to this company.");
  }

  const userRank = ROLE_RANK.indexOf(membership.role.code as RoleCode);
  const requiredRank = ROLE_RANK.indexOf(minRole);

  if (userRank === -1 || userRank < requiredRank) {
    throw new ForbiddenError();
  }

  return membership;
}
