import { prisma } from "@/lib/prisma";

export type FieldType = "text" | "number" | "textarea";

export interface FieldConfig {
  key: string;
  label: string;
  type: FieldType;
  required?: boolean;
  hint?: string;
  defaultValue?: string | number;
}

export interface TableConfig {
  slug: string;
  label: string; // plural, for headings/nav
  singular: string; // for "+ Add {singular}"
  fields: FieldConfig[];
}

export const TABLES: TableConfig[] = [
  {
    slug: "company-types",
    label: "Company types",
    singular: "company type",
    fields: [
      { key: "name", label: "Name", type: "text", required: true, hint: "e.g. Limited Liability Company" },
      { key: "code", label: "Code", type: "text", required: true, hint: "e.g. LLC" },
      { key: "sortOrder", label: "Sort order", type: "number", defaultValue: 0 },
    ],
  },
  {
    slug: "countries",
    label: "Countries",
    singular: "country",
    fields: [
      { key: "name", label: "Name", type: "text", required: true, hint: "e.g. Nepal" },
      { key: "isoCode", label: "ISO code", type: "text", required: true, hint: "e.g. NP" },
    ],
  },
  {
    slug: "currencies",
    label: "Currencies",
    singular: "currency",
    fields: [
      { key: "name", label: "Name", type: "text", required: true, hint: "e.g. Nepalese Rupee" },
      { key: "isoCode", label: "ISO code", type: "text", required: true, hint: "e.g. NPR" },
      { key: "symbol", label: "Symbol", type: "text", required: true, hint: "e.g. रू" },
      { key: "decimalPlaces", label: "Decimal places", type: "number", defaultValue: 2 },
    ],
  },
  {
    slug: "accounting-methods",
    label: "Accounting methods",
    singular: "accounting method",
    fields: [
      { key: "name", label: "Name", type: "text", required: true, hint: "e.g. Accrual" },
      { key: "code", label: "Code", type: "text", required: true, hint: "e.g. ACCRUAL" },
      { key: "description", label: "Description", type: "textarea" },
    ],
  },
  {
    slug: "tax-filing-frequencies",
    label: "Tax filing frequencies",
    singular: "filing frequency",
    fields: [
      { key: "name", label: "Name", type: "text", required: true, hint: "e.g. Quarterly" },
      { key: "code", label: "Code", type: "text", required: true, hint: "e.g. QUARTERLY" },
    ],
  },
  {
    slug: "company-statuses",
    label: "Company statuses",
    singular: "company status",
    fields: [
      { key: "name", label: "Name", type: "text", required: true, hint: "e.g. Active" },
      { key: "code", label: "Code", type: "text", required: true, hint: "e.g. ACTIVE" },
    ],
  },
  {
    slug: "company-user-roles",
    label: "Company user roles",
    singular: "user role",
    fields: [
      { key: "name", label: "Name", type: "text", required: true, hint: "e.g. Accountant" },
      { key: "code", label: "Code", type: "text", required: true, hint: "e.g. ACCOUNTANT" },
    ],
  },
];

export function getTableConfig(slug: string): TableConfig | undefined {
  return TABLES.find((t) => t.slug === slug);
}

// Prisma delegates all share the same shape we use here (findMany,
// findUnique, create, update), so `any` keeps this generic-admin layer
// simple instead of writing 7 near-identical CRUD modules.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getDelegate(slug: string): any {
  switch (slug) {
    case "company-types":
      return prisma.companyType;
    case "countries":
      return prisma.country;
    case "currencies":
      return prisma.currency;
    case "accounting-methods":
      return prisma.accountingMethod;
    case "tax-filing-frequencies":
      return prisma.taxFilingFrequency;
    case "company-statuses":
      return prisma.companyStatus;
    case "company-user-roles":
      return prisma.companyUserRole;
    default:
      throw new Error(`Unknown master table: ${slug}`);
  }
}
