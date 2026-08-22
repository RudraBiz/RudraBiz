import { prisma } from "./prisma";
import { getOrSeedAccountTypes } from "./account-types";

const AP_CODE = "2000";
const AP_NAME = "Accounts Payable";

/**
 * Returns this company's Accounts Payable account, creating it (as a
 * system account) if it doesn't exist yet. Mirrors
 * getOrCreateReceivablesAccount — same caveat applies: if a company
 * already has an unrelated account manually created with code "2000",
 * this would incorrectly treat it as the AP account.
 */
export async function getOrCreatePayablesAccount(companyId: string) {
  const existing = await prisma.account.findFirst({
    where: { companyId, code: AP_CODE },
  });
  if (existing) return existing;

  const accountTypes = await getOrSeedAccountTypes();
  const liabilityType = accountTypes.find((t) => t.code === "LIABILITY");
  if (!liabilityType) {
    throw new Error("LIABILITY account type is missing — this shouldn't happen.");
  }

  return prisma.account.create({
    data: {
      companyId,
      code: AP_CODE,
      name: AP_NAME,
      accountTypeId: liabilityType.id,
      isSystemAccount: true,
    },
  });
}
