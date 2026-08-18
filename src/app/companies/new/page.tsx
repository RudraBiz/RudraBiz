import { prisma } from "@/lib/prisma";
import { TopNav } from "@/components/top-nav";
import {
  Section,
  Field,
  SelectField,
  RadioField,
  MONTHS,
} from "@/components/company-form-fields";
import { createCompany } from "../actions";

export default async function NewCompanyPage() {
  const [companyTypes, countries, currencies, accountingMethods, taxFreqs] =
    await Promise.all([
      prisma.companyType.findMany({
        where: { isActive: true },
        orderBy: { sortOrder: "asc" },
      }),
      prisma.country.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
      prisma.currency.findMany({ where: { isActive: true }, orderBy: { isoCode: "asc" } }),
      prisma.accountingMethod.findMany({ where: { isActive: true } }),
      prisma.taxFilingFrequency.findMany({ where: { isActive: true } }),
    ]);

  return (
    <div className="flex min-h-full flex-col">
      <TopNav />
      <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-10">
        <h1 className="text-2xl font-semibold tracking-tight">
          Create your company
        </h1>
        <p className="mt-1 text-sm text-muted">
          This becomes a workspace with its own books, users, and settings.
        </p>

        <form
          action={createCompany}
          className="mt-8 space-y-8 rounded-lg border border-border bg-surface p-6"
        >
          <Section title="Identity">
            <Field label="Company name" name="name" required />
            <Field label="Legal name" name="legalName" />
            <SelectField
              label="Company type"
              name="companyTypeId"
              required
              options={companyTypes.map((t) => ({ value: t.id, label: t.name }))}
            />
            <Field label="Industry" name="industry" />
            <Field label="Registration number" name="registrationNumber" />
            <Field label="Tax ID / VAT no." name="taxId" />
          </Section>

          <Section title="Contact">
            <Field label="Email" name="email" type="email" />
            <Field label="Phone" name="phone" />
            <Field label="Website" name="website" />
            <Field label="Address" name="addressLine" />
            <div className="grid grid-cols-3 gap-3">
              <Field label="City" name="city" />
              <Field label="State" name="state" />
              <Field label="Zip" name="zip" />
            </div>
            <SelectField
              label="Country"
              name="countryId"
              required
              options={countries.map((c) => ({ value: c.id, label: c.name }))}
            />
          </Section>

          <Section title="Accounting setup">
            <SelectField
              label="Base currency"
              name="baseCurrencyId"
              required
              options={currencies.map((c) => ({
                value: c.id,
                label: `${c.name} (${c.isoCode})`,
              }))}
              hint="Cannot be changed once transactions exist."
            />
            <SelectField
              label="Fiscal year start month"
              name="fiscalYearStartMonth"
              defaultValue="1"
              options={MONTHS}
            />
            <RadioField
              label="Accounting method"
              name="accountingMethodId"
              required
              options={accountingMethods.map((m) => ({
                value: m.id,
                label: m.name,
                hint: m.description ?? undefined,
              }))}
            />
          </Section>

          <Section title="Tax info">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="taxRegistered" className="h-4 w-4" />
              Tax registered
            </label>
            <SelectField
              label="Filing frequency"
              name="taxFilingFrequencyId"
              options={taxFreqs.map((f) => ({ value: f.id, label: f.name }))}
            />
          </Section>

          <div className="flex justify-end gap-3 border-t border-border pt-6">
            <a
              href="/companies"
              className="rounded-md px-4 py-2 text-sm font-medium text-muted hover:text-ink"
            >
              Cancel
            </a>
            <button
              type="submit"
              className="rounded-md bg-accent px-5 py-2 text-sm font-medium text-white hover:opacity-90"
            >
              Create company
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
