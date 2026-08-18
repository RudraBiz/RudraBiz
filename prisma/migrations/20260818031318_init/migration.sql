-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "companies" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "legalName" TEXT,
    "registrationNumber" TEXT,
    "taxId" TEXT,
    "industry" TEXT,
    "website" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "addressLine" TEXT,
    "city" TEXT,
    "state" TEXT,
    "zip" TEXT,
    "logoUrl" TEXT,
    "fiscalYearStartMonth" INTEGER NOT NULL DEFAULT 1,
    "decimalPrecision" INTEGER NOT NULL DEFAULT 2,
    "taxRegistered" BOOLEAN NOT NULL DEFAULT false,
    "defaultTaxRateId" TEXT,
    "booksLockedUntil" TIMESTAMP(3),
    "plan" TEXT NOT NULL DEFAULT 'free',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "companyTypeId" TEXT NOT NULL,
    "countryId" TEXT NOT NULL,
    "baseCurrencyId" TEXT NOT NULL,
    "accountingMethodId" TEXT NOT NULL,
    "taxFilingFrequencyId" TEXT,
    "companyStatusId" TEXT NOT NULL,

    CONSTRAINT "companies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "company_users" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "companyUserRoleId" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "invitedById" TEXT,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "company_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "master_company_types" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "master_company_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "master_countries" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isoCode" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "master_countries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "master_currencies" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isoCode" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "decimalPlaces" INTEGER NOT NULL DEFAULT 2,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "master_currencies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "master_accounting_methods" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "master_accounting_methods_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "master_tax_filing_frequencies" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "master_tax_filing_frequencies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "master_company_statuses" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "master_company_statuses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "master_company_user_roles" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "master_company_user_roles_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "companies_slug_key" ON "companies"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "company_users_userId_companyId_key" ON "company_users"("userId", "companyId");

-- CreateIndex
CREATE UNIQUE INDEX "master_company_types_code_key" ON "master_company_types"("code");

-- CreateIndex
CREATE UNIQUE INDEX "master_countries_isoCode_key" ON "master_countries"("isoCode");

-- CreateIndex
CREATE UNIQUE INDEX "master_currencies_isoCode_key" ON "master_currencies"("isoCode");

-- CreateIndex
CREATE UNIQUE INDEX "master_accounting_methods_code_key" ON "master_accounting_methods"("code");

-- CreateIndex
CREATE UNIQUE INDEX "master_tax_filing_frequencies_code_key" ON "master_tax_filing_frequencies"("code");

-- CreateIndex
CREATE UNIQUE INDEX "master_company_statuses_code_key" ON "master_company_statuses"("code");

-- CreateIndex
CREATE UNIQUE INDEX "master_company_user_roles_code_key" ON "master_company_user_roles"("code");

-- AddForeignKey
ALTER TABLE "companies" ADD CONSTRAINT "companies_companyTypeId_fkey" FOREIGN KEY ("companyTypeId") REFERENCES "master_company_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "companies" ADD CONSTRAINT "companies_countryId_fkey" FOREIGN KEY ("countryId") REFERENCES "master_countries"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "companies" ADD CONSTRAINT "companies_baseCurrencyId_fkey" FOREIGN KEY ("baseCurrencyId") REFERENCES "master_currencies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "companies" ADD CONSTRAINT "companies_accountingMethodId_fkey" FOREIGN KEY ("accountingMethodId") REFERENCES "master_accounting_methods"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "companies" ADD CONSTRAINT "companies_taxFilingFrequencyId_fkey" FOREIGN KEY ("taxFilingFrequencyId") REFERENCES "master_tax_filing_frequencies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "companies" ADD CONSTRAINT "companies_companyStatusId_fkey" FOREIGN KEY ("companyStatusId") REFERENCES "master_company_statuses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company_users" ADD CONSTRAINT "company_users_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company_users" ADD CONSTRAINT "company_users_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company_users" ADD CONSTRAINT "company_users_companyUserRoleId_fkey" FOREIGN KEY ("companyUserRoleId") REFERENCES "master_company_user_roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company_users" ADD CONSTRAINT "company_users_invitedById_fkey" FOREIGN KEY ("invitedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
