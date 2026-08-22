import { prisma } from "./prisma";

// The 5 standard top-level account types used across virtually every
// accounting system. normalBalance determines which side (debit/credit)
// increases the account — this matters once journal entries exist (Pass 5),
// but is fixed here now since it's intrinsic to the type, not something
// that varies per company.
export const ACCOUNT_TYPE_DEFINITIONS = [
  { code: "ASSET", name: "Asset", normalBalance: "DEBIT", sortOrder: 1 },
  { code: "LIABILITY", name: "Liability", normalBalance: "CREDIT", sortOrder: 2 },
  { code: "EQUITY", name: "Equity", normalBalance: "CREDIT", sortOrder: 3 },
  { code: "INCOME", name: "Income", normalBalance: "CREDIT", sortOrder: 4 },
  { code: "EXPENSE", name: "Expense", normalBalance: "DEBIT", sortOrder: 5 },
] as const;

export type AccountTypeCode = (typeof ACCOUNT_TYPE_DEFINITIONS)[number]["code"];

/**
 * Returns all 5 account types, creating any that don't exist yet.
 * Self-healing because master_account_types starts empty — the first
 * time anyone opens the "new account" form, this seeds all 5 rows.
 */
export async function getOrSeedAccountTypes() {
  const existing = await prisma.accountType.findMany({
    orderBy: { sortOrder: "asc" },
  });

  const existingCodes = new Set(existing.map((t) => t.code));
  const missing = ACCOUNT_TYPE_DEFINITIONS.filter((d) => !existingCodes.has(d.code));

  if (missing.length === 0) {
    return existing;
  }

  await prisma.accountType.createMany({
    data: missing.map((d) => ({
      code: d.code,
      name: d.name,
      normalBalance: d.normalBalance,
      sortOrder: d.sortOrder,
      isActive: true,
    })),
    skipDuplicates: true,
  });

  return prisma.accountType.findMany({ orderBy: { sortOrder: "asc" } });
}
