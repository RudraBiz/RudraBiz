import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { TopNav } from "@/components/top-nav";
import {
  Section,
  Field,
  SelectField,
  RadioField,
  MONTHS,
} from "@/components/company-form-fields";
import { updateCompany, archiveCompany } from "../../actions";

export default async function EditCompanyPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const [company, companyTypes, countries, accountingMethods, taxFreqs] =
    await Promise.all([
      prisma.company.findUnique({ where: { slug } }),
      prisma.companyType.findMany({
        where: { isActive: true },
        orderBy: { sortOrder: "asc" },
      }),
      prisma.country.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
      prisma.accountingMethod.findMany({ where: { isActive: true } }),
      prisma.taxFilingFrequency.findMany({ where: { isActive: true } }),
    ]);

  if (!company) notFound();

  const updateWithSlug = updateCompany.bind(null, slug);
  const archiveWithSlug = archiveCompany.bind(null, slug);

  return (
    <div className="flex min-h-full flex-col">
      <TopNav />
      <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-10">
        <h1 className="text-2xl font-semibold tracking-tight">
          Edit {company.name}
        </h1>
        <p className="mt-1 text-sm text-muted">{company.slug}</p>

        <form
          action={updateWithSlug}
          className="mt-8 space-y-8 rounded-lg border border-border bg-surface p-6"
        >
          <Section title="Identity">
            <Field label="Company name" name="name" required defaultValue={company.name} />
            <Field label="Legal name" name="legalName" defaultValue={company.legalName ?? ""} />
            <SelectField
              label="Company type"
              name="companyTypeId"
              required
              defaultValue={company.companyTypeId}
              options={companyTypes.map((t) => ({ value: t.id, label: t.name }))}
            />
            <Field label="Industry" name="industry" defaultValue={company.industry ?? ""} />
            <Field
              label="Registration number"
              name="registrationNumber"
              defaultValue={company.registrationNumber ?? ""}
            />
            <Field label="Tax ID / VAT no." name="taxId" defaultValue={company.taxId ?? ""} />
          </Section>

          <Section title="Contact">
            <Field label="Email" name="email" type="email" defaultValue={company.email ?? ""} />
            <Field label="Phone" name="phone" defaultValue={company.phone ?? ""} />
            <Field label="Website" name="website" defaultValue={company.website ?? ""} />
            <Field
              label="Address"
              name="addressLine"
              defaultValue={company.addressLine ?? ""}
            />
            <div className="grid grid-cols-3 gap-3">
              <Field label="City" name="city" defaultValue={company.city ?? ""} />
              <Field label="State" name="state" defaultValue={company.state ?? ""} />
              <Field label="Zip" name="zip" defaultValue={company.zip ?? ""} />
            </div>
            <SelectField
              label="Country"
              name="countryId"
              required
              defaultValue={company.countryId}
              options={countries.map((c) => ({ value: c.id, label: c.name }))}
            />
          </Section>

          <Section title="Accounting setup">
            <div className="rounded-md border border-dashed border-border bg-background px-3 py-2 text-xs text-muted">
              Base currency is locked after creation and can&apos;t be changed
              here.
            </div>
            <SelectField
              label="Fiscal year start month"
              name="fiscalYearStartMonth"
              defaultValue={String(company.fiscalYearStartMonth)}
              options={MONTHS}
            />
            <RadioField
              label="Accounting method"
              name="accountingMethodId"
              required
              defaultValue={company.accountingMethodId}
              options={accountingMethods.map((m) => ({
                value: m.id,
                label: m.name,
                hint: m.description ?? undefined,
              }))}
            />
          </Section>

          <Section title="Tax info">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="taxRegistered"
                defaultChecked={company.taxRegistered}
                className="h-4 w-4"
              />
              Tax registered
            </label>
            <SelectField
              label="Filing frequency"
              name="taxFilingFrequencyId"
              defaultValue={company.taxFilingFrequencyId ?? ""}
              options={taxFreqs.map((f) => ({ value: f.id, label: f.name }))}
            />
          </Section>

          <div className="flex justify-end gap-3 border-t border-border pt-6">
            <a
              href={`/companies/${company.slug}`}
              className="rounded-md px-4 py-2 text-sm font-medium text-muted hover:text-ink"
            >
              Cancel
            </a>
            <button
              type="submit"
              className="rounded-md bg-accent px-5 py-2 text-sm font-medium text-white hover:opacity-90"
            >
              Save changes
            </button>
          </div>
        </form>

        <details className="mt-6 rounded-lg border border-border bg-surface">
          <summary className="cursor-pointer px-6 py-4 text-sm font-medium text-danger">
            Archive this company
          </summary>
          <div className="border-t border-border px-6 py-4">
            <p className="text-sm text-muted">
              This hides the company from your dashboard. Historical data is
              retained.
            </p>
            <form action={archiveWithSlug} className="mt-4">
              <button
                type="submit"
                className="rounded-md border border-danger px-4 py-2 text-sm font-medium text-danger hover:bg-danger hover:text-white"
              >
                Archive company
              </button>
            </form>
          </div>
        </details>
      </main>
    </div>
  );
}
