"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { requireRole } from "@/lib/permissions";

async function getCompanyOrThrow(slug: string) {
  const company = await prisma.company.findUnique({ where: { slug } });
  if (!company) throw new Error("Company not found");
  return company;
}

async function nextEntryNumber(companyId: string): Promise<string> {
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
async function createEntryWithRetry(
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
  // Unreachable, but keeps TypeScript happy about the return type.
  throw new Error("Failed to generate a unique entry number after retries.");
}

type ParsedLine = {
  accountId: string;
  debit: string;
  credit: string;
  description: string | null;
};

function parseLines(formData: FormData): ParsedLine[] {
  const lines: ParsedLine[] = [];
  let i = 0;
  while (formData.has(`lines[${i}].accountId`)) {
    const accountId = String(formData.get(`lines[${i}].accountId`) ?? "").trim();
    const debitRaw = String(formData.get(`lines[${i}].debit`) ?? "0").trim();
    const creditRaw = String(formData.get(`lines[${i}].credit`) ?? "0").trim();
    const descRaw = formData.get(`lines[${i}].description`);
    const description = descRaw ? String(descRaw).trim() || null : null;

    lines.push({
      accountId,
      debit: debitRaw === "" ? "0" : debitRaw,
      credit: creditRaw === "" ? "0" : creditRaw,
      description,
    });
    i++;
  }
  return lines;
}

/**
 * Validates the lines of a journal entry:
 * - at least 2 lines
 * - every line has an account
 * - every line has exactly one of debit/credit > 0 (not both, not neither)
 * - all accounts belong to the given company and are active
 * - total debits === total credits
 * Throws with a user-facing message on the first problem found.
 */
async function validateLines(companyId: string, lines: ParsedLine[]) {
  if (lines.length < 2) {
    throw new Error("A journal entry needs at least two lines.");
  }

  let totalDebit = 0;
  let totalCredit = 0;

  for (const [idx, line] of lines.entries()) {
    if (!line.accountId) {
      throw new Error(`Line ${idx + 1}: an account is required.`);
    }

    const debit = Number(line.debit);
    const credit = Number(line.credit);

    if (Number.isNaN(debit) || Number.isNaN(credit) || debit < 0 || credit < 0) {
      throw new Error(`Line ${idx + 1}: amounts must be non-negative numbers.`);
    }

    const debitSet = debit > 0;
    const creditSet = credit > 0;

    if (debitSet === creditSet) {
      // both zero, or both non-zero — neither is valid for a single line
      throw new Error(
        `Line ${idx + 1}: enter an amount in exactly one of debit or credit, not both.`
      );
    }

    totalDebit += debit;
    totalCredit += credit;
  }

  // Compare in cents to sidestep binary floating-point rounding issues.
  const debitCents = Math.round(totalDebit * 100);
  const creditCents = Math.round(totalCredit * 100);
  if (debitCents !== creditCents) {
    throw new Error(
      `Entry is out of balance: total debits (${totalDebit.toFixed(2)}) ` +
        `must equal total credits (${totalCredit.toFixed(2)}).`
    );
  }

  const accountIds = [...new Set(lines.map((l) => l.accountId))];
  const accounts = await prisma.account.findMany({
    where: { id: { in: accountIds }, companyId },
  });

  if (accounts.length !== accountIds.length) {
    throw new Error("One or more accounts don't belong to this company.");
  }

  const inactive = accounts.find((a) => !a.isActive);
  if (inactive) {
    throw new Error(`Account "${inactive.name}" is inactive and can't be posted to.`);
  }
}

export async function createJournalEntry(companySlug: string, formData: FormData) {
  const user = await getCurrentUser();
  const company = await getCompanyOrThrow(companySlug);

  await requireRole(user.id, company.id, "ACCOUNTANT");

  const entryDateRaw = String(formData.get("entryDate") ?? "").trim();
  if (!entryDateRaw) throw new Error("Entry date is required.");

  const description = String(formData.get("description") ?? "").trim() || null;
  const reference = String(formData.get("reference") ?? "").trim() || null;

  const lines = parseLines(formData);
  await validateLines(company.id, lines);

  const entry = await createEntryWithRetry(company.id, (entryNumber) => ({
    companyId: company.id,
    entryNumber,
    entryDate: new Date(entryDateRaw),
    description,
    reference,
    createdById: user.id,
    lines: {
      create: lines.map((line, idx) => ({
        accountId: line.accountId,
        debit: line.debit,
        credit: line.credit,
        description: line.description,
        lineOrder: idx,
      })),
    },
  }));

  revalidatePath(`/companies/${companySlug}/journal-entries`);
  redirect(`/companies/${companySlug}/journal-entries/${entry.id}`);
}

/**
 * Creates a new entry that exactly reverses an existing one (debits and
 * credits swapped on every line), linked back via reversedEntryId. The
 * original entry is never modified — this is how corrections are made
 * to an immutable ledger.
 */
export async function reverseJournalEntry(companySlug: string, entryId: string) {
  const user = await getCurrentUser();
  const company = await getCompanyOrThrow(companySlug);

  await requireRole(user.id, company.id, "ACCOUNTANT");

  const original = await prisma.journalEntry.findFirst({
    where: { id: entryId, companyId: company.id },
    include: { lines: true, reversalEntry: true },
  });

  if (!original) throw new Error("Journal entry not found.");
  if (original.reversalEntry) {
    throw new Error("This entry has already been reversed.");
  }

  const reversal = await createEntryWithRetry(company.id, (entryNumber) => ({
    companyId: company.id,
    entryNumber,
    entryDate: new Date(),
    description: `Reversal of ${original.entryNumber}`,
    reference: original.reference,
    createdById: user.id,
    reversedEntryId: original.id,
    lines: {
      create: original.lines.map((line) => ({
        accountId: line.accountId,
        // swapped — this is what makes it a reversal
        debit: line.credit,
        credit: line.debit,
        description: line.description,
        lineOrder: line.lineOrder,
      })),
    },
  }));

  revalidatePath(`/companies/${companySlug}/journal-entries`);
  redirect(`/companies/${companySlug}/journal-entries/${reversal.id}`);
}
