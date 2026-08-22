import { prisma } from "./prisma";

// Placeholder hierarchy — nothing is seeded in master_company_user_roles yet.
// Order matters: lowest to highest privilege. If you seed different codes
// or a different order via /settings/company-user-roles, update this to match —
// this is the ONE place that defines the hierarchy; permissions.ts and the
// invite flow both read from it.
export const ROLE_DEFINITIONS = [
  { code: "VIEWER", name: "Viewer" },
  { code: "STAFF", name: "Staff" },
  { code: "ACCOUNTANT", name: "Accountant" },
  { code: "ADMIN", name: "Admin" },
  { code: "OWNER", name: "Owner" },
] as const;

export type RoleCode = (typeof ROLE_DEFINITIONS)[number]["code"];

export const ROLE_RANK = ROLE_DEFINITIONS.map((r) => r.code);

/**
 * Looks up a role's id by code, creating it if it doesn't exist yet.
 * Self-healing because master_company_user_roles starts empty — this
 * means the first company ever created will silently seed "OWNER" (and
 * anything else it needs) rather than throwing. Once you've seeded real
 * rows yourself via /settings/company-user-roles, this just finds them.
 */
export async function getRoleId(code: RoleCode): Promise<string> {
  const existing = await prisma.companyUserRole.findUnique({ where: { code } });
  if (existing) return existing.id;

  const definition = ROLE_DEFINITIONS.find((r) => r.code === code);
  if (!definition) {
    throw new Error(`Unknown role code "${code}" — not in ROLE_DEFINITIONS.`);
  }

  const created = await prisma.companyUserRole.create({
    data: { code: definition.code, name: definition.name, isActive: true },
  });
  return created.id;
}
