-- Renames the NextAuth OAuth-account table out of the way of the
-- Chart of Accounts "accounts" table introduced in the next migration.
-- This table is not currently populated by anything (JWT session
-- strategy, no adapter configured), so this is a pure rename with no
-- data implications.

ALTER TABLE "accounts" RENAME TO "oauth_accounts";
