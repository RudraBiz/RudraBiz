"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { requireRole } from "@/lib/permissions";
import { createEntryWithRetry } from "@/lib/journal-entries";
import { getOrCreateReceivablesAccount } from "@/lib/receivables";

async function getCompanyOrThrow(slug: string) {
  const company = await prisma.company.findUnique({ where: { slug } });
  if (!company) throw new Error("Company not found");
  return company;
}

async function nextInvoiceNumber(companyId: string): Promise<string> {
  const count = await prisma.invoice.count({ where: { companyId } });
  return `INV-${String(count + 1).padStart(4, "0")}`;
}

type ParsedLine = {
  description: string;
  quantity: number;
  unitPrice: number;
  revenueAccountId: string;
};

function parseLines(formData: FormData): ParsedLine[] {
  const lines: ParsedLine[] = [];
  let i = 0;
  while (formData.has(`lines[${i}].description`)) {
    const description = String(formData.get(`lines[${i}].description`) ?? "").trim();
    const quantity = Number(formData.get(`lines[${i}].quantity`) ?? "1");
    const unitPrice = Number(formData.get(`lines[${i}].unitPrice`) ?? "0");
    const revenueAccountId = String(
      formData.get(`lines[${i}].revenueAccountId`) ?? ""
    ).trim();

    lines.push({ description, quantity, unitPrice, revenueAccountId });
    i++;
  }
  return lines;
}

/**
 * Creates an invoice and immediately posts its journal entry:
 * Dr Accounts Receivable (total) / Cr each line's revenue account.
 * There's no draft state — this is the only creation path, and the
 * invoice + entry are created together or not at all (single flow,
 * no partial-failure handling beyond what Prisma's implicit
 * transaction-per-request gives us for the nested `create`).
 */
export async function createInvoice(companySlug: string, formData: FormData) {
  const user = await getCurrentUser();
  const company = await getCompanyOrThrow(companySlug);

  await requireRole(user.id, company.id, "ACCOUNTANT");

  const customerId = String(formData.get("customerId") ?? "").trim();
  if (!customerId) throw new Error("Customer is required.");

  const customer = await prisma.customer.findFirst({
    where: { id: customerId, companyId: company.id },
  });
  if (!customer) throw new Error("Selected customer does not belong to this company.");

  const invoiceDateRaw = String(formData.get("invoiceDate") ?? "").trim();
  if (!invoiceDateRaw) throw new Error("Invoice date is required.");
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
    if (!line.revenueAccountId) {
      throw new Error(`Line ${idx + 1}: revenue account is required.`);
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
    accountIds.add(line.revenueAccountId);
  }

  const revenueAccounts = await prisma.account.findMany({
    where: { id: { in: [...accountIds] }, companyId: company.id },
  });
  if (revenueAccounts.length !== accountIds.size) {
    throw new Error("One or more revenue accounts don't belong to this company.");
  }
  const inactiveAccount = revenueAccounts.find((a) => !a.isActive);
  if (inactiveAccount) {
    throw new Error(`Account "${inactiveAccount.name}" is inactive.`);
  }

  const total = subtotal; // no tax handling yet
  const receivables = await getOrCreateReceivablesAccount(company.id);
  const invoiceNumber = await nextInvoiceNumber(company.id);

  // Group line amounts by revenue account, so the journal entry has one
  // credit line per distinct account rather than one per invoice line.
  const creditsByAccount = new Map<string, number>();
  for (const line of lines) {
    const amount = line.quantity * line.unitPrice;
    creditsByAccount.set(
      line.revenueAccountId,
      (creditsByAccount.get(line.revenueAccountId) ?? 0) + amount
    );
  }

  const journalEntry = await createEntryWithRetry(company.id, (entryNumber) => ({
    companyId: company.id,
    entryNumber,
    entryDate: new Date(invoiceDateRaw),
    description: `Invoice ${invoiceNumber} — ${customer.name}`,
    reference: invoiceNumber,
    createdById: user.id,
    lines: {
      create: [
        {
          accountId: receivables.id,
          debit: total.toFixed(2),
          credit: "0",
          lineOrder: 0,
        },
        ...Array.from(creditsByAccount.entries()).map(([accountId, amount], idx) => ({
          accountId,
          debit: "0",
          credit: amount.toFixed(2),
          lineOrder: idx + 1,
        })),
      ],
    },
  }));

  const invoice = await prisma.invoice.create({
    data: {
      companyId: company.id,
      customerId,
      invoiceNumber,
      invoiceDate: new Date(invoiceDateRaw),
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
          revenueAccountId: line.revenueAccountId,
          sortOrder: idx,
        })),
      },
    },
  });

  revalidatePath(`/companies/${companySlug}/invoices`);
  redirect(`/companies/${companySlug}/invoices/${invoice.id}`);
}

/**
 * Records a payment against an invoice: Dr the chosen deposit account,
 * Cr Accounts Receivable. Updates amountPaid and flips status to PAID
 * once fully paid. Partial payments are allowed but there's no distinct
 * "PARTIAL" status yet — the invoice just stays "SENT" with a nonzero
 * amountPaid until it's fully paid.
 */
export async function recordPayment(
  companySlug: string,
  invoiceId: string,
  formData: FormData
) {
  const user = await getCurrentUser();
  const company = await getCompanyOrThrow(companySlug);

  await requireRole(user.id, company.id, "ACCOUNTANT");

  const invoice = await prisma.invoice.findFirst({
    where: { id: invoiceId, companyId: company.id },
  });
  if (!invoice) throw new Error("Invoice not found.");
  if (invoice.status === "VOID") throw new Error("Can't record a payment on a voided invoice.");

  const amountRaw = String(formData.get("amount") ?? "").trim();
  const amount = Number(amountRaw);
  if (Number.isNaN(amount) || amount <= 0) {
    throw new Error("Payment amount must be a positive number.");
  }

  const remaining = Number(invoice.total) - Number(invoice.amountPaid);
  if (amount > remaining + 0.001) {
    throw new Error(
      `Payment (${amount.toFixed(2)}) exceeds the remaining balance (${remaining.toFixed(2)}).`
    );
  }

  const depositToAccountId = String(formData.get("depositToAccountId") ?? "").trim();
  if (!depositToAccountId) throw new Error("Deposit account is required.");

  const depositAccount = await prisma.account.findFirst({
    where: { id: depositToAccountId, companyId: company.id, isActive: true },
  });
  if (!depositAccount) {
    throw new Error("Selected deposit account is invalid for this company.");
  }

  const paymentDateRaw = String(formData.get("paymentDate") ?? "").trim();
  if (!paymentDateRaw) throw new Error("Payment date is required.");

  const receivables = await getOrCreateReceivablesAccount(company.id);

  const journalEntry = await createEntryWithRetry(company.id, (entryNumber) => ({
    companyId: company.id,
    entryNumber,
    entryDate: new Date(paymentDateRaw),
    description: `Payment received — ${invoice.invoiceNumber}`,
    reference: invoice.invoiceNumber,
    createdById: user.id,
    lines: {
      create: [
        {
          accountId: depositToAccountId,
          debit: amount.toFixed(2),
          credit: "0",
          lineOrder: 0,
        },
        {
          accountId: receivables.id,
          debit: "0",
          credit: amount.toFixed(2),
          lineOrder: 1,
        },
      ],
    },
  }));

  const newAmountPaid = Number(invoice.amountPaid) + amount;
  const isFullyPaid = newAmountPaid >= Number(invoice.total) - 0.001;

  await prisma.$transaction([
    prisma.payment.create({
      data: {
        companyId: company.id,
        invoiceId: invoice.id,
        amount: amount.toFixed(2),
        paymentDate: new Date(paymentDateRaw),
        depositToAccountId,
        journalEntryId: journalEntry.id,
        createdById: user.id,
      },
    }),
    prisma.invoice.update({
      where: { id: invoice.id },
      data: {
        amountPaid: newAmountPaid.toFixed(2),
        status: isFullyPaid ? "PAID" : invoice.status,
      },
    }),
  ]);

  revalidatePath(`/companies/${companySlug}/invoices/${invoiceId}`);
}

/**
 * Voids an invoice: posts a reversing journal entry (swapped debits/
 * credits from the original posting) and marks the invoice VOID. Blocked
 * if any payments have been recorded — a paid invoice shouldn't be
 * voided silently; that would need the payment(s) unwound first, which
 * isn't supported yet.
 */
export async function voidInvoice(companySlug: string, invoiceId: string) {
  const user = await getCurrentUser();
  const company = await getCompanyOrThrow(companySlug);

  await requireRole(user.id, company.id, "ADMIN");

  const invoice = await prisma.invoice.findFirst({
    where: { id: invoiceId, companyId: company.id },
    include: { payments: true },
  });
  if (!invoice) throw new Error("Invoice not found.");
  if (invoice.status === "VOID") throw new Error("Invoice is already void.");
  if (invoice.payments.length > 0) {
    throw new Error("Can't void an invoice that has payments recorded against it.");
  }

  const originalEntry = await prisma.journalEntry.findUnique({
    where: { id: invoice.journalEntryId },
    include: { lines: true },
  });
  if (!originalEntry) throw new Error("Original journal entry not found.");

  const reversal = await createEntryWithRetry(company.id, (entryNumber) => ({
    companyId: company.id,
    entryNumber,
    entryDate: new Date(),
    description: `Void of invoice ${invoice.invoiceNumber}`,
    reference: invoice.invoiceNumber,
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

  await prisma.invoice.update({
    where: { id: invoice.id },
    data: { status: "VOID", voidJournalEntryId: reversal.id },
  });

  revalidatePath(`/companies/${companySlug}/invoices/${invoiceId}`);
}
