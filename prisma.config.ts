import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrate: {
    // Direct (non-pooled) connection — required for running migrations
    url: env("DIRECT_URL"),
  },
});
