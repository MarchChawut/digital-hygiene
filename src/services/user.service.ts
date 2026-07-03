import "server-only";

import { prisma } from "@/lib/prisma";

// Update the user's division (the one-time gate after first sign-in).
export async function updateUserDivision(userId: string, division: string): Promise<void> {
  await prisma.user.update({ where: { id: userId }, data: { division } });
}
