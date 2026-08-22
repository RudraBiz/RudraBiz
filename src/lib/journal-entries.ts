import { Prisma } from "@prisma/client";
import { prisma } from "./prisma";

export async function nextEntryNumber(companyId: string): Promise<string> {
  const count = await prisma.journalEntry.count({ where: { companyId } });
  return `JE-${String(count + 1).padStart(4, "0")}`;
}

/**
 * Creates a journal entry, retrying with a fresh entry number if a
 * concurrent request already took the one we generated. nextEntryNumber()
 * is count-based (not a DB sequence), so two simultaneous submissions for
 * the same company can briefly compute the same number — the unique
 * (companyId, entryNumber) constraint catches that, and we just retry
 * with the next count rather than surfacing an error to the user.
 */
export async function createEntryWithRetry(
  companyId: string,
  buildData: (entryNumber: string) => Prisma.JournalEntryCreateArgs["data"],
  maxAttempts = 5
) {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const entryNumber = await nextEntryNumber(companyId);
    try {
      return await prisma.journalEntry.create({ data: buildData(entryNumber) });
    } catch (err) {
      const isUniqueConflict =
        err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002";
      if (!isUniqueConflict || attempt === maxAttempts - 1) {
        throw err;
      }
      // fall through and retry with a freshly counted number
    }
  }
  throw new Error("Failed to generate a unique entry number after retries.");
}
