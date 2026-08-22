"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { requireRole } from "@/lib/permissions";
import { createEntryWithRetry } from "@/lib/journal-entries";
import { getOrCreatePayablesAccount } from "@/lib/payables";

async function getCompanyOrThrow(slug: string) {
  const company = await prisma.company.findUnique({ where: { slug } });
  if (!company) throw new Error("Company not found");
  return company;
}

async function nextBillNumber(companyId: string): Promise<string> {
  const count = await prisma.bill.count({ where: { companyId } });
  return `BILL-${String(count + 1).padStart(4, "0")}`;
}

type ParsedLine = {
  description: string;
  quantity: number;
  unitPrice: number;
  expenseAccountId: string;
};

function parseLines(formData: FormData): ParsedLine[] {
  const lines: ParsedLine[] = [];
  let i = 0;
  while (formData.has(`lines[${i}].description`)) {
    const description = String(formData.get(`lines[${i}].description`) ?? "").trim();
    const quantity = Number(formData.get(`lines[${i}].quantity`) ?? "1");
    const unitPrice = Number(formData.get(`lines[${i}].unitPrice`) ?? "0");
    const expenseAccountId = String(
      formData.get(`lines[${i}].expenseAccountId`) ?? ""
    ).trim();

    lines.push({ description, quantity, unitPrice, expenseAccountId });
    i++;
  }
  return lines;
}

/**
 * Creates a bill and immediately posts its journal entry:
 * Dr each line's expense account / Cr Accounts Payable (total).
 * Mirrors createInvoice, with debit/credit sides swapped — a bill
 * increases what you owe (a liability), rather than what you're owed
 * (an asset).
 */
export async function createBill(companySlug: string, formData: FormData) {
  const user = await getCurrentUser();
  const company = await getCompanyOrThrow(companySlug);

  await requireRole(user.id, company.id, "ACCOUNTANT");

  const vendorId = String(formData.get("vendorId") ?? "").trim();
  if (!vendorId) throw new Error("Vendor is required.");

  const vendor = await prisma.vendor.findFirst({
    where: { id: vendorId, companyId: company.id },
  });
  if (!vendor) throw new Error("Selected vendor does not belong to this company.");

  const billDateRaw = String(formData.get("billDate") ?? "").trim();
  if (!billDateRaw) throw new Error("Bill date is required.");
  const dueDateRaw = String(formData.get("dueDate") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim() || null;

  const lines = parseLines(formData);
  if (lines.length === 0) throw new Error("At least one line item is required.");

  let subtotal = 0;
  const accountIds = new Set<string>();
  for (const [idx, line] of lines.entries()) {
    if (!line.description) {
      throw new Error(`Line ${idx + 1}: description is required.`);
    }
    if (!line.expenseAccountId) {
      throw new Error(`Line ${idx + 1}: expense account is required.`);
    }
    if (
      Number.isNaN(line.quantity) ||
      Number.isNaN(line.unitPrice) ||
      line.quantity <= 0 ||
      line.unitPrice < 0
    ) {
      throw new Error(`Line ${idx + 1}: quantity and unit price must be valid numbers.`);
    }
    subtotal += line.quantity * line.unitPrice;
    accountIds.add(line.expenseAccountId);
  }

  const expenseAccounts = await prisma.account.findMany({
    where: { id: { in: [...accountIds] }, companyId: company.id },
  });
  if (expenseAccounts.length !== accountIds.size) {
    throw new Error("One or more expense accounts don't belong to this company.");
  }
  const inactiveAccount = expenseAccounts.find((a) => !a.isActive);
  if (inactiveAccount) {
    throw new Error(`Account "${inactiveAccount.name}" is inactive.`);
  }

  const total = subtotal;
  const payables = await getOrCreatePayablesAccount(company.id);
  const billNumber = await nextBillNumber(company.id);

  const debitsByAccount = new Map<string, number>();
  for (const line of lines) {
    const amount = line.quantity * line.unitPrice;
    debitsByAccount.set(
      line.expenseAccountId,
      (debitsByAccount.get(line.expenseAccountId) ?? 0) + amount
    );
  }

  const journalEntry = await createEntryWithRetry(company.id, (entryNumber) => ({
    companyId: company.id,
    entryNumber,
    entryDate: new Date(billDateRaw),
    description: `Bill ${billNumber} — ${vendor.name}`,
    reference: billNumber,
    createdById: user.id,
    lines: {
      create: [
        ...Array.from(debitsByAccount.entries()).map(([accountId, amount], idx) => ({
          accountId,
          debit: amount.toFixed(2),
          credit: "0",
          lineOrder: idx,
        })),
        {
          accountId: payables.id,
          debit: "0",
          credit: total.toFixed(2),
          lineOrder: debitsByAccount.size,
        },
      ],
    },
  }));

  const bill = await prisma.bill.create({
    data: {
      companyId: company.id,
      vendorId,
      billNumber,
      billDate: new Date(billDateRaw),
      dueDate: dueDateRaw ? new Date(dueDateRaw) : null,
      notes,
      subtotal: subtotal.toFixed(2),
      total: total.toFixed(2),
      journalEntryId: journalEntry.id,
      createdById: user.id,
      lines: {
        create: lines.map((line, idx) => ({
          description: line.description,
          quantity: line.quantity.toFixed(2),
          unitPrice: line.unitPrice.toFixed(2),
          lineTotal: (line.quantity * line.unitPrice).toFixed(2),
          expenseAccountId: line.expenseAccountId,
          sortOrder: idx,
        })),
      },
    },
  });

  revalidatePath(`/companies/${companySlug}/bills`);
  redirect(`/companies/${companySlug}/bills/${bill.id}`);
}

/**
 * Records a payment against a bill: Dr Accounts Payable / Cr the chosen
 * paid-from (cash/bank) account. Mirrors recordPayment for invoices,
 * sides swapped. Same partial-payment simplification: no distinct
 * "PARTIAL" status, bill stays "OPEN" with nonzero amountPaid until
 * fully paid.
 */
export async function recordBillPayment(
  companySlug: string,
  billId: string,
  formData: FormData
) {
  const user = await getCurrentUser();
  const company = await getCompanyOrThrow(companySlug);

  await requireRole(user.id, company.id, "ACCOUNTANT");

  const bill = await prisma.bill.findFirst({
    where: { id: billId, companyId: company.id },
  });
  if (!bill) throw new Error("Bill not found.");
  if (bill.status === "VOID") throw new Error("Can't record a payment on a voided bill.");

  const amountRaw = String(formData.get("amount") ?? "").trim();
  const amount = Number(amountRaw);
  if (Number.isNaN(amount) || amount <= 0) {
    throw new Error("Payment amount must be a positive number.");
  }

  const remaining = Number(bill.total) - Number(bill.amountPaid);
  if (amount > remaining + 0.001) {
    throw new Error(
      `Payment (${amount.toFixed(2)}) exceeds the remaining balance (${remaining.toFixed(2)}).`
    );
  }

  const paidFromAccountId = String(formData.get("paidFromAccountId") ?? "").trim();
  if (!paidFromAccountId) throw new Error("Paid-from account is required.");

  const paidFromAccount = await prisma.account.findFirst({
    where: { id: paidFromAccountId, companyId: company.id, isActive: true },
  });
  if (!paidFromAccount) {
    throw new Error("Selected account is invalid for this company.");
  }

  const paymentDateRaw = String(formData.get("paymentDate") ?? "").trim();
  if (!paymentDateRaw) throw new Error("Payment date is required.");

  const payables = await getOrCreatePayablesAccount(company.id);

  const journalEntry = await createEntryWithRetry(company.id, (entryNumber) => ({
    companyId: company.id,
    entryNumber,
    entryDate: new Date(paymentDateRaw),
    description: `Bill payment — ${bill.billNumber}`,
    reference: bill.billNumber,
    createdById: user.id,
    lines: {
      create: [
        {
          accountId: payables.id,
          debit: amount.toFixed(2),
          credit: "0",
          lineOrder: 0,
        },
        {
          accountId: paidFromAccountId,
          debit: "0",
          credit: amount.toFixed(2),
          lineOrder: 1,
        },
      ],
    },
  }));

  const newAmountPaid = Number(bill.amountPaid) + amount;
  const isFullyPaid = newAmountPaid >= Number(bill.total) - 0.001;

  await prisma.$transaction([
    prisma.billPayment.create({
      data: {
        companyId: company.id,
        billId: bill.id,
        amount: amount.toFixed(2),
        paymentDate: new Date(paymentDateRaw),
        paidFromAccountId,
        journalEntryId: journalEntry.id,
        createdById: user.id,
      },
    }),
    prisma.bill.update({
      where: { id: bill.id },
      data: {
        amountPaid: newAmountPaid.toFixed(2),
        status: isFullyPaid ? "PAID" : bill.status,
      },
    }),
  ]);

  revalidatePath(`/companies/${companySlug}/bills/${billId}`);
}

/**
 * Voids a bill: posts a reversing journal entry and marks it VOID.
 * Blocked if any payments have been recorded, same as voidInvoice.
 */
export async function voidBill(companySlug: string, billId: string) {
  const user = await getCurrentUser();
  const company = await getCompanyOrThrow(companySlug);

  await requireRole(user.id, company.id, "ADMIN");

  const bill = await prisma.bill.findFirst({
    where: { id: billId, companyId: company.id },
    include: { payments: true },
  });
  if (!bill) throw new Error("Bill not found.");
  if (bill.status === "VOID") throw new Error("Bill is already void.");
  if (bill.payments.length > 0) {
    throw new Error("Can't void a bill that has payments recorded against it.");
  }

  const originalEntry = await prisma.journalEntry.findUnique({
    where: { id: bill.journalEntryId },
    include: { lines: true },
  });
  if (!originalEntry) throw new Error("Original journal entry not found.");

  const reversal = await createEntryWithRetry(company.id, (entryNumber) => ({
    companyId: company.id,
    entryNumber,
    entryDate: new Date(),
    description: `Void of bill ${bill.billNumber}`,
    reference: bill.billNumber,
    createdById: user.id,
    reversedEntryId: originalEntry.id,
    lines: {
      create: originalEntry.lines.map((line) => ({
        accountId: line.accountId,
        debit: line.credit,
        credit: line.debit,
        lineOrder: line.lineOrder,
      })),
    },
  }));

  await prisma.bill.update({
    where: { id: bill.id },
    data: { status: "VOID", voidJournalEntryId: reversal.id },
  });

  revalidatePath(`/companies/${companySlug}/bills/${billId}`);
}
