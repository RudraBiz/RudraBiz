# Accounting App

Multi-company accounting application. Built incrementally.

## Current scope (this pass only)

- Next.js project scaffold (App Router, TypeScript, Tailwind)
- Prisma schema with:
  - `User` — global application users
  - `Company` — the business/workspace entity
  - `CompanyUser` — join table for multi-company access (one role per user per company)
  - Master tables: `CompanyType`, `Country`, `Currency`, `AccountingMethod`,
    `TaxFilingFrequency`, `CompanyStatus`, `CompanyUserRole`

**Not built yet:** auth, UI pages, CRUD logic, Chart of Accounts, invoices,
journal entries, or any other transactional ("File") tables. These come in
later passes.

## Setup

1. Copy `.env` and set `DATABASE_URL` to your actual Postgres connection
   string (Vercel Postgres, Neon, or Supabase).
2. Install dependencies:
   ```
   npm install
   ```
3. Generate the Prisma client:
   ```
   npm run db:generate
   ```
4. Run the first migration (creates tables in your database):
   ```
   npm run db:migrate
   ```
5. Master tables are intentionally left **empty** — populate them yourself
   (e.g. via Prisma Studio: `npm run db:studio`) or wait for a future seed
   script pass.
6. Start the dev server:
   ```
   npm run dev
   ```

## Deploying to Vercel

- Set `DATABASE_URL` as an environment variable in the Vercel project settings.
- Vercel will run `npm install`, which triggers `postinstall: prisma generate`
  automatically.
