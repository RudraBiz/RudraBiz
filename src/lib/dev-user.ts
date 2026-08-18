import { prisma } from "@/lib/prisma";

/**
 * TEMPORARY: returns the single seeded dev user.
 * Replace with real session lookup once auth is built.
 */
export async function getCurrentUser() {
  const user = await prisma.user.findUnique({
    where: { email: "dev@rudrabiz.local" },
  });

  if (!user) {
    throw new Error(
      "Dev user not found. Did the seed migration run? (dev@rudrabiz.local)"
    );
  }

  return user;
}
