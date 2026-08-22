import { prisma } from "./prisma";
import { getOrSeedAccountTypes } from "./account-types";

const AR_CODE = "1100";
const AR_NAME = "Accounts Receivable";

/**
 * Returns this company's Accounts Receivable account, creating it
 * (as a system account) if it doesn't exist yet. Every invoice posts
 * a debit to this account, so it needs to exist before the first
 * invoice is created — this makes that automatic rather than requiring
 * the user to manually set it up in their Chart of Accounts first.
 */
export async function getOrCreateReceivablesAccount(companyId: string) {
  const existing = await prisma.account.findFirst({
    where: { companyId, code: AR_CODE },
  });
  if (existing) return existing;

  const accountTypes = await getOrSeedAccountTypes();
  const assetType = accountTypes.find((t) => t.code === "ASSET");
  if (!assetType) {
    throw new Error("ASSET account type is missing — this shouldn't happen.");
  }

  return prisma.account.create({
    data: {
      companyId,
      code: AR_CODE,
      name: AR_NAME,
      accountTypeId: assetType.id,
      isSystemAccount: true,
    },
  });
}
