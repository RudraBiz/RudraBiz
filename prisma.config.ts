import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    // Direct (non-pooled) connection — used by Migrate/CLI commands
    url: env("DIRECT_URL"),
  },
});
